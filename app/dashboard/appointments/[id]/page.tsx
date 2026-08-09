"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { AppointmentHub } from "@/components/appointment-hub";

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <DashboardLayout>
      <ExpertRoute>
        <AppointmentHub productId={id} />
      </ExpertRoute>
    </DashboardLayout>
  );
}
