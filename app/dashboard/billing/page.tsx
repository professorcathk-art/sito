import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { BillingSettings } from "@/components/billing/billing-settings";

export default function BillingPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <Suspense fallback={<div className="text-slate-400 text-sm">Loading billing…</div>}>
          <BillingSettings />
        </Suspense>
      </ExpertRoute>
    </DashboardLayout>
  );
}
