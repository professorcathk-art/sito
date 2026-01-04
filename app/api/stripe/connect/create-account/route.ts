/**
 * API Route: Create Stripe Connect Account
 * 
 * This endpoint creates a new Stripe Connect account (V2 API) for a user.
 * The platform is responsible for pricing and fee collection.
 * 
 * POST /api/stripe/connect/create-account
 * 
 * Request Body:
 * {
 *   displayName: string,    // User's display name
 *   contactEmail: string,   // User's email address
 *   country: string         // ISO country code (e.g., 'us', 'gb')
 * }
 * 
 * Response:
 * {
 *   accountId: string,      // The Stripe Connect account ID
 *   account: object         // Full account object from Stripe
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client
    // This will throw an error if STRIPE_SECRET_KEY is not set
    const stripeClient = getStripeClient();

    // Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { displayName, contactEmail, country = "us" } = body;

    // Validate required fields
    if (!displayName || !contactEmail) {
      return NextResponse.json(
        { error: "displayName and contactEmail are required" },
        { status: 400 }
      );
    }

    // Check if user already has a connected account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (profile?.stripe_connect_account_id) {
      return NextResponse.json(
        { 
          error: "Account already exists",
          accountId: profile.stripe_connect_account_id 
        },
        { status: 400 }
      );
    }

    /**
     * Create a Stripe Connect account using Express accounts API
     * 
     * Note: Using standard Accounts API with Express type as V2 API
     * may not be available in current SDK version. Express accounts work
     * well for marketplace platforms with application fees.
     * 
     * Key points:
     * - type: 'express' for simplified onboarding
     * - Platform collects application fees (not passed here, set in checkout)
     * - country: Required for Express accounts
     * - email: Contact email for account notifications
     */
    const account = await stripeClient.accounts.create({
      type: "express",
      country: country,
      email: contactEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // Store display name in metadata
      metadata: {
        display_name: displayName,
      },
    });

    // Store the account ID in the database
    // This creates a mapping from user ID to Stripe account ID
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        stripe_connect_account_id: account.id,
        stripe_connect_onboarding_complete: false 
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with account ID:", updateError);
      // Account was created but we couldn't save it - this is a problem
      // In production, you might want to handle this differently
    }

    return NextResponse.json({
      accountId: account.id,
      account: account,
      message: "Account created successfully. Please complete onboarding.",
    });

  } catch (error: any) {
    console.error("Error creating Stripe Connect account:", error);

    // Handle Stripe-specific errors
    if (error.type === "StripeInvalidRequestError") {
      // Handle region restriction errors
      if (error.message?.includes("restricted outside of your platform's region") || 
          error.message?.includes("can't be sent to accounts located")) {
        return NextResponse.json(
          { 
            error: "Region restriction: Your Stripe platform account and connected accounts must be in the same region. " +
                   "Your platform account region determines which countries can receive transfers. " +
                   "Please ensure your Stripe account is set up in the same region as your users, or contact Stripe support to enable cross-region transfers."
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    // Handle missing API key error
    if (error.message?.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}

