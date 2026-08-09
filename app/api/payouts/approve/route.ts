import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = body.requestId as string;
    const referenceId = typeof body.referenceId === "string" ? body.referenceId.trim() : "";
    const action = body.action === "reject" ? "reject" : "approve";

    if (!requestId) {
      return NextResponse.json({ error: "requestId required" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: payoutReq, error: fetchErr } = await admin
      .from("payout_requests")
      .select("id, user_id, amount, currency, status")
      .eq("id", requestId)
      .single();

    if (fetchErr || !payoutReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "reject") {
      const { error } = await admin.rpc("reject_manual_payout", {
        p_request_id: requestId,
        p_admin_note: body.adminNote || null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    const { error } = await admin.rpc("approve_manual_payout", {
      p_request_id: requestId,
      p_reference_id: referenceId || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Email expert confirmation
    const { data: expert } = await admin
      .from("profiles")
      .select("name, email")
      .eq("id", payoutReq.user_id)
      .maybeSingle();

    if (process.env.RESEND_API_KEY && expert?.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const amt = Number(payoutReq.amount).toFixed(2);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Sito <onboarding@resend.dev>",
          to: [expert.email],
          subject: `Your Sito payout of $${amt} USD has been sent`,
          html: `
            <p>Hi ${expert.name || "there"},</p>
            <p>Your payout of <strong>$${amt} USD</strong> has been processed and sent to your bank account.</p>
            ${referenceId ? `<p>Transfer reference: <code>${referenceId}</code></p>` : ""}
            <p>Please allow a few additional business days for funds to appear, depending on your bank.</p>
            <p>— The Sito team</p>
          `,
        });
      } catch (e) {
        console.error("Expert payout confirmation email failed:", e);
      }
    }

    return NextResponse.json({ success: true, status: "approved" });
  } catch (error: unknown) {
    console.error("payouts/approve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process payout" },
      { status: 500 }
    );
  }
}
