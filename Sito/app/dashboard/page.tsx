import { Navigation } from "@/components/navigation";
import { DashboardContent } from "@/components/dashboard-content";
import { ProtectedRoute } from "@/components/protected-route";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 pb-12">
          <DashboardContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}

