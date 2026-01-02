import { ProductsManagement } from "@/components/products-management";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProductsManagement />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

