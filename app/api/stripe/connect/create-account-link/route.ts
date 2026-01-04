/**
 * API Route: Create Account Link for Onboarding
 * 
 * This endpoint creates an account link that redirects users to Stripe's onboarding flow.
 * Users complete their account setup (bank details, identity verification, etc.) on Stripe's hosted pages.
 * 
 * POST /api/stripe/connect/create-account-link
 * 
 * Request Body:
 * {
 *   accountId: string,      // Optional: Stripe Connect account ID (if not provided, fetches from user's profile)
 *   returnUrl: string       // URL to redirect to after onboarding (defaults to /dashboard)
 * }
 * 
 * Response:
 * {
 *   url: string            // The account link URL to redirect the user to
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let accountId: string | undefined;
  
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get authenticated user
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
    accountId = body.accountId;
    const returnUrl = body.returnUrl;

    // If accountId not provided, fetch from user's profile
    if (!accountId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.stripe_connect_account_id) {
        return NextResponse.json(
          { error: "No Stripe Connect account found. Please create an account first." },
          { status: 400 }
        );
      }

      accountId = profile.stripe_connect_account_id;
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the base URL for redirect URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const refreshUrl = `${baseUrl}/dashboard/stripe-connect?refresh=true`;
    const finalReturnUrl = returnUrl || `${baseUrl}/dashboard/stripe-connect?accountId=${accountId}`;

    /**
     * Create an account link for Express account onboarding
     * 
     * Account links are used to:
     * 1. Onboard new connected accounts (collect bank details, identity verification)
     * 2. Update account information (change bank details, update business info)
     * 
     * Key points:
     * - type: 'account_onboarding' for initial setup
     * - refresh_url: Where to redirect if link expires
     * - return_url: Where to redirect after successful onboarding
     */
    const accountLink = await stripeClient.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: finalReturnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    });

  } catch (error: any) {
    console.error("Error creating account link:", error);
    console.error("Error details:", {
      type: error.type,
      code: error.code,
      message: error.message,
      accountId: accountId,
    });

    // Handle Stripe-specific errors
    if (error.type === "StripeInvalidRequestError") {
      // Provide detailed error message
      let errorMessage = error.message || "Failed to create account link";
      
      // Handle common errors with helpful messages
      if (error.message?.includes("No such account")) {
        errorMessage = "Stripe account not found. Please create a new account.";
      } else if (error.message?.includes("account must be")) {
        errorMessage = `Invalid account type: ${error.message}`;
      } else if (error.message?.includes("region") || error.message?.includes("country")) {
        errorMessage = `Region error: ${error.message}. Please ensure your platform account supports accounts in this region.`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error.message,
          code: error.code,
        },
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
      { 
        error: "Failed to create account link",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

