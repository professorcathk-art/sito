"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  PLAN_FEATURES,
  PRO_MONTHLY_PRICE_USD,
  PRO_YEARLY_PRICE_USD,
  emailLimitForPlan,
  resolvePlanTier,
  type PlanTier,
} from "@/lib/billing";
import { currentQuotaPeriod } from "@/lib/email-broadcast";

export function BillingSettings() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"month" | "year" | "portal" | null>(null);
  const [error, setError] = useState("");
  const [tier, setTier] = useState<PlanTier>("free");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(50);
  const [banner, setBanner] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "plan_tier, is_pro_store, monthly_email_limit, emails_sent_this_month, email_quota_period, pro_subscription_expires_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      const resolved = resolvePlanTier({
        plan_tier: profile?.plan_tier,
        is_pro_store: profile?.is_pro_store,
      });
      setTier(resolved);
      setLimit(emailLimitForPlan(resolved));
      const period = currentQuotaPeriod();
      setUsed(
        profile?.email_quota_period === period
          ? Number(profile.emails_sent_this_month) || 0
          : 0
      );

      const { data: sub } = await supabase
        .from("saas_subscriptions")
        .select("current_period_end, status, cancel_at_period_end")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      setRenewalDate(
        sub?.current_period_end || profile?.pro_subscription_expires_at || null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setBanner("Welcome to Pro! Your subscription is activating.");
      load();
    } else if (searchParams.get("canceled") === "true") {
      setBanner("Checkout canceled — you can upgrade anytime.");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCheckout = async (interval: "month" | "year") => {
    setActionLoading(interval);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setActionLoading(null);
    }
  };

  const openPortal = async () => {
    setActionLoading("portal");
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Portal failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open portal");
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading billing…</div>;
  }

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isPro = tier === "pro";

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Billing</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your Sito Creator plan and email broadcast credits.
        </p>
      </header>

      {banner && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
          {banner}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Status card */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current plan</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                  isPro
                    ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}
              >
                {isPro ? "Pro" : "Free"}
              </span>
              {isPro && (
                <span className="text-sm text-slate-400">
                  ${PRO_MONTHLY_PRICE_USD}/mo Creator
                </span>
              )}
            </div>
          </div>
          {isPro && renewalDate && (
            <p className="text-sm text-slate-400">
              Renews{" "}
              <span className="text-slate-200">
                {new Date(renewalDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Email broadcast credits</span>
            <span className="text-slate-200">
              {used} / {limit}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${remaining <= 0 ? "bg-red-500" : "bg-sky-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{remaining} emails remaining this month</p>
        </div>

        {isPro ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={actionLoading === "portal"}
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
          >
            {actionLoading === "portal" ? "Opening…" : "Manage Subscription / Payment Method"}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startCheckout("month")}
              disabled={!!actionLoading}
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
            >
              {actionLoading === "month"
                ? "Redirecting…"
                : `Upgrade to Pro ($${PRO_MONTHLY_PRICE_USD}/mo)`}
            </button>
            <button
              type="button"
              onClick={() => startCheckout("year")}
              disabled={!!actionLoading}
              className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
            >
              {actionLoading === "year"
                ? "Redirecting…"
                : `Yearly · $${PRO_YEARLY_PRICE_USD}/yr`}
            </button>
          </div>
        )}
      </section>

      {/* Comparison */}
      <section className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Feature</th>
              <th className="px-4 py-3">Free</th>
              <th className="px-4 py-3 text-amber-200/90">Pro</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {[
              ["Storefront", "1", "1"],
              ["Email broadcasts / mo", "50", "2,500"],
              ["Lead magnets", "Included", "Unlimited"],
              ["Hide Powered by Sito", "—", "Yes"],
              ["Priority support", "—", "Yes"],
            ].map(([feature, free, pro]) => (
              <tr key={feature} className="border-t border-slate-800">
                <td className="px-4 py-3 text-slate-200">{feature}</td>
                <td className="px-4 py-3 text-slate-400">{free}</td>
                <td className="px-4 py-3 text-amber-100/90">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isPro && (
          <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-4">
            <button
              type="button"
              onClick={() => startCheckout("month")}
              disabled={!!actionLoading}
              className="w-full sm:w-auto rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
            >
              Upgrade to Pro (${PRO_MONTHLY_PRICE_USD}/mo)
            </button>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {PLAN_FEATURES.pro.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
