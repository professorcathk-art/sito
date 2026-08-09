"use client";

import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { SubscriptionsSavedPanel } from "@/components/learning/subscriptions-saved-panel";

export default function LearningSubscriptionsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<div className="text-sm text-slate-400">Loading…</div>}>
          <SubscriptionsSavedPanel />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
