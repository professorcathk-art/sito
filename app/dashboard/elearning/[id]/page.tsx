"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { ElearningHub } from "@/components/elearning-hub";

export default function ElearningDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <DashboardLayout>
      <ExpertRoute>
        <ElearningHub productId={id} />
      </ExpertRoute>
    </DashboardLayout>
  );
}
