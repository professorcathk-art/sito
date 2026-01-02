import { ConnectionsContent } from "@/components/connections-content";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function ConnectionsPage() {
  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <ConnectionsContent />
      </div>
    </DashboardLayout>
  );
}

