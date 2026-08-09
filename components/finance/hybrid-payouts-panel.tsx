"use client";

import { useEffect, useState } from "react";
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding";
import {
  canCollectOnlinePayments,
  formatBankSummary,
  isBankDetailsComplete,
  type BankDetails,
  type PayoutMethod,
} from "@/lib/payouts";

type ProfilePayout = {
  payout_method?: PayoutMethod | null;
  available_balance?: number;
  pending_payout_balance?: number;
  bank_details?: BankDetails | null;
  stripe_connect_account_id?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  countries?: { code?: string; name?: string } | { code?: string; name?: string }[] | null;
};

export function HybridPayoutsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<ProfilePayout | null>(null);
  const [method, setMethod] = useState<PayoutMethod | "none">("none");
  const [bank, setBank] = useState<BankDetails>({
    recipientName: "",
    country: "",
    swiftBic: "",
    ibanOrAccount: "",
    bankCode: "",
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pendingRequest, setPendingRequest] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payouts/bank-details");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      const p = data.profile as ProfilePayout;
      setProfile(p);
      setMethod((p?.payout_method as PayoutMethod) || "none");
      if (p?.bank_details) {
        setBank({
          recipientName: p.bank_details.recipientName || "",
          country: p.bank_details.country || "",
          swiftBic: p.bank_details.swiftBic || "",
          ibanOrAccount: p.bank_details.ibanOrAccount || "",
          bankCode: p.bank_details.bankCode || "",
        });
      }
      // Check pending request via history — soft: try select if RLS allows
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: pending } = await supabase
          .from("payout_requests")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .limit(1);
        setPendingRequest(!!(pending && pending.length));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payout settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const countryCode = (() => {
    const c = profile?.countries;
    if (Array.isArray(c)) return (c[0]?.code || "").toUpperCase();
    return (c?.code || "").toUpperCase();
  })();
  const isHk = countryCode === "HK";

  const saveMethod = async (next: PayoutMethod | "none") => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/payouts/bank-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutMethod: next === "none" ? null : next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMethod(next);
      setSuccess(
        next === "none"
          ? "Online payouts disabled. You can still sell via offline payment."
          : "Payout method saved."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async () => {
    if (!isBankDetailsComplete(bank)) {
      setError("Complete all required bank fields.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/payouts/bank-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutMethod: "manual_transfer",
          bankDetails: bank,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMethod("manual_transfer");
      setSuccess("Bank details saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submitWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setRequesting(true);
    setError("");
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "usd" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setSuccess(data.message || "Withdrawal requested.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading payout settings…</div>;
  }

  const available = Number(profile?.available_balance) || 0;
  const pending = Number(profile?.pending_payout_balance) || 0;
  const onlineReady = canCollectOnlinePayments({
    payout_method: method === "none" ? null : method,
    stripe_connect_account_id: profile?.stripe_connect_account_id,
    stripe_connect_onboarding_complete: profile?.stripe_connect_onboarding_complete,
    bank_details: bank,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Payout settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Choose how you receive online payments. If you skip this, you can still sell with{" "}
          <strong className="text-slate-300">offline payment</strong> (email / custom link) — Stripe
          checkout will stay disabled.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Online collection status:{" "}
          <span className={onlineReady ? "text-emerald-400" : "text-amber-300"}>
            {onlineReady ? "Ready" : "Not configured"}
          </span>
          {isHk ? " · Profile country: Hong Kong" : countryCode ? ` · Profile country: ${countryCode}` : ""}
        </p>
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

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { id: "none" as const, title: "No online payouts", desc: "Offline / email collection only" },
            {
              id: "stripe_connect" as const,
              title: "Stripe Connect (HK)",
              desc: "Automated Stripe payouts for Hong Kong experts",
            },
            {
              id: "manual_transfer" as const,
              title: "Manual bank transfer",
              desc: "Platform holds funds; withdraw via bank (overseas)",
            },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={saving}
            onClick={() => saveMethod(opt.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              method === opt.id
                ? "border-sky-500 bg-sky-500/10"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
            }`}
          >
            <p className="text-sm font-semibold text-slate-100">{opt.title}</p>
            <p className="mt-1 text-xs text-slate-500">{opt.desc}</p>
          </button>
        ))}
      </div>

      {method === "stripe_connect" && (
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-semibold text-slate-200">Stripe Connect (Hong Kong)</h3>
          <p className="text-sm text-slate-400">
            Automated payouts follow your Stripe Express schedule once your account is verified.
          </p>
          <StripeConnectOnboarding />
        </section>
      )}

      {method === "manual_transfer" && (
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Available balance</p>
              <p className="mt-1 text-3xl font-bold text-slate-50">${available.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">USD · ready to withdraw</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending withdrawal</p>
              <p className="mt-1 text-3xl font-bold text-amber-100">${pending.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">Locked in an open request</p>
            </div>
          </div>

          <button
            type="button"
            disabled={available <= 0 || pendingRequest || requesting}
            onClick={() => {
              setWithdrawAmount(available.toFixed(2));
              setShowWithdrawModal(true);
            }}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {pendingRequest ? "Withdrawal pending…" : "Request withdrawal"}
          </button>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-semibold text-slate-200">Bank details</h3>
            <p className="text-xs text-slate-500">
              Used for Wise / bank transfers. Keep SWIFT and account details accurate.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["recipientName", "Recipient name"],
                  ["country", "Country (e.g. US, GB, SG)"],
                  ["swiftBic", "SWIFT / BIC"],
                  ["ibanOrAccount", "IBAN / Account number"],
                  ["bankCode", "Local bank code (optional)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm sm:col-span-1">
                  <span className="mb-1 block text-xs text-slate-500">{label}</span>
                  <input
                    value={bank[key] || ""}
                    onChange={(e) => setBank({ ...bank, [key]: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={saveBank}
              disabled={saving}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save bank details"}
            </button>
          </div>
        </section>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-50">Confirm withdrawal</h3>
            <p className="mt-2 text-sm text-slate-400">
              Manual payouts are processed via bank transfer within{" "}
              <strong className="text-slate-200">7–10 business days</strong>.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Amount (USD)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={available}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <p className="mt-3 text-xs text-slate-500">
              Bank on file: {formatBankSummary(bank)}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 rounded-lg border border-slate-600 py-2.5 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={requesting}
                onClick={submitWithdraw}
                className="flex-1 rounded-lg bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {requesting ? "Submitting…" : "Confirm request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
