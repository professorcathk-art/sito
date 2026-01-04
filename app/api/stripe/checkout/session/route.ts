/**
 * API Route: Get Checkout Session Details
 * 
 * This endpoint retrieves checkout session details including course_id from metadata.
 * Used by the success page to redirect users to their enrolled course.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  try {
    const stripeClient = getStripeClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    // Extract course_id and appointment_id from metadata
    const courseId = session.metadata?.course_id || null;
    const appointmentId = session.metadata?.appointment_id || null;

    return NextResponse.json({
      session_id: session.id,
      course_id: courseId,
      appointment_id: appointmentId,
      payment_status: session.payment_status,
    });
  } catch (error: any) {
    console.error("Error retrieving checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

