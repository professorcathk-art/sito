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

    /**
     * Retrieve the account with full details
     * 
     * We include:
     * - configuration.recipient: To check transfer capabilities
     * - requirements: To check onboarding status
     * 
     * Note: Using type assertion for V2 API as TypeScript types may not be fully updated
     */
    const account = await (stripeClient as any).v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "requirements"],
    });

    /**
     * Check if account is ready to receive payments
     * 
     * The account can receive payments when:
     * - stripe_transfers capability status is "active"
     * This means Stripe can transfer funds to this account
     */
    const readyToReceivePayments =
      account?.configuration?.recipient?.capabilities?.stripe_balance
        ?.stripe_transfers?.status === "active";

    /**
     * Check onboarding completion status
     * 
     * Onboarding is complete when:
     * - requirements.summary.minimum_deadline.status is NOT "currently_due" or "past_due"
     * 
     * Status values:
     * - "currently_due": User needs to provide information
     * - "past_due": User missed a deadline
     * - "pending_verification": Information provided, awaiting verification
     * - null/undefined: No requirements outstanding
     */
    const requirementsStatus =
      account.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete =
      requirementsStatus !== "currently_due" &&
      requirementsStatus !== "past_due";

    return NextResponse.json({
      accountId: account.id,
      readyToReceivePayments,
      onboardingComplete,
      requirementsStatus: requirementsStatus || "complete",
      account: {
        id: account.id,
        display_name: account.display_name,
        dashboard: account.dashboard,
        capabilities: account.configuration?.recipient?.capabilities,
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

