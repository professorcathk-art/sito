/**
 * API Route: Verify Payment and Create Enrollment/Appointment
 * 
 * This endpoint is called from the success page to ensure enrollments/appointments
 * are created even if the webhook hasn't fired yet. This acts as a fallback mechanism.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBookingConfirmedEmail } from "@/lib/resend-booking-emails";
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

    console.log("Verify Payment - Session ID:", sessionId);
    console.log("Verify Payment - Payment Status:", session.payment_status);
    console.log("Verify Payment - Session Metadata:", JSON.stringify(session.metadata, null, 2));

    // Only process if payment was successful
    if (session.payment_status !== "paid") {
      console.log("Payment not completed. Status:", session.payment_status);
      return NextResponse.json({
        success: false,
        message: `Payment not completed. Status: ${session.payment_status}`,
        payment_status: session.payment_status,
      });
    }

    // Extract metadata
    const courseId = session.metadata?.course_id;
    let userId = session.metadata?.user_id;
    const guestEmail = session.metadata?.guest_email || (session.customer_details as any)?.email;
    const appointmentId = session.metadata?.appointment_id;
    const slotStartTime = session.metadata?.slot_start_time;
    const slotEndTime = session.metadata?.slot_end_time;
    const questionnaireResponseId = session.metadata?.questionnaire_response_id || null;
    const productId = session.metadata?.product_id || null;

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
    let finalUserId = userId || paymentIntentMetadata?.user_id || null;

    // Resolve guest: lookup user by email when userId is "guest"
    if ((!finalUserId || finalUserId === "guest") && guestEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", guestEmail)
        .maybeSingle();
      if (profile) finalUserId = profile.id;
    }
    const finalAppointmentId = appointmentId || paymentIntentMetadata?.appointment_id;
    const finalSlotStartTime = slotStartTime || paymentIntentMetadata?.slot_start_time;
    const finalSlotEndTime = slotEndTime || paymentIntentMetadata?.slot_end_time;
    const finalQuestionnaireResponseId = questionnaireResponseId || paymentIntentMetadata?.questionnaire_response_id || null;
    const finalProductId = productId || paymentIntentMetadata?.product_id || null;

    console.log("Verify Payment - Extracted Data:");
    console.log("  Course ID:", finalCourseId);
    console.log("  User ID:", finalUserId);
    console.log("  Appointment ID:", finalAppointmentId);
    console.log("  Slot Start:", finalSlotStartTime);
    console.log("  Slot End:", finalSlotEndTime);

    // Handle course enrollment (for guest with no account: create enrollment by email)
    if (finalCourseId) {
      if (!finalUserId || finalUserId === "guest") {
        // Guest paid - add course to account by email immediately
        const email = (guestEmail || (session.customer_details as any)?.email)?.trim()?.toLowerCase();
        if (!email) {
          return NextResponse.json({
            success: false,
            message: "Guest email not found in session",
          });
        }
        const { data: existingByEmail } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", finalCourseId)
          .eq("user_email", email)
          .maybeSingle();
        if (!existingByEmail) {
          const { error: enrollErr } = await supabase
            .from("course_enrollments")
            .insert({
              course_id: finalCourseId,
              user_email: email,
              user_id: null,
              payment_intent_id: paymentIntentId || null,
              questionnaire_response_id: finalQuestionnaireResponseId || null,
            });
          if (enrollErr) {
            console.error("Error creating enrollment by email:", enrollErr);
            return NextResponse.json({
              success: false,
              error: enrollErr.message,
            });
          }
        }
        return NextResponse.json({
          success: true,
          type: "course_guest",
          courseId: finalCourseId,
          needsSignUp: true,
          email,
        });
      }
    }

    // Handle course enrollment (logged-in or resolved guest)
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
          console.error("Enrollment error details:", JSON.stringify(enrollError, null, 2));
          return NextResponse.json({
            success: false,
            error: enrollError.message,
            details: enrollError,
          });
        }

        console.log(`✅ Enrollment created: ${newEnrollment?.id} for user ${finalUserId} in course ${finalCourseId}`);
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

    // Handle appointment booking (for guest with no account: create pending)
    if (finalAppointmentId && finalSlotStartTime && finalSlotEndTime) {
      if (!finalUserId || finalUserId === "guest") {
        const email = guestEmail || (session.customer_details as any)?.email;
        if (!email) {
          return NextResponse.json({
            success: false,
            message: "Guest email not found in session",
          });
        }
        const { data: slotData, error: slotErr } = await supabase
          .from("appointment_slots")
          .select("id, expert_id, rate_per_hour")
          .eq("id", finalAppointmentId)
          .single();
        if (slotErr || !slotData) {
          return NextResponse.json({ success: false, error: "Slot not found" });
        }
        const startDate = new Date(finalSlotStartTime);
        const endDate = new Date(finalSlotEndTime);
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        const totalAmount = (slotData.rate_per_hour / 60) * durationMinutes;
        const { data: pending, error: pendingErr } = await supabase
          .from("pending_appointments")
          .insert({
            appointment_slot_id: finalAppointmentId,
            expert_id: slotData.expert_id,
            email,
            slot_start_time: finalSlotStartTime,
            slot_end_time: finalSlotEndTime,
            duration_minutes: durationMinutes,
            rate_per_hour: slotData.rate_per_hour,
            total_amount: totalAmount,
            payment_intent_id: paymentIntentId || null,
            questionnaire_response_id: finalQuestionnaireResponseId || null,
            product_id: finalProductId || null,
          })
          .select("id")
          .single();
        if (pendingErr) {
          return NextResponse.json({ success: false, error: pendingErr.message });
        }
        await supabase.from("appointment_slots").update({ is_available: false }).eq("id", finalAppointmentId);
        return NextResponse.json({
          success: true,
          type: "appointment_guest",
          needsSignUp: true,
          email,
          pendingId: pending?.id,
        });
      }

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
            product_id: finalProductId || null,
            questionnaire_response_id: finalQuestionnaireResponseId || null,
          })
          .select()
          .single();

        if (appointmentError) {
          console.error("Error creating appointment from success page:", appointmentError);
          console.error("Appointment error details:", JSON.stringify(appointmentError, null, 2));
          return NextResponse.json({
            success: false,
            error: appointmentError.message,
            details: appointmentError,
          });
        }

        // Mark slot as unavailable
        await supabase
          .from("appointment_slots")
          .update({ is_available: false })
          .eq("id", finalAppointmentId);

        // Link questionnaire response to appointment if present
        if (finalQuestionnaireResponseId && appointment?.id) {
          await supabase
            .from("questionnaire_responses")
            .update({ appointment_id: appointment.id })
            .eq("id", finalQuestionnaireResponseId);
        }

        // Send confirmation email for paid booking
        try {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", finalUserId)
            .single();
          const { data: expertProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", slotData.expert_id)
            .single();
          let whatToExpect: string | null = null;
          if (finalProductId) {
            const { data: product } = await supabase
              .from("products")
              .select("what_to_expect")
              .eq("id", finalProductId)
              .single();
            whatToExpect = product?.what_to_expect || null;
          }
          const dateTime = new Date(finalSlotStartTime).toLocaleString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
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
        } catch (emailErr) {
          console.warn("Failed to send booking confirmation email:", emailErr);
        }

        console.log(`✅ Appointment created: ${appointment?.id} for user ${finalUserId}`);
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
