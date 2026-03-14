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
import { ExpertRoute } from "@/components/expert-route";
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
        <div className="mb-6 p-4 bg-primary/20 border border-border-default rounded-lg">
          <p className="text-custom-text">
            Please refresh the page to see your updated account status.
          </p>
        </div>
      )}

      <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
        <p className="text-yellow-300 font-semibold mb-1">
          ⚠️ Payment Processing Notice
        </p>
        <p className="text-yellow-200 text-sm">
          Built-in payment processing is currently only supported for Hong Kong users. 
          If you are located outside Hong Kong, please use offline payment methods for your products.
        </p>
      </div>

      <StripeConnectOnboarding />
    </div>
  );
}

export default function StripeConnectPage() {

  return (
    <ProtectedRoute>
      <ExpertRoute>
        <DashboardLayout>
          <Suspense fallback={<div className="text-text-secondary">Loading...</div>}>
            <StripeConnectContent />
          </Suspense>
        </DashboardLayout>
      </ExpertRoute>
    </ProtectedRoute>
  );
}

