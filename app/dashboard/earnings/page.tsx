"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

type EarningsTab = "sales" | "balance" | "payouts";

function EarningsContent() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as EarningsTab | null) || "sales";
  const tab: EarningsTab = ["sales", "balance", "payouts"].includes(tabParam) ? tabParam : "sales";
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [totals, setTotals] = useState({ count: 0, revenue: 0 });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: courses } = await supabase.from("courses").select("id, title").eq("expert_id", user.id);
        const courseIds = (courses || []).map((c) => c.id);
        const courseTitleById = Object.fromEntries((courses || []).map((c) => [c.id, c.title]));

        let enrollmentSales: any[] = [];
        if (courseIds.length) {
          const { data } = await supabase
            .from("course_enrollments")
            .select("id, course_id, amount_paid, created_at, user_email, profiles(name, email)")
            .in("course_id", courseIds)
            .order("created_at", { ascending: false })
            .limit(40);
          enrollmentSales = (data || []).map((row: any) => ({
            id: row.id,
            label: courseTitleById[row.course_id] || "Course",
            buyer: row.profiles?.name || row.user_email || "Buyer",
            amount: Number(row.amount_paid) || 0,
            created_at: row.created_at,
            type: "Course",
          }));
        }

        const { data: apptData } = await supabase
          .from("appointments")
          .select("id, total_amount, created_at, status, user_id")
          .eq("expert_id", user.id)
          .in("status", ["confirmed", "completed", "pending"])
          .order("created_at", { ascending: false })
          .limit(40);

        const apptUserIds = Array.from(new Set((apptData || []).map((a: any) => a.user_id).filter(Boolean)));
        let apptProfiles: Record<string, { name?: string }> = {};
        if (apptUserIds.length) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", apptUserIds);
          profilesData?.forEach((p: any) => {
            apptProfiles[p.id] = p;
          });
        }

        const appointmentSales = (apptData || []).map((row: any) => ({
          id: row.id,
          label: "1-on-1 Appointment",
          buyer: apptProfiles[row.user_id]?.name || "Client",
          amount: Number(row.total_amount) || 0,
          created_at: row.created_at,
          type: "Appointment",
        }));

        const merged = [...enrollmentSales, ...appointmentSales].sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
        );
        setSales(merged);
        setTotals({
          count: merged.length,
          revenue: merged.reduce((sum, row) => sum + (row.amount || 0), 0),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, supabase]);

  const tabs: { id: EarningsTab; label: string }[] = [
    { id: "sales", label: "Sales" },
    { id: "balance", label: "Balance" },
    { id: "payouts", label: "Payout Settings" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Earnings & Payouts</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Track revenue</h1>
        <p className="mt-2 text-sm text-slate-400">Sales overview, balance snapshot, and Stripe payout settings.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/earnings?tab=${t.id}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-slate-100 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "sales" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Recent sales</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">{loading ? "…" : totals.count}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">Recorded revenue</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">
                {loading ? "…" : `$${totals.revenue.toFixed(2)}`}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            {loading ? (
              <div className="p-6 text-sm text-slate-400">Loading sales…</div>
            ) : sales.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">No sales recorded yet.</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Buyer</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((row) => (
                    <tr key={row.id} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-900">
                      <td className="px-4 py-3 text-slate-100">{row.label}</td>
                      <td className="px-4 py-3 text-slate-300">{row.buyer}</td>
                      <td className="px-4 py-3 text-slate-400">{row.type}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">${Number(row.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "balance" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">Balance snapshot</h2>
          <p className="text-sm text-slate-400">
            Sito records local enrollment and appointment totals. Your live Stripe available/pending balance lives in
            Stripe Connect.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Platform-recorded</p>
              <p className="mt-2 text-2xl font-bold text-slate-50">${totals.revenue.toFixed(2)}</p>
            </div>
            <Link
              href="/dashboard/earnings?tab=payouts"
              className="rounded-xl border border-slate-700 bg-slate-100 px-4 py-4 text-center text-sm font-semibold text-slate-950 hover:bg-white transition-colors"
            >
              Open payout settings
            </Link>
          </div>
        </div>
      )}

      {tab === "payouts" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-2">Payout settings</h2>
            <p className="text-sm text-slate-400 mb-6">
              Connect Stripe to receive payouts for paid products and appointments.
            </p>
            <StripeConnectOnboarding />
          </div>
          <Link href="/dashboard/stripe-connect" className="text-sm text-sky-400 hover:text-sky-300">
            Open classic Payment Setup page →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function EarningsPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <Suspense fallback={<div className="text-slate-400">Loading earnings…</div>}>
          <EarningsContent />
        </Suspense>
      </ExpertRoute>
    </DashboardLayout>
  );
}
