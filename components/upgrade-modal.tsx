"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Redirect to Stripe checkout for Pro subscription
      const response = await fetch("/api/stripe/create-pro-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
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
      <div className="bg-[#121212] border border-white/10 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">⭐</div>
          <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
          <p className="text-gray-500">
            Unlock premium themes, advanced customization, and more features to make your storefront stand out.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-white">✓</span>
            <div>
              <div className="text-white font-medium">Premium Themes</div>
              <div className="text-sm text-gray-500">Access to exclusive theme presets</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-white">✓</span>
            <div>
              <div className="text-white font-medium">Advanced Customization</div>
              <div className="text-sm text-gray-500">Custom colors, fonts, and layouts</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-white">✓</span>
            <div>
              <div className="text-white font-medium">Analytics Dashboard</div>
              <div className="text-sm text-gray-500">Track clicks and conversions</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-transparent border border-white/10 text-white rounded-md font-medium hover:bg-white/5 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white text-black rounded-md font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Upgrade Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
