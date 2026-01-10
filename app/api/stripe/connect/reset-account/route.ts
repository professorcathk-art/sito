/**
 * API Route: Reset Stripe Connect Account
 * 
 * This endpoint clears the Stripe Connect account ID from the user's profile.
 * Useful when switching from test mode to live mode, or when an account is invalid.
 * 
 * POST /api/stripe/connect/reset-account
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Clear the Stripe Connect account ID from profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_connect_account_id: null,
        stripe_connect_onboarding_complete: false,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error resetting account:", updateError);
      return NextResponse.json(
        { error: "Failed to reset account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account reset successfully. You can now create a new Stripe account.",
    });

  } catch (error: any) {
    console.error("Error resetting account:", error);
    return NextResponse.json(
      { error: "Failed to reset account" },
      { status: 500 }
    );
  }
}
