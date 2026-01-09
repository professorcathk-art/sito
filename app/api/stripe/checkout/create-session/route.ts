/**
 * API Route: Create Checkout Session
 * 
 * This endpoint creates a Stripe Checkout session for purchasing a product.
 * Uses Destination Charge with application fee to monetize transactions.
 * 
 * POST /api/stripe/checkout/create-session
 * 
 * Request Body:
 * {
 *   priceId: string,           // Stripe Price ID
 *   quantity: number,           // Quantity to purchase (default: 1)
 *   connectedAccountId: string, // Connected account to transfer funds to
 *   applicationFeePercent: number // Platform fee percentage (default: 20)
 * }
 * 
 * Response:
 * {
 *   sessionId: string,
 *   url: string                // Checkout URL to redirect user to
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get authenticated user (optional - you might allow guest checkout)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();
    const {
      priceId,
      priceData, // For dynamic pricing (appointments)
      quantity = 1,
      connectedAccountId,
      applicationFeePercent = 20, // Default 20% platform fee
      courseId,
      appointmentId, // Can be camelCase from frontend
      slotStartTime, // Can be camelCase from frontend
      slotEndTime, // Can be camelCase from frontend
      questionnaireResponseId, // Can be camelCase from frontend
    } = body;

    // Validate required fields
    if ((!priceId && !priceData) || !connectedAccountId) {
      return NextResponse.json(
        { error: "Either priceId or priceData, and connectedAccountId are required" },
        { status: 400 }
      );
    }

    // Calculate total amount
    let totalAmount: number;
    if (priceData) {
      // Dynamic pricing (for appointments with variable duration)
      totalAmount = (priceData.unit_amount || 0) * quantity;
    } else {
      // Fixed pricing (for courses)
      const price = await stripeClient.prices.retrieve(priceId);
      const unitAmount = price.unit_amount || 0;
      totalAmount = unitAmount * quantity;
    }

    // Calculate application fee amount (platform's cut)
    // Fee is calculated as a percentage of the total amount
    const applicationFeeAmount = Math.round(
      (totalAmount * applicationFeePercent) / 100
    );

    // Get base URL for success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    /**
     * Create a Checkout Session with Destination Charge
     * 
     * Destination Charge means:
     * - Customer pays the full amount
     * - Platform collects application fee
     * - Remaining amount is transferred to connected account
     * 
     * Key points:
     * - payment_intent_data.transfer_data.destination: Where to send funds
     * - payment_intent_data.application_fee_amount: Platform's fee
     * - mode: 'payment' for one-time payments
     * - success_url: Where to redirect after successful payment
     * - cancel_url: Where to redirect if user cancels
     */
    // Build line items
    const lineItems: any[] = [];
    if (priceData) {
      // Dynamic pricing for appointments
      lineItems.push({
        price_data: priceData,
        quantity: quantity,
      });
    } else {
      // Fixed pricing for courses
      lineItems.push({
        price: priceId,
        quantity: quantity,
      });
    }

    const session = await stripeClient.checkout.sessions.create({
      // Line items for the checkout
      line_items: lineItems,

      // Payment intent configuration
      payment_intent_data: {
        // Platform's fee (in cents)
        application_fee_amount: applicationFeeAmount,

        // Transfer configuration
        transfer_data: {
          // Destination: Connected account to receive funds
          destination: connectedAccountId,
        },

        // Store metadata for tracking and enrollment (in payment intent)
        metadata: {
          connected_account_id: connectedAccountId,
          application_fee_percent: applicationFeePercent.toString(),
          user_id: user?.id || "guest",
          course_id: courseId || "",
          appointment_id: appointmentId || "",
          slot_start_time: slotStartTime || "",
          slot_end_time: slotEndTime || "",
          questionnaire_response_id: questionnaireResponseId || "",
        },
      },

      // Store metadata at session level too (for webhook access)
      metadata: {
        connected_account_id: connectedAccountId,
        application_fee_percent: applicationFeePercent.toString(),
        user_id: user?.id || "guest",
        course_id: courseId || "",
        appointment_id: appointmentId || "",
        slot_start_time: slotStartTime || "",
        slot_end_time: slotEndTime || "",
        questionnaire_response_id: questionnaireResponseId || "",
      },

      // Payment mode (one-time payment)
      mode: "payment",

      // Success URL - redirect here after successful payment
      success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,

      // Cancel URL - redirect here if user cancels
      cancel_url: `${baseUrl}/stripe/cancel`,

      // Customer email (if user is logged in)
      customer_email: user?.email || undefined,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error("Error creating checkout session:", error);

    if (error.type === "StripeInvalidRequestError") {
      // Handle region restriction errors
      if (error.message?.includes("restricted outside of your platform's region") || 
          error.message?.includes("can't be sent to accounts located")) {
        return NextResponse.json(
          { 
            error: "Region restriction: Your Stripe platform account and connected account must be in the same region. " +
                   "Please contact support or configure your Stripe account to allow cross-region transfers. " +
                   "Error details: " + error.message
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    if (error.message?.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

