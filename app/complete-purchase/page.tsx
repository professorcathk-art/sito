"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CompletePurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = searchParams.get("dest") || "/courses/manage";

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/fulfill-pending-purchases", { method: "POST" });
        if (!res.ok && !cancelled) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "Failed to complete purchase");
          return;
        }
        if (!cancelled) {
          router.push(dest);
          router.refresh();
        }
      } catch (err) {
        if (!cancelled) {
          setError("An error occurred. Please try again.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [dest, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-custom-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <a
            href={dest}
            className="inline-block px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-lg"
          >
            Go to {dest.includes("appointments") ? "Appointments" : "Classroom"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-custom-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-text-secondary mb-2">Completing your purchase...</div>
        <div className="text-sm text-text-secondary">Redirecting you to your {dest.includes("appointments") ? "bookings" : "course"}...</div>
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
