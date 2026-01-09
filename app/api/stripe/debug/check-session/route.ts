/**
 * Debug API: Check Checkout Session Details
 * 
 * This endpoint helps debug why purchases aren't showing up.
 * Use this to verify session metadata and payment status.
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

    // Retrieve checkout session with full details
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    // Get payment intent metadata
    let paymentIntentMetadata: Record<string, string> = {};
    if (session.payment_intent) {
      const paymentIntentId = typeof session.payment_intent === "string" 
        ? session.payment_intent 
        : session.payment_intent?.id;
      
      if (paymentIntentId) {
        try {
          const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
          paymentIntentMetadata = paymentIntent.metadata || {};
        } catch (err) {
          console.error("Error retrieving payment intent:", err);
        }
      }
    }

    return NextResponse.json({
      session_id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_email,
      session_metadata: session.metadata || {},
      payment_intent_metadata: paymentIntentMetadata,
      payment_intent_id: typeof session.payment_intent === "string" 
        ? session.payment_intent 
        : session.payment_intent?.id,
      created: new Date(session.created * 1000).toISOString(),
      // Extracted values
      course_id: session.metadata?.course_id || paymentIntentMetadata?.course_id || null,
      appointment_id: session.metadata?.appointment_id || paymentIntentMetadata?.appointment_id || null,
      user_id: session.metadata?.user_id || paymentIntentMetadata?.user_id || null,
      slot_start_time: session.metadata?.slot_start_time || paymentIntentMetadata?.slot_start_time || null,
      slot_end_time: session.metadata?.slot_end_time || paymentIntentMetadata?.slot_end_time || null,
    });
  } catch (error: any) {
    console.error("Error checking session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check session" },
      { status: 500 }
    );
  }
}
