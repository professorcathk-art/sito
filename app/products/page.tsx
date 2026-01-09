import { ProductsManagement } from "@/components/products-management";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ExpertRoute } from "@/components/expert-route";

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ExpertRoute>
        <DashboardLayout>
          <ProductsManagement />
        </DashboardLayout>
      </ExpertRoute>
    </ProtectedRoute>
  );
}

