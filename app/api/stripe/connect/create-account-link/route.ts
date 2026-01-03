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
    let { accountId, returnUrl } = body;

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

    // Get the base URL for redirect URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const refreshUrl = `${baseUrl}/dashboard/stripe-connect?refresh=true`;
    const finalReturnUrl = returnUrl || `${baseUrl}/dashboard/stripe-connect?accountId=${accountId}`;

    /**
     * Create an account link using V2 API
     * 
     * Account links are used to:
     * 1. Onboard new connected accounts (collect bank details, identity verification)
     * 2. Update account information (change bank details, update business info)
     * 
     * Key points:
     * - use_case.type: 'account_onboarding' for initial setup
     * - configurations: ['recipient'] matches our account configuration
     * - refresh_url: Where to redirect if link expires
     * - return_url: Where to redirect after successful onboarding
     */
    // Using type assertion for V2 API (TypeScript types may not be fully updated)
    const accountLink = await (stripeClient as any).v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          // Match the configuration type we used when creating the account
          configurations: ["recipient"],
          // URL to redirect to if the link expires (user needs to refresh)
          refresh_url: refreshUrl,
          // URL to redirect to after successful onboarding
          return_url: finalReturnUrl,
        },
      },
    });

    return NextResponse.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    });

  } catch (error: any) {
    console.error("Error creating account link:", error);

    if (error.message?.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create account link" },
      { status: 500 }
    );
  }
}

