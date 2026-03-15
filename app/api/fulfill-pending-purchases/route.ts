/**
 * Fulfill pending course enrollments and appointments for a user who just signed up.
 * Called after registration when user came from guest checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/resend-booking-emails";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "Must be logged in" },
        { status: 401 }
      );
    }

    const admin = createServiceRoleClient();
    const email = user.email;
    const fulfilled: { courses: string[]; appointments: string[] } = { courses: [], appointments: [] };

    // Fulfill pending course enrollments
    const { data: pendingCourses } = await admin
      .from("pending_course_enrollments")
      .select("id, course_id, questionnaire_response_id, payment_intent_id")
      .eq("email", email);

    if (pendingCourses?.length) {
      for (const p of pendingCourses) {
        const { error } = await admin.from("course_enrollments").insert({
          course_id: p.course_id,
          user_id: user.id,
          payment_intent_id: p.payment_intent_id || null,
          questionnaire_response_id: p.questionnaire_response_id || null,
        });
        if (!error) {
          fulfilled.courses.push(p.course_id);
          await admin.from("pending_course_enrollments").delete().eq("id", p.id);
        }
      }
    }

    // Fulfill pending appointments
    const { data: pendingAppts } = await admin
      .from("pending_appointments")
      .select("*")
      .eq("email", email);

    if (pendingAppts?.length) {
      for (const p of pendingAppts) {
        const { data: appointment, error } = await admin
          .from("appointments")
          .insert({
            expert_id: p.expert_id,
            user_id: user.id,
            appointment_slot_id: p.appointment_slot_id,
            start_time: p.slot_start_time,
            end_time: p.slot_end_time,
            duration_minutes: p.duration_minutes,
            rate_per_hour: p.rate_per_hour,
            total_amount: p.total_amount,
            status: "confirmed",
            payment_intent_id: p.payment_intent_id || null,
            product_id: p.product_id || null,
            questionnaire_response_id: p.questionnaire_response_id || null,
          })
          .select("id")
          .single();

        if (!error && appointment) {
          fulfilled.appointments.push(appointment.id);
          await admin.from("appointment_slots").update({ is_available: false }).eq("id", p.appointment_slot_id);
          if (p.questionnaire_response_id) {
            await admin.from("questionnaire_responses").update({ appointment_id: appointment.id }).eq("id", p.questionnaire_response_id);
          }
          try {
            const { data: userProfile } = await admin.from("profiles").select("name, email").eq("id", user.id).single();
            const { data: expertProfile } = await admin.from("profiles").select("name").eq("id", p.expert_id).single();
            let whatToExpect: string | null = null;
            if (p.product_id) {
              const { data: product } = await admin.from("products").select("what_to_expect").eq("id", p.product_id).single();
              whatToExpect = product?.what_to_expect || null;
            }
            const dateTime = new Date(p.slot_start_time).toLocaleString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit",
            });
            if (userProfile?.email) {
              await sendBookingConfirmedEmail(
                userProfile.email,
                userProfile.name || "there",
                expertProfile?.name || "Expert",
                dateTime,
                "To be provided",
                whatToExpect
              );
            }
          } catch (e) {
            console.warn("Booking confirmation email failed:", e);
          }
          await admin.from("pending_appointments").delete().eq("id", p.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      fulfilled,
    });
  } catch (err: any) {
    console.error("Fulfill pending purchases error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fulfill" },
      { status: 500 }
    );
  }
}
