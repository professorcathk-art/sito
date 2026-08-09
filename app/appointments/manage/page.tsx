"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Legacy appointments manager — redirects into the modern hubs:
 * - Student my-bookings → My Learning
 * - Expert bookings/slots → Creator Studio appointment hub
 */
function ManageRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    if (tab === "my-bookings") {
      router.replace("/dashboard/my-bookings");
      return;
    }
    router.replace("/dashboard/appointments");
  }, [router, tab]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Redirecting to appointment hub…
    </div>
  );
}

export default function ManageAppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Loading…
        </div>
      }
    >
      <ManageRedirect />
    </Suspense>
  );
}
