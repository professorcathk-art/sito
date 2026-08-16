/**
 * Return available appointment slots for an expert (storefront booking calendar).
 * If rules exist but free slots are missing, regenerate via service role so public booking works.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateSlotsFromRules, parseAvailabilityRules } from "@/lib/appointment-availability";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get("expertId");
    const productIdParam = searchParams.get("productId");
    if (!expertId) {
      return NextResponse.json({ error: "expertId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    let productQuery = supabase
      .from("products")
      .select("id, name, price, pricing_type, availability_rules, meeting_location, product_type")
      .eq("expert_id", expertId)
      .eq("product_type", "appointment")
      .order("created_at", { ascending: false })
      .limit(1);

    if (productIdParam) {
      productQuery = supabase
        .from("products")
        .select("id, name, price, pricing_type, availability_rules, meeting_location, product_type")
        .eq("expert_id", expertId)
        .eq("product_type", "appointment")
        .eq("id", productIdParam)
        .limit(1);
    }

    const { data: products } = await productQuery;
    const product = products?.[0] || null;
    const productId = product?.id || productIdParam || null;

    let slotsQuery = supabase
      .from("appointment_slots")
      .select("id, start_time, end_time, rate_per_hour, product_id, is_available")
      .eq("expert_id", expertId)
      .eq("is_available", true)
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(200);

    if (productId) {
      slotsQuery = slotsQuery.or(`product_id.eq.${productId},product_id.is.null`);
    }

    const { data: existingSlots } = await slotsQuery;
    let slots = existingSlots || [];

    let timezone: string | null = null;
    if (product?.availability_rules) {
      const rules = parseAvailabilityRules(product.availability_rules);
      timezone = rules.timezone;
      const minStart = Date.now() + rules.minNoticeHours * 60 * 60 * 1000;
      slots = slots.filter((s) => new Date(s.start_time).getTime() >= minStart);

      // Public + expert: if inventory empty but weekly rules exist, regenerate slots
      if (slots.length === 0 && productId) {
        const { data: busyAppts } = await supabase
          .from("appointments")
          .select("start_time, end_time")
          .eq("expert_id", expertId)
          .in("status", ["pending", "confirmed"])
          .gte("end_time", nowIso);

        const generated = generateSlotsFromRules(rules, {
          from: new Date(),
          busy: (busyAppts || []).map((a) => ({ start: a.start_time, end: a.end_time })),
        });

        if (generated.length > 0) {
          const admin = createServiceRoleClient();
          const rate = Number(product.price) || 0;
          const toInsert = generated.slice(0, 120).map((g) => ({
            expert_id: expertId,
            product_id: productId,
            start_time: g.start_time,
            end_time: g.end_time,
            rate_per_hour: rate,
            is_available: true,
          }));

          // Clear stale free slots for this product before insert
          const { data: stale } = await admin
            .from("appointment_slots")
            .select("id")
            .eq("expert_id", expertId)
            .eq("product_id", productId)
            .eq("is_available", true)
            .gte("start_time", nowIso);
          if (stale?.length) {
            await admin.from("appointment_slots").delete().in(
              "id",
              stale.map((s) => s.id)
            );
          }

          await admin.from("appointment_slots").insert(toInsert);

          const { data: refreshed } = await supabase
            .from("appointment_slots")
            .select("id, start_time, end_time, rate_per_hour, product_id, is_available")
            .eq("expert_id", expertId)
            .eq("is_available", true)
            .gte("start_time", nowIso)
            .or(`product_id.eq.${productId},product_id.is.null`)
            .order("start_time", { ascending: true })
            .limit(200);
          slots = (refreshed || []).filter((s) => new Date(s.start_time).getTime() >= minStart);
        }
      }
    }

    return NextResponse.json({
      slots,
      product: product
        ? {
            id: product.id,
            name: product.name,
            price: product.price,
            pricing_type: product.pricing_type,
            meeting_location: product.meeting_location,
          }
        : null,
      timezone,
    });
  } catch (error: unknown) {
    console.error("available-slots error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load slots" },
      { status: 500 }
    );
  }
}
