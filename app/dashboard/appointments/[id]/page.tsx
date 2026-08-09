"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { AppointmentHub } from "@/components/appointment-hub";

function HubInner() {
  const params = useParams();
  const id = params.id as string;
  return <AppointmentHub productId={id} />;
}

export default function AppointmentDetailPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <Suspense
          fallback={
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
              <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60" />
            </div>
          }
        >
          <HubInner />
        </Suspense>
      </ExpertRoute>
    </DashboardLayout>
  );
}
