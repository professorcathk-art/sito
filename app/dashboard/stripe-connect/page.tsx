/**
 * Stripe Connect Dashboard Page
 * 
 * This page allows experts to:
 * 1. Set up their Stripe Connect account
 * 2. Check onboarding status
 * 3. View account information
 */

"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function StripeConnectContent() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId");
  const refresh = searchParams.get("refresh");

  useEffect(() => {
    // If redirected from Stripe onboarding, show success message
    if (accountId) {
      // You could show a success toast here
      console.log("Returned from Stripe onboarding:", accountId);
    }
  }, [accountId]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-custom-text mb-8">
        Payment Setup
      </h1>

      {refresh && (
        <div className="mb-6 p-4 bg-cyber-green/20 border border-cyber-green/50 rounded-lg">
          <p className="text-custom-text">
            Please refresh the page to see your updated account status.
          </p>
        </div>
      )}

      <StripeConnectOnboarding />
    </div>
  );
}

export default function StripeConnectPage() {

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<div className="text-custom-text/60">Loading...</div>}>
          <StripeConnectContent />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

