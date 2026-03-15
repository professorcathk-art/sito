/**
 * API Route: Update appointment (approve, add meeting link, mark completed)
 * Used by the Manage Appointments dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/resend-booking-emails";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Appointment ID required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, meeting_link } = body;

    if (!action || !["approve", "add_meeting_link", "mark_completed"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: approve, add_meeting_link, mark_completed" },
        { status: 400 }
      );
    }

    // Fetch appointment and verify expert owns it
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("id, expert_id, user_id, start_time, end_time, status, meeting_link, product_id")
      .eq("id", id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.expert_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "approve") {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", id)
        .eq("expert_id", user.id);

      if (updateError) throw updateError;

      // Fetch user profile for email
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", appointment.user_id)
        .single();

      const userName = userProfile?.name || "there";
      const userEmail = userProfile?.email;

      if (userEmail) {
        const { data: expertProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        let productWhatToExpect: string | null = null;
        if (appointment.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("what_to_expect")
            .eq("id", appointment.product_id)
            .single();
          productWhatToExpect = product?.what_to_expect || null;
        }

        const startDate = new Date(appointment.start_time);
        const dateTime = !appointment.start_time || isNaN(startDate.getTime())
          ? "To be confirmed"
          : startDate.toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

        await sendBookingConfirmedEmail(
          userEmail,
          userName,
          expertProfile?.name || "Expert",
          dateTime,
          appointment.meeting_link || "To be provided",
          productWhatToExpect
        );
      }

      return NextResponse.json({ success: true, status: "confirmed" });
    }

    if (action === "add_meeting_link") {
      if (!meeting_link || typeof meeting_link !== "string") {
        return NextResponse.json(
          { error: "meeting_link is required" },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("appointments")
        .update({ meeting_link: meeting_link.trim() })
        .eq("id", id)
        .eq("expert_id", user.id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true });
    }

    if (action === "mark_completed") {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", id)
        .eq("expert_id", user.id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, status: "completed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Appointment update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update appointment" },
      { status: 500 }
    );
  }
}
