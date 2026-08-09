/**
 * Send a lead email broadcast via Resend (batched), with monthly quota enforcement.
 * Pro-ready: free 50 / pro 2500 emails per month.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import {
  bodyToHtml,
  currentQuotaPeriod,
  personalizeTemplate,
  resolveMonthlyLimit,
  wrapBroadcastHtml,
  type BroadcastRecipient,
} from "@/lib/email-broadcast";

const BATCH_SIZE = 100;

function sanitizeFromName(name: string): string {
  return name.replace(/[<>"]/g, "").trim().slice(0, 64) || "Creator";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email sending is not configured (RESEND_API_KEY missing)." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const bodyContent = typeof body.bodyContent === "string" ? body.bodyContent.trim() : "";
    const targetLeadMagnetId =
      typeof body.targetLeadMagnetId === "string" && body.targetLeadMagnetId
        ? body.targetLeadMagnetId
        : null;

    if (!subject || subject.length < 2) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!bodyContent || bodyContent.length < 2) {
      return NextResponse.json({ error: "Email body is required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, name, email, is_pro_store, plan_tier, monthly_email_limit, emails_sent_this_month, email_quota_period"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const period = currentQuotaPeriod();
    let sentThisMonth = Number(profile.emails_sent_this_month) || 0;
    if (profile.email_quota_period !== period) {
      sentThisMonth = 0;
      await supabase
        .from("profiles")
        .update({ emails_sent_this_month: 0, email_quota_period: period })
        .eq("id", user.id);
    }

    const isPro = !!profile.is_pro_store || profile.plan_tier === "pro";
    const limit = resolveMonthlyLimit(isPro, profile.monthly_email_limit);
    // Keep limit column in sync for Pro prep
    if ((profile.monthly_email_limit || 50) !== limit) {
      await supabase.from("profiles").update({ monthly_email_limit: limit }).eq("id", user.id);
    }

    const remaining = Math.max(0, limit - sentThisMonth);
    if (remaining <= 0) {
      return NextResponse.json(
        {
          error: "Insufficient quota",
          message:
            "You've reached your monthly email broadcast limit. Upgrade to Pro for 2,500 emails/month.",
          remaining: 0,
          limit,
          used: sentThisMonth,
          isPro,
        },
        { status: 403 }
      );
    }

    // Build recipient list from lead_submissions (+ legacy contact_messages for all-leads)
    const recipientsMap = new Map<string, BroadcastRecipient>();

    let subQuery = supabase
      .from("lead_submissions")
      .select("email, name, responses")
      .eq("expert_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (targetLeadMagnetId) {
      subQuery = subQuery.eq("lead_magnet_id", targetLeadMagnetId);
    }

    const { data: submissions } = await subQuery;
    (submissions || []).forEach((s) => {
      const email = (s.email || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      if (recipientsMap.has(email)) return;
      const responses = (s.responses || {}) as Record<string, string>;
      const name =
        s.name ||
        responses.Name ||
        responses.name ||
        responses["Full name"] ||
        email.split("@")[0];
      recipientsMap.set(email, { email, name, first_name: name.split(/\s+/)[0] });
    });

    // When "all leads", also include legacy contact_messages storefront leads
    if (!targetLeadMagnetId) {
      const { data: contacts } = await supabase
        .from("contact_messages")
        .select("email, name")
        .eq("expert_id", user.id)
        .limit(2000);
      (contacts || []).forEach((c) => {
        const email = (c.email || "").trim().toLowerCase();
        if (!email || recipientsMap.has(email)) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        recipientsMap.set(email, {
          email,
          name: c.name || email.split("@")[0],
          first_name: (c.name || email.split("@")[0]).split(/\s+/)[0],
        });
      });
    }

    // Exclude unsubscribes
    const { data: unsubs } = await supabase
      .from("broadcast_unsubscribes")
      .select("email")
      .eq("creator_id", user.id);
    const unsubSet = new Set((unsubs || []).map((u) => u.email.toLowerCase()));
    const recipients = Array.from(recipientsMap.values()).filter((r) => !unsubSet.has(r.email));

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found for this audience." },
        { status: 400 }
      );
    }

    if (recipients.length > remaining) {
      return NextResponse.json(
        {
          error: "Insufficient quota",
          message: `This broadcast targets ${recipients.length} leads, but you only have ${remaining} emails left this month.`,
          remaining,
          limit,
          used: sentThisMonth,
          requested: recipients.length,
          isPro,
        },
        { status: 403 }
      );
    }

    let audienceLabel = "All captured leads";
    if (targetLeadMagnetId) {
      const { data: magnet } = await supabase
        .from("lead_magnets")
        .select("title")
        .eq("id", targetLeadMagnetId)
        .eq("expert_id", user.id)
        .maybeSingle();
      audienceLabel = magnet?.title ? `Lead magnet: ${magnet.title}` : "Lead magnet";
    }

    const { data: broadcastRow, error: broadcastInsertError } = await supabase
      .from("email_broadcasts")
      .insert({
        creator_id: user.id,
        subject,
        body_content: bodyContent,
        recipient_count: recipients.length,
        target_lead_magnet_id: targetLeadMagnetId,
        audience_label: audienceLabel,
        status: "sending",
      })
      .select("id")
      .single();

    if (broadcastInsertError || !broadcastRow) {
      // Table may not exist yet
      if (/relation|does not exist|email_broadcasts/i.test(broadcastInsertError?.message || "")) {
        return NextResponse.json(
          {
            error:
              "Run migration 057_email_broadcasts.sql in Supabase to enable email broadcasts.",
          },
          { status: 503 }
        );
      }
      throw broadcastInsertError || new Error("Failed to create broadcast record");
    }

    const broadcastId = broadcastRow.id as string;
    const creatorName = profile.name || "Creator";
    const replyTo = profile.email || undefined;
    // Prefer verified domain; override with RESEND_BROADCAST_FROM / RESEND_FROM_EMAIL in env
    const from =
      process.env.RESEND_BROADCAST_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      `${sanitizeFromName(creatorName)} via Sito <notifications@sito.club>`;

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.sito.club";

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sentCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      const payloads = chunk.map((r) => {
        const personalized = personalizeTemplate(bodyContent, {
          email: r.email,
          name: r.name || undefined,
          first_name: r.first_name || undefined,
        });
        const unsub = `${origin}/api/broadcasts/unsubscribe?creatorId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(r.email)}`;
        const html = wrapBroadcastHtml({
          creatorName,
          bodyHtml: bodyToHtml(personalized),
          unsubscribeUrl: unsub,
        });
        return {
          from,
          to: [r.email],
          subject: personalizeTemplate(subject, {
            email: r.email,
            name: r.name || undefined,
            first_name: r.first_name || undefined,
          }),
          html,
          ...(replyTo ? { replyTo } : {}),
        };
      });

      const { error: batchError } = await resend.batch.send(payloads);
      if (batchError) {
        errors.push(batchError.message);
        console.error("Resend batch error:", batchError);
      } else {
        sentCount += chunk.length;
      }
    }

    const status =
      sentCount === 0 ? "failed" : sentCount < recipients.length ? "partial" : "completed";

    await supabase
      .from("email_broadcasts")
      .update({
        status,
        recipient_count: sentCount,
        sent_at: new Date().toISOString(),
        error_message: errors.length ? errors.slice(0, 3).join("; ") : null,
      })
      .eq("id", broadcastId);

    if (sentCount > 0) {
      await supabase
        .from("profiles")
        .update({
          emails_sent_this_month: sentThisMonth + sentCount,
          email_quota_period: period,
          monthly_email_limit: limit,
        })
        .eq("id", user.id);
    }

    if (status === "failed") {
      return NextResponse.json(
        { error: errors[0] || "Failed to send broadcast", broadcastId, status },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      broadcastId,
      sentCount,
      status,
      remaining: remaining - sentCount,
      limit,
      used: sentThisMonth + sentCount,
    });
  } catch (error: unknown) {
    console.error("broadcasts/send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send broadcast" },
      { status: 500 }
    );
  }
}
