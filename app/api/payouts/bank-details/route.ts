import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isBankDetailsComplete, type BankDetails, type PayoutMethod } from "@/lib/payouts";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "payout_method, available_balance, pending_payout_balance, bank_details, stripe_connect_account_id, stripe_connect_onboarding_complete, country_id, countries(code, name)"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // Retry without join / new columns
    const retry = await supabase
      .from("profiles")
      .select(
        "payout_method, available_balance, pending_payout_balance, bank_details, stripe_connect_account_id, stripe_connect_onboarding_complete"
      )
      .eq("id", user.id)
      .maybeSingle();
    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 500 });
    }
    return NextResponse.json({ profile: retry.data });
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const payoutMethod = body.payoutMethod as PayoutMethod | null | undefined;
  const bankDetails = body.bankDetails as BankDetails | null | undefined;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (payoutMethod === null) {
    updates.payout_method = null;
  } else if (payoutMethod === "stripe_connect" || payoutMethod === "manual_transfer") {
    updates.payout_method = payoutMethod;
  }

  if (bankDetails !== undefined) {
    if (bankDetails && !isBankDetailsComplete(bankDetails)) {
      return NextResponse.json(
        { error: "Please complete recipient name, country, SWIFT/BIC, and account / IBAN." },
        { status: 400 }
      );
    }
    updates.bank_details = bankDetails;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    if (/payout_method|bank_details|column/i.test(error.message)) {
      return NextResponse.json(
        { error: "Run migration 059_hybrid_payouts.sql in Supabase to enable payout settings." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
