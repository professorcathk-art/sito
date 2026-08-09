"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { LearnerHome } from "@/components/learning/learner-home";

export default function LearningHomePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LearnerHome />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
