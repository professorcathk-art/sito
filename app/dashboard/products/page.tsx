import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { ProductsOverview } from "@/components/products-overview";

export default function DashboardProductsPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <ProductsOverview />
      </ExpertRoute>
    </DashboardLayout>
  );
}
