/**
 * POST /api/payouts/request — atomic manual withdrawal request + admin email
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { formatBankSummary, type BankDetails } from "@/lib/payouts";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "professor.cat.hk@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const currency = typeof body.currency === "string" ? body.currency.toLowerCase() : "usd";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid withdrawal amount." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, payout_method, available_balance, bank_details")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.payout_method !== "manual_transfer") {
      return NextResponse.json(
        {
          error:
            "Bank withdrawals are only available when International bank transfer is selected in Payout Settings.",
        },
        { status: 400 }
      );
    }

    const admin = createServiceRoleClient();
    const { data: requestId, error: rpcError } = await admin.rpc("request_manual_payout", {
      p_user_id: user.id,
      p_amount: amount,
      p_currency: currency,
    });

    if (rpcError) {
      console.error("request_manual_payout:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Failed to create payout request" },
        { status: 400 }
      );
    }

    // Notify admin via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const bank = (profile.bank_details || {}) as BankDetails;
        const site = getSiteUrl();
        const creatorName = profile.name || "Creator";
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Sito <onboarding@resend.dev>",
          to: [ADMIN_EMAIL],
          subject: `[Sito Admin] New Payout Request - $USD ${amount.toFixed(2)} from ${creatorName}`,
          html: `
            <h2>New manual payout request</h2>
            <p><strong>Creator:</strong> ${escapeHtml(creatorName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(profile.email || user.email || "")}</p>
            <p><strong>Amount:</strong> $${amount.toFixed(2)} ${currency.toUpperCase()}</p>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p><strong>Bank details:</strong><br/>${escapeHtml(formatBankSummary(bank))}</p>
            <pre style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:12px">${escapeHtml(
              JSON.stringify(bank, null, 2)
            )}</pre>
            <p><a href="${site}/admin/payouts">Review in Admin → Payouts</a></p>
          `,
        });
      } catch (emailErr) {
        console.error("Admin payout email failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      amount,
      message:
        "Payout request submitted. Bank transfers are typically completed within 7–10 business days.",
    });
  } catch (error: unknown) {
    console.error("payouts/request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to request payout" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
