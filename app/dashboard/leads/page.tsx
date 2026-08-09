import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { LeadsManagement } from "@/components/leads-management";

export default function DashboardLeadsPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <LeadsManagement />
      </ExpertRoute>
    </DashboardLayout>
  );
}
