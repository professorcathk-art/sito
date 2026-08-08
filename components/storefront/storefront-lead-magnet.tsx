"use client";

import { useState } from "react";
import type { StorefrontLeadMagnetData } from "@/types/storefront";

interface StorefrontLeadMagnetProps {
  data: StorefrontLeadMagnetData;
  expertId?: string;
  expertName?: string;
  buttonClassName?: string;
  isPreview?: boolean;
}

export function StorefrontLeadMagnet({
  data,
  expertId,
  expertName,
  buttonClassName = "",
  isPreview = false,
}: StorefrontLeadMagnetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const title = data.title || "Get my free guide";
  const subtitle = data.subtitle || "Join my list for exclusive tips and updates.";
  const ctaText = data.ctaText || "Send me the freebie";
  const placeholder = data.placeholder || "Enter your email";
  const successMessage = data.successMessage || "You're in! Check your inbox soon.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      setSuccess(true);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/storefront-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          expertId,
          expertName,
          leadTitle: title,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Something went wrong. Please try again.");
      }
      setSuccess(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 sm:p-6 shadow-lg backdrop-blur-xl">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl"
        style={{ background: "var(--store-btn-bg)" }}
        aria-hidden
      />
      <div className="relative">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--store-btn-bg)" }}>
          Free download
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--store-text)] tracking-tight">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-[var(--store-subheadline)] leading-relaxed">{subtitle}</p>}

        {success ? (
          <p className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">
            {successMessage}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="storefront-lead-email">
              Email
            </label>
            <input
              id="storefront-lead-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              className="min-h-[48px] flex-1 rounded-xl border border-[var(--store-card-border)] bg-white/80 px-4 text-[var(--store-text)] outline-none placeholder:opacity-50 focus:ring-2 focus:ring-[var(--store-btn-bg)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading}
              className={`min-h-[48px] shrink-0 px-5 font-semibold transition-all hover:opacity-90 disabled:opacity-60 ${buttonClassName}`}
            >
              {loading ? "Sending..." : ctaText}
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </section>
  );
}
