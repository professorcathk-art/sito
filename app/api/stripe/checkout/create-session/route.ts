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
      quantity = 1,
      connectedAccountId,
      applicationFeePercent = 20, // Default 20% platform fee
    } = body;

    // Validate required fields
    if (!priceId || !connectedAccountId) {
      return NextResponse.json(
        { error: "priceId and connectedAccountId are required" },
        { status: 400 }
      );
    }

    // Get the price to calculate application fee
    const price = await stripeClient.prices.retrieve(priceId);
    const unitAmount = price.unit_amount || 0;
    const totalAmount = unitAmount * quantity;

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
    const session = await stripeClient.checkout.sessions.create({
      // Line items for the checkout
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],

      // Payment intent configuration
      payment_intent_data: {
        // Platform's fee (in cents)
        application_fee_amount: applicationFeeAmount,

        // Transfer configuration
        transfer_data: {
          // Destination: Connected account to receive funds
          destination: connectedAccountId,
        },

        // Store metadata for tracking
        metadata: {
          connected_account_id: connectedAccountId,
          application_fee_percent: applicationFeePercent.toString(),
          user_id: user?.id || "guest",
        },
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

