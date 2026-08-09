"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  FREE_MONTHLY_EMAIL_LIMIT,
  PRO_MONTHLY_EMAIL_LIMIT,
  resolveMonthlyLimit,
} from "@/lib/email-broadcast";

interface MagnetOption {
  id: string;
  title: string;
}

interface BroadcastRow {
  id: string;
  subject: string;
  audience_label: string | null;
  recipient_count: number;
  sent_at: string | null;
  status: string;
  created_at: string;
}

interface EmailBroadcastsPanelProps {
  magnets: MagnetOption[];
  /** Approximate audience sizes for confirmation UX */
  leadCounts: { all: number; byMagnet: Record<string, number> };
}

export function EmailBroadcastsPanel({ magnets, leadCounts }: EmailBroadcastsPanelProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [limit, setLimit] = useState(FREE_MONTHLY_EMAIL_LIMIT);
  const [used, setUsed] = useState(0);
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [tablesReady, setTablesReady] = useState(true);

  const [audience, setAudience] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [bodyContent, setBodyContent] = useState(
    "Hi {{first_name}},\n\nThanks for grabbing my free guide — here's a quick update for you.\n\nBest,\n"
  );

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  const estimatedRecipients = useMemo(() => {
    if (audience === "all") return leadCounts.all;
    return leadCounts.byMagnet[audience] || 0;
  }, [audience, leadCounts]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro_store, plan_tier, monthly_email_limit, emails_sent_this_month, email_quota_period")
        .eq("id", user.id)
        .maybeSingle();

      const pro = !!profile?.is_pro_store || profile?.plan_tier === "pro";
      setIsPro(pro);
      setLimit(resolveMonthlyLimit(pro, profile?.monthly_email_limit));
      // Client-side month reset display (server enforces on send)
      const period = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;
      const usedCount =
        profile?.email_quota_period === period ? Number(profile.emails_sent_this_month) || 0 : 0;
      setUsed(usedCount);

      const { data: rows, error: histError } = await supabase
        .from("email_broadcasts")
        .select("id, subject, audience_label, recipient_count, sent_at, status, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (histError && /relation|does not exist|email_broadcasts/i.test(histError.message)) {
        setTablesReady(false);
        setHistory([]);
      } else if (histError) {
        throw histError;
      } else {
        setTablesReady(true);
        setHistory((rows || []) as BroadcastRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!subject.trim() || !bodyContent.trim()) {
      setError("Subject and body are required");
      return;
    }
    if (remaining <= 0) return;
    if (estimatedRecipients <= 0) {
      setError("No leads in this audience yet. Capture leads via a lead magnet first.");
      return;
    }
    if (
      !confirm(
        `Send "${subject.trim()}" to approximately ${estimatedRecipients} lead${estimatedRecipients === 1 ? "" : "s"}?\n\nThis uses your monthly broadcast quota.`
      )
    ) {
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/broadcasts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          bodyContent: bodyContent.trim(),
          targetLeadMagnetId: audience === "all" ? null : audience,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to send");
      }
      setSuccess(`Broadcast sent to ${data.sentCount} lead${data.sentCount === 1 ? "" : "s"}.`);
      setSubject("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading broadcast tools…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-50">Email broadcasts</h2>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
            {isPro ? "Pro" : "Paid feature · Free tier"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Email your captured lead magnet subscribers. Free plans include {FREE_MONTHLY_EMAIL_LIMIT}{" "}
          emails/month; Pro unlocks {PRO_MONTHLY_EMAIL_LIMIT.toLocaleString()}/month.
        </p>
      </div>

      {!tablesReady && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Run migration <code className="text-amber-50">057_email_broadcasts.sql</code> to enable
          broadcasts and quota tracking.
        </div>
      )}

      {/* Quota banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Monthly broadcasts used
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-50">
              {used} <span className="text-base font-medium text-slate-500">/ {limit}</span>
            </p>
          </div>
          {!isPro && (
            <p className="text-xs text-slate-400">
              Upgrade to Pro for {PRO_MONTHLY_EMAIL_LIMIT.toLocaleString()} emails/month
            </p>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              remaining <= 0 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-sky-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {remaining <= 0 && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            You&apos;ve reached your monthly email broadcast limit. Upgrade to Pro for{" "}
            {PRO_MONTHLY_EMAIL_LIMIT.toLocaleString()} emails/month.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {/* Composer */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-200">Compose broadcast</h3>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Audience
          </label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
          >
            <option value="all">All captured leads ({leadCounts.all})</option>
            {magnets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({leadCounts.byMagnet[m.id] || 0})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="New update on your downloaded guide"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Email body
          </label>
          <p className="mb-2 text-xs text-slate-500">
            Personalization tags:{" "}
            <code className="text-slate-300">{"{{first_name}}"}</code>,{" "}
            <code className="text-slate-300">{"{{email}}"}</code>,{" "}
            <code className="text-slate-300">{"{{name}}"}</code>. Use blank lines for paragraphs;
            <code className="text-slate-300"> **bold**</code> supported.
          </p>
          <textarea
            value={bodyContent}
            onChange={(e) => setBodyContent(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100"
          />
        </div>
        <button
          type="button"
          disabled={sending || remaining <= 0 || !tablesReady}
          onClick={handleSend}
          className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {sending
            ? "Sending…"
            : remaining <= 0
              ? "Quota reached"
              : `Send to ~${estimatedRecipients} lead${estimatedRecipients === 1 ? "" : "s"}`}
        </button>
      </div>

      {/* History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Broadcast history</h3>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No broadcasts sent yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Audience</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => (
                  <tr key={b.id} className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-200">{b.subject}</td>
                    <td className="px-4 py-3 text-slate-400">{b.audience_label || "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{b.recipient_count}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {b.sent_at ? new Date(b.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          b.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : b.status === "failed"
                              ? "bg-red-500/15 text-red-300"
                              : b.status === "partial"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-slate-500/15 text-slate-300"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
