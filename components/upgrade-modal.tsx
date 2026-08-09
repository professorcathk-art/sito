"use client";

import { useState } from "react";
import {
  FREE_LEAD_MAGNET_LIMIT,
  PLAN_FEATURES,
  PRO_MONTHLY_PRICE_USD,
} from "@/lib/billing";
import { FREE_MONTHLY_EMAIL_LIMIT, PRO_MONTHLY_EMAIL_LIMIT } from "@/lib/email-broadcast";

interface UpgradeModalProps {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "month" }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Checkout failed");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert("Failed to start upgrade process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-50 mb-2">Upgrade to Pro</h2>
          <p className="text-slate-400">
            ${PRO_MONTHLY_PRICE_USD}/mo — unlock unlimited lead magnets, more email credits, and hide
            Sito branding.
          </p>
        </div>

        <div className="space-y-3 mb-6 text-sm">
          {PLAN_FEATURES.pro.map((f) => (
            <div key={f} className="flex items-start gap-3">
              <span className="text-sky-400">✓</span>
              <span className="text-slate-200">{f}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-slate-500">
            Free plan includes {FREE_LEAD_MAGNET_LIMIT} lead magnets and {FREE_MONTHLY_EMAIL_LIMIT}{" "}
            emails/mo (Pro: unlimited magnets · {PRO_MONTHLY_EMAIL_LIMIT.toLocaleString()} emails/mo).
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-transparent border border-slate-700 text-slate-50 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : `Upgrade · $${PRO_MONTHLY_PRICE_USD}/mo`}
          </button>
        </div>
      </div>
    </div>
  );
}
