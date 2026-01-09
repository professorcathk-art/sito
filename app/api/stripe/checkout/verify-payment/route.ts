/**
 * API Route: Verify Payment and Create Enrollment/Appointment
 * 
 * This endpoint is called from the success page to ensure enrollments/appointments
 * are created even if the webhook hasn't fired yet. This acts as a fallback mechanism.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const stripeClient = getStripeClient();
    const supabase = createServiceRoleClient();
    
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Retrieve checkout session
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    // Only process if payment was successful
    if (session.payment_status !== "paid") {
      return NextResponse.json({
        success: false,
        message: "Payment not completed",
      });
    }

    // Extract metadata
    const courseId = session.metadata?.course_id;
    const userId = session.metadata?.user_id;
    const appointmentId = session.metadata?.appointment_id;
    const slotStartTime = session.metadata?.slot_start_time;
    const slotEndTime = session.metadata?.slot_end_time;
    const questionnaireResponseId = session.metadata?.questionnaire_response_id || null;

    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : session.payment_intent?.id;

    // Get payment intent metadata if available
    let paymentIntentMetadata: Record<string, string> = {};
    if (paymentIntentId && typeof paymentIntentId === "string") {
      try {
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
        paymentIntentMetadata = paymentIntent.metadata || {};
      } catch (err) {
        console.error("Error retrieving payment intent:", err);
      }
    }

    // Use payment intent metadata as fallback
    const finalCourseId = courseId || paymentIntentMetadata?.course_id;
    const finalUserId = userId || paymentIntentMetadata?.user_id || null;
    const finalAppointmentId = appointmentId || paymentIntentMetadata?.appointment_id;
    const finalSlotStartTime = slotStartTime || paymentIntentMetadata?.slot_start_time;
    const finalSlotEndTime = slotEndTime || paymentIntentMetadata?.slot_end_time;
    const finalQuestionnaireResponseId = questionnaireResponseId || paymentIntentMetadata?.questionnaire_response_id || null;

    if (!finalUserId || finalUserId === "guest") {
      return NextResponse.json({
        success: false,
        message: "User ID not found in session",
      });
    }

    // Handle course enrollment
    if (finalCourseId) {
      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", finalCourseId)
        .eq("user_id", finalUserId)
        .maybeSingle();

      if (!existingEnrollment) {
        // Create enrollment
        const { data: newEnrollment, error: enrollError } = await supabase
          .from("course_enrollments")
          .insert({
            course_id: finalCourseId,
            user_id: finalUserId,
            payment_intent_id: paymentIntentId || null,
            questionnaire_response_id: finalQuestionnaireResponseId || null,
          })
          .select()
          .single();

        if (enrollError) {
          console.error("Error creating enrollment from success page:", enrollError);
          return NextResponse.json({
            success: false,
            error: enrollError.message,
          });
        }

        return NextResponse.json({
          success: true,
          type: "course",
          courseId: finalCourseId,
          enrollmentId: newEnrollment?.id,
        });
      } else {
        return NextResponse.json({
          success: true,
          type: "course",
          courseId: finalCourseId,
          enrollmentId: existingEnrollment.id,
          message: "Enrollment already exists",
        });
      }
    }

    // Handle appointment booking
    if (finalAppointmentId && finalSlotStartTime && finalSlotEndTime) {
      // Check if appointment already exists
      const { data: existingAppointment } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_slot_id", finalAppointmentId)
        .eq("user_id", finalUserId)
        .maybeSingle();

      if (!existingAppointment) {
        // Fetch slot details
        const { data: slotData, error: slotError } = await supabase
          .from("appointment_slots")
          .select("id, expert_id, rate_per_hour, is_available")
          .eq("id", finalAppointmentId)
          .single();

        if (slotError || !slotData) {
          console.error("Error fetching appointment slot:", slotError);
          return NextResponse.json({
            success: false,
            error: "Appointment slot not found",
          });
        }

        if (!slotData.is_available) {
          return NextResponse.json({
            success: false,
            error: "Appointment slot is already booked",
          });
        }

        // Calculate duration and total amount
        const startDate = new Date(finalSlotStartTime);
        const endDate = new Date(finalSlotEndTime);
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        const totalAmount = (slotData.rate_per_hour / 60) * durationMinutes;

        // Create appointment
        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            expert_id: slotData.expert_id,
            user_id: finalUserId,
            appointment_slot_id: finalAppointmentId,
            start_time: finalSlotStartTime,
            end_time: finalSlotEndTime,
            duration_minutes: durationMinutes,
            rate_per_hour: slotData.rate_per_hour,
            total_amount: totalAmount,
            status: "confirmed",
            payment_intent_id: paymentIntentId || null,
          })
          .select()
          .single();

        if (appointmentError) {
          console.error("Error creating appointment from success page:", appointmentError);
          return NextResponse.json({
            success: false,
            error: appointmentError.message,
          });
        }

        // Mark slot as unavailable
        await supabase
          .from("appointment_slots")
          .update({ is_available: false })
          .eq("id", finalAppointmentId);

        return NextResponse.json({
          success: true,
          type: "appointment",
          appointmentId: appointment?.id,
        });
      } else {
        return NextResponse.json({
          success: true,
          type: "appointment",
          appointmentId: existingAppointment.id,
          message: "Appointment already exists",
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: "No course_id or appointment_id found in session",
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
