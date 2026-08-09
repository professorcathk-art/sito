"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

function AppointmentsList() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from("products")
        .select("id, name, price, pricing_type")
        .eq("expert_id", user.id)
        .eq("product_type", "appointment")
        .order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Products</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Appointments</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage session settings, availability, and booking requests in each appointment hub.
          </p>
        </div>
        <Link href="/dashboard/products" className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white">
          + Add from Overview
        </Link>
      </header>
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-400">
          No appointment product yet. Create one from Products Overview.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/appointments/${p.id}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-600 transition-all"
            >
              <h3 className="text-lg font-semibold text-slate-50">{p.name}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {p.pricing_type === "hourly" ? "Hourly sessions" : "Sessions"} · Manage hub →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardAppointmentsPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <AppointmentsList />
      </ExpertRoute>
    </DashboardLayout>
  );
}
