/**
 * Sync appointment_slots from product availability_rules (weekly schedule).
 * Regenerates future free slots for the product from rules minus busy bookings.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSlotsFromRules, parseAvailabilityRules } from "@/lib/appointment-availability";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = body.productId as string | undefined;
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, expert_id, price, product_type, availability_rules")
      .eq("id", productId)
      .eq("expert_id", user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.product_type !== "appointment") {
      return NextResponse.json({ error: "Not an appointment product" }, { status: 400 });
    }

    const rules = parseAvailabilityRules(product.availability_rules);
    const nowIso = new Date().toISOString();

    const { data: busyAppts } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("expert_id", user.id)
      .in("status", ["pending", "confirmed"])
      .gte("end_time", nowIso);

    const generated = generateSlotsFromRules(rules, {
      from: new Date(),
      busy: (busyAppts || []).map((a) => ({ start: a.start_time, end: a.end_time })),
    });

    if (generated.length === 0) {
      return NextResponse.json(
        {
          error:
            "No bookable slots generated. Check weekly hours (start/end times) and minimum notice settings.",
          created: 0,
          timezone: rules.timezone,
        },
        { status: 400 }
      );
    }

    // Only wipe free inventory after we know we can regenerate
    const { data: existingFree } = await supabase
      .from("appointment_slots")
      .select("id")
      .eq("expert_id", user.id)
      .eq("product_id", productId)
      .eq("is_available", true)
      .gte("start_time", nowIso);

    if (existingFree?.length) {
      await supabase
        .from("appointment_slots")
        .delete()
        .in(
          "id",
          existingFree.map((s) => s.id)
        );
    }

    await supabase
      .from("appointment_slots")
      .delete()
      .eq("expert_id", user.id)
      .is("product_id", null)
      .eq("is_available", true)
      .gte("start_time", nowIso);

    const rate = Number(product.price) || 0;
    const rows = generated.map((g) => ({
      expert_id: user.id,
      product_id: productId,
      start_time: g.start_time,
      end_time: g.end_time,
      rate_per_hour: rate,
      is_available: true,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error: insertError } = await supabase.from("appointment_slots").insert(chunk);
      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      created: rows.length,
      timezone: rules.timezone,
      durationMinutes: rules.durationMinutes,
    });
  } catch (error: unknown) {
    console.error("sync-slots error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync slots" },
      { status: 500 }
    );
  }
}
