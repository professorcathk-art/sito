/**
 * Stripe Products Dashboard Page
 * 
 * This page allows experts to create and manage Stripe products.
 */

"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ProductCreateForm } from "@/components/product-create-form";

export default function StripeProductsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-custom-text mb-8">
            Create Stripe Product
          </h1>
          <ProductCreateForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

