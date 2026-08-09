"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { canCollectOnlinePayments, type BankDetails } from "@/lib/payouts";

/**
 * Simple product create form — requires a configured payout route for Stripe products.
 */
export function ProductCreateForm() {
  const { user } = useAuth();
  const supabase = createClient();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [payoutReady, setPayoutReady] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "usd",
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "stripe_connect_account_id, stripe_connect_onboarding_complete, payout_method, bank_details"
        )
        .eq("id", user.id)
        .single();
      setAccountId(profile?.stripe_connect_account_id || null);
      setPayoutMethod(profile?.payout_method || null);
      setPayoutReady(
        canCollectOnlinePayments({
          payout_method: profile?.payout_method,
          stripe_connect_account_id: profile?.stripe_connect_account_id,
          stripe_connect_onboarding_complete: profile?.stripe_connect_onboarding_complete,
          bank_details: profile?.bank_details as BankDetails | null,
        })
      );
    }
    load();
  }, [user, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!payoutReady) {
      setError("Please enable online payouts in Payout Settings first.");
      return;
    }

    if (!formData.name || !formData.price) {
      setError("Please fill in all required fields.");
      return;
    }

    const priceInCents = Math.round(parseFloat(formData.price) * 100);
    if (priceInCents <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          priceInCents,
          currency: formData.currency,
          connectedAccountId:
            payoutMethod === "stripe_connect" ? accountId : undefined,
          payoutRoute:
            payoutMethod === "manual_transfer" ? "manual_transfer" : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create product");
      }

      setSuccess(true);
      setFormData({ name: "", description: "", price: "", currency: "usd" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-surface border border-border-default rounded-md p-6">
        <p className="text-text-secondary">Please sign in to create products.</p>
      </div>
    );
  }

  if (!payoutReady) {
    return (
      <div className="bg-surface border border-border-default rounded-md p-6">
        <p className="text-text-secondary mb-4">
          Enable Stripe Connect (HK) or manual bank transfer in Payout Settings to create
          paid products with online checkout. Offline products can still be managed from
          Products.
        </p>
        <Link href="/dashboard/finance/payouts" className="text-cyber-green hover:text-white">
          Go to Payout Settings →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-default rounded-md p-6">
      <h2 className="text-2xl font-bold text-custom-text mb-4">Create Product</h2>
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-md">
          <p className="text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-md">
          <p className="text-green-300">Product created.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <textarea
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text"
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <input
          type="number"
          min="0.01"
          step="0.01"
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text"
          placeholder="Price (USD)"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
