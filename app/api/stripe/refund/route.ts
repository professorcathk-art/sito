/**
 * API Route: Process Refund
 * 
 * This endpoint processes refunds for course enrollments and appointments.
 * Only experts (for their own products) or platform admins can process refunds.
 * 
 * POST /api/stripe/refund
 * 
 * Request Body:
 * {
 *   type: "course" | "appointment",
 *   id: string, // enrollment_id or appointment_id
 *   amount?: number, // Optional: partial refund amount in cents. If not provided, full refund.
 *   reason?: string // Optional: reason for refund
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const stripeClient = getStripeClient();
    const supabase = createServiceRoleClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, id, amount, reason } = body;

    // Validate required fields
    if (!type || !id) {
      return NextResponse.json(
        { error: "type and id are required" },
        { status: 400 }
      );
    }

    if (type !== "course" && type !== "appointment") {
      return NextResponse.json(
        { error: "type must be 'course' or 'appointment'" },
        { status: 400 }
      );
    }

    let paymentIntentId: string | null = null;
    let expertId: string | null = null;
    let currentRefundStatus: string | null = null;
    let originalAmount: number | null = null;

    // Fetch the enrollment or appointment
    if (type === "course") {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select(`
          id,
          course_id,
          payment_intent_id,
          refund_status,
          courses!inner(expert_id, price)
        `)
        .eq("id", id)
        .single();

      if (enrollmentError || !enrollment) {
        return NextResponse.json(
          { error: "Enrollment not found" },
          { status: 404 }
        );
      }

      paymentIntentId = enrollment.payment_intent_id;
      expertId = (enrollment.courses as any).expert_id;
      currentRefundStatus = enrollment.refund_status;
      originalAmount = (enrollment.courses as any).price ? Math.round((enrollment.courses as any).price * 100) : null;

      // Check if already refunded
      if (currentRefundStatus === "refunded") {
        return NextResponse.json(
          { error: "This enrollment has already been refunded" },
          { status: 400 }
        );
      }

      // Check authorization: user must be the expert who created the course
      if (expertId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized. You can only refund your own courses." },
          { status: 403 }
        );
      }
    } else {
      // type === "appointment"
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select("id, expert_id, payment_intent_id, refund_status, total_amount")
        .eq("id", id)
        .single();

      if (appointmentError || !appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }

      paymentIntentId = appointment.payment_intent_id;
      expertId = appointment.expert_id;
      currentRefundStatus = appointment.refund_status;
      originalAmount = appointment.total_amount ? Math.round(appointment.total_amount * 100) : null;

      // Check if already refunded
      if (currentRefundStatus === "refunded") {
        return NextResponse.json(
          { error: "This appointment has already been refunded" },
          { status: 400 }
        );
      }

      // Check authorization: user must be the expert
      if (expertId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized. You can only refund your own appointments." },
          { status: 403 }
        );
      }
    }

    // Check if payment intent exists
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent found. This may be a free enrollment/appointment." },
        { status: 400 }
      );
    }

    // Determine refund amount
    const refundAmount = amount ? Math.round(amount) : originalAmount; // amount is in cents
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid refund amount" },
        { status: 400 }
      );
    }

    if (refundAmount > (originalAmount || 0)) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed original payment amount" },
        { status: 400 }
      );
    }

    // Update status to "processing"
    if (type === "course") {
      await supabase
        .from("course_enrollments")
        .update({
          refund_status: "processing",
          refund_reason: reason || null,
        })
        .eq("id", id);
    } else {
      await supabase
        .from("appointments")
        .update({
          refund_status: "processing",
          refund_reason: reason || null,
        })
        .eq("id", id);
    }

    // Retrieve payment intent to get the charge ID
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge !== "string") {
      return NextResponse.json(
        { error: "Payment intent does not have a charge yet" },
        { status: 400 }
      );
    }

    // Create refund in Stripe
    const refundParams: Stripe.RefundCreateParams = {
      charge: paymentIntent.latest_charge,
      amount: refundAmount,
      metadata: {
        type,
        enrollment_or_appointment_id: id,
        expert_id: expertId || "",
        reason: reason || "",
      },
      // Note: We store metadata in payment intent, not refund, so webhook can find it
    };

    const refund = await stripeClient.refunds.create(refundParams);

    // Update database with refund information
    const refundAmountDecimal = refundAmount / 100; // Convert from cents to decimal

    if (type === "course") {
      await supabase
        .from("course_enrollments")
        .update({
          refund_status: refund.status === "succeeded" ? "refunded" : "failed",
          refund_id: refund.id,
          refunded_at: refund.status === "succeeded" ? new Date().toISOString() : null,
          refund_amount: refund.status === "succeeded" ? refundAmountDecimal : null,
        })
        .eq("id", id);
    } else {
      await supabase
        .from("appointments")
        .update({
          refund_status: refund.status === "succeeded" ? "refunded" : "failed",
          refund_id: refund.id,
          refunded_at: refund.status === "succeeded" ? new Date().toISOString() : null,
          refund_amount: refund.status === "succeeded" ? refundAmountDecimal : null,
        })
        .eq("id", id);
    }

    // If refund succeeded, update enrollment/appointment status
    if (refund.status === "succeeded") {
      if (type === "course") {
        // Optionally remove enrollment or mark as cancelled
        // For now, we'll keep the enrollment but mark it as refunded
        // You can add logic to remove access if needed
      } else {
        // Update appointment status to cancelled
        await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", id);
      }
    }

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.status,
        amount: refundAmountDecimal,
        currency: refund.currency,
      },
      message: refund.status === "succeeded" 
        ? "Refund processed successfully" 
        : "Refund is being processed",
    });

  } catch (error: any) {
    console.error("Error processing refund:", error);

    // Try to update status to failed
    try {
      const supabase = createServiceRoleClient();
      const body = await request.json();
      const { type, id } = body;

      if (type === "course") {
        await supabase
          .from("course_enrollments")
          .update({ refund_status: "failed" })
          .eq("id", id);
      } else {
        await supabase
          .from("appointments")
          .update({ refund_status: "failed" })
          .eq("id", id);
      }
    } catch (updateError) {
      console.error("Error updating refund status:", updateError);
    }

    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
