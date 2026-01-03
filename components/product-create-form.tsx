/**
 * Product Creation Form Component
 * 
 * This component allows experts to create products that customers can purchase.
 * Products are created at the platform level and linked to the expert's Stripe Connect account.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

export function ProductCreateForm() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "usd",
  });

  useEffect(() => {
    if (user) {
      fetchAccountId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Fetch user's Stripe Connect account ID
   */
  const fetchAccountId = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (profile?.stripe_connect_account_id) {
      setAccountId(profile.stripe_connect_account_id);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!accountId) {
      setError("Please set up your Stripe Connect account first.");
      return;
    }

    // Validate form
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
          priceInCents: priceInCents,
          currency: formData.currency,
          connectedAccountId: accountId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create product");
      }

      const data = await response.json();
      setSuccess(true);
      setFormData({ name: "", description: "", price: "", currency: "usd" });

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error creating product:", err);
      setError(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <p className="text-custom-text/80">Please sign in to create products.</p>
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <p className="text-custom-text/80 mb-4">
          Please set up your Stripe Connect account first to create products.
        </p>
        <a
          href="/dashboard/stripe-connect"
          className="text-cyber-green hover:text-cyber-green-light"
        >
          Go to Payment Setup →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-custom-text mb-4">
        Create Product
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
          <p className="text-green-300">Product created successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-custom-text mb-2">
            Product Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
            placeholder="e.g., Online Course, Consultation"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-custom-text mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
            rows={4}
            placeholder="Describe your product..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-custom-text mb-2">
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-custom-text mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
            >
              <option value="usd">USD ($)</option>
              <option value="eur">EUR (€)</option>
              <option value="gbp">GBP (£)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}

