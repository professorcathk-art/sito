/**
 * API Route: Get Account Status
 * 
 * This endpoint retrieves the current status of a Stripe Connect account.
 * It checks if the account is ready to receive payments and if onboarding is complete.
 * 
 * GET /api/stripe/connect/account-status?accountId=acct_xxx
 * 
 * Query Parameters:
 * - accountId: string (optional) - If not provided, fetches from user's profile
 * 
 * Response:
 * {
 *   accountId: string,
 *   readyToReceivePayments: boolean,
 *   onboardingComplete: boolean,
 *   requirementsStatus: string,
 *   account: object
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    // Get accountId from query params or user's profile
    const { searchParams } = new URL(request.url);
    let accountId = searchParams.get("accountId");

    if (!accountId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.stripe_connect_account_id) {
        return NextResponse.json(
          { error: "No Stripe Connect account found" },
          { status: 404 }
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

    /**
     * Retrieve the account with full details
     * 
     * For Express accounts, we check:
     * - capabilities: To see if transfers are enabled
     * - charges_enabled: Whether account can receive payments
     * - details_submitted: Whether onboarding is complete
     */
    let account;
    try {
      account = await stripeClient.accounts.retrieve(accountId);
    } catch (stripeError: any) {
      // Handle case where account doesn't exist (e.g., test account with live keys)
      if (stripeError.type === "StripeInvalidRequestError" && 
          (stripeError.code === "resource_missing" || stripeError.message?.includes("No such account"))) {
        console.error(`Account ${accountId} not found in Stripe. This might be a test account used with live keys.`);
        
        // Clear the invalid account ID from database
        await supabase
          .from("profiles")
          .update({
            stripe_connect_account_id: null,
            stripe_connect_onboarding_complete: false,
          })
          .eq("stripe_connect_account_id", accountId);
        
        return NextResponse.json(
          { 
            error: "Account not found. This might be a test account. Please create a new account.",
            accountNotFound: true,
            cleared: true
          },
          { status: 404 }
        );
      }
      throw stripeError;
    }

    /**
     * Check if account is ready to receive payments
     * 
     * For Express accounts:
     * - charges_enabled: true means account can receive payments
     * - transfers_enabled: true means we can transfer funds to this account
     */
    const readyToReceivePayments =
      account.charges_enabled === true && account.details_submitted === true;

    /**
     * Check onboarding completion status
     * 
     * For Express accounts:
     * - details_submitted: true means onboarding is complete
     * - If false, user still needs to complete onboarding
     */
    const onboardingComplete = account.details_submitted === true;
    
    // Get requirements status if available
    const requirementsStatus = 
      account.requirements?.currently_due && account.requirements.currently_due.length > 0
        ? "currently_due"
        : account.requirements?.past_due && account.requirements.past_due.length > 0
        ? "past_due"
        : "complete";

    return NextResponse.json({
      accountId: account.id,
      readyToReceivePayments,
      onboardingComplete,
      requirementsStatus: requirementsStatus,
      account: {
        id: account.id,
        display_name: account.metadata?.display_name || account.email || "Account",
        type: account.type,
        charges_enabled: account.charges_enabled,
        transfers_enabled: account.capabilities?.transfers === "active",
        details_submitted: account.details_submitted,
      },
    });

  } catch (error: any) {
    console.error("Error fetching account status:", error);

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
      { error: "Failed to fetch account status" },
      { status: 500 }
    );
  }
}

