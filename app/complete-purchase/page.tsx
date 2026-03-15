"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/navigation";

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500;

function CompletePurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = searchParams.get("dest") || "/courses/manage";

  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runFulfill = async (attempt = 0): Promise<boolean> => {
      const res = await fetch("/api/fulfill-pending-purchases", { method: "POST" });
      if (res.ok) return true;
      if (res.status === 401 && attempt < MAX_RETRIES) {
        if (!cancelled) setRetrying(true);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return runFulfill(attempt + 1);
      }
      const data = await res.json().catch(() => ({}));
      if (!cancelled) setError(data?.error || "Failed to complete purchase");
      return false;
    };

    (async () => {
      try {
        const ok = await runFulfill();
        if (!cancelled && ok) {
          setRetrying(false);
          router.push(dest);
          router.refresh();
        }
      } catch (err) {
        if (!cancelled) {
          setError("An error occurred. Please try again.");
          setRetrying(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [dest, router]);

  if (error) {
    const isAuthError = error.toLowerCase().includes("logged in") || error.toLowerCase().includes("auth");
    return (
      <div className="min-h-screen bg-custom-bg">
        <Navigation />
        <div className="pt-24 pb-20 px-4 flex items-center justify-center">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-custom-text mb-4">Almost There</h1>
            <p className="text-text-secondary mb-6">
              {isAuthError
                ? "Please sign in again to access your purchase. Your purchase is saved and will be available once you sign in."
                : error}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/complete-purchase?dest=${dest}`)}`}
                className="px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={dest}
                className="px-6 py-3 border border-border-default text-custom-text rounded-lg hover:bg-surface transition-colors"
              >
                Go to {dest.includes("appointments") ? "Appointments" : "Classroom"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-custom-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-text-secondary mb-2">
          {retrying ? "Setting up your account..." : "Completing your purchase..."}
        </div>
        <div className="text-sm text-text-secondary">
          Redirecting you to your {dest.includes("appointments") ? "bookings" : "course"}...
        </div>
      </div>
    </div>
  );
}

export default function CompletePurchasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-custom-bg flex items-center justify-center">
        <div className="text-text-secondary animate-pulse">Loading...</div>
      </div>
    }>
      <CompletePurchaseContent />
    </Suspense>
  );
}
