"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

function ElearningList() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from("products")
        .select("id, name, price, course_id, courses(cover_image_url, published)")
        .eq("expert_id", user.id)
        .eq("product_type", "e-learning")
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
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">e-Learning</h1>
          <p className="mt-2 text-sm text-slate-400">Open a course hub to edit details, lessons, and members.</p>
        </div>
        <Link href="/dashboard/products" className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white">
          + Add from Overview
        </Link>
      </header>
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-400">
          No e-Learning products yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => {
            const course = Array.isArray(p.courses) ? p.courses[0] : p.courses;
            return (
              <Link
                key={p.id}
                href={`/dashboard/elearning/${p.id}`}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-600 transition-all"
              >
                <div className="relative aspect-video bg-slate-950">
                  {course?.cover_image_url ? (
                    <Image src={course.cover_image_url} alt="" fill className="object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-50 line-clamp-2">{p.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {course?.published ? "Published" : "Draft"} · ${Number(p.price) || 0}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardElearningPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <ElearningList />
      </ExpertRoute>
    </DashboardLayout>
  );
}
