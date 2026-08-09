"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { MyBookingsPanel } from "@/components/learning/my-bookings-panel";

export default function LearningBookingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MyBookingsPanel />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
