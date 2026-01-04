/**
 * API Route: Get Stripe Connect Account Earnings
 * 
 * This endpoint retrieves the total earnings (balance) for a Stripe Connect account.
 * 
 * GET /api/stripe/connect/earnings?accountId=acct_xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const stripeClient = getStripeClient();
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Get account ID from query params or user's profile
    const searchParams = request.nextUrl.searchParams;
    let accountId = searchParams.get("accountId");

    if (!accountId) {
      // Fetch from user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.stripe_connect_account_id) {
        return NextResponse.json(
          { error: "No Stripe Connect account found. Please set up your account first." },
          { status: 404 }
        );
      }

      accountId = profile.stripe_connect_account_id;
    }

    // Retrieve account balance from Stripe
    // For connected accounts, we need to use the request options
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    const balance = await stripeClient.balance.retrieve(
      {},
      {
        stripeAccount: accountId,
      }
    );

    // Calculate total available balance (in dollars)
    const totalAvailable = balance.available.reduce((sum, bal) => {
      return sum + bal.amount;
    }, 0) / 100; // Convert from cents to dollars

    // Calculate total pending balance (in dollars)
    const totalPending = balance.pending.reduce((sum, bal) => {
      return sum + bal.amount;
    }, 0) / 100; // Convert from cents to dollars

    // Get default currency (usually the first available balance currency)
    const currency = balance.available[0]?.currency || "usd";

    return NextResponse.json({
      accountId,
      totalAvailable,
      totalPending,
      totalEarnings: totalAvailable + totalPending,
      currency: currency.toUpperCase(),
      balance: {
        available: balance.available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency.toUpperCase(),
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount / 100,
          currency: b.currency.toUpperCase(),
        })),
      },
    });

  } catch (error: any) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}

