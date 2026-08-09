"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AdminPayoutsPanel } from "@/components/admin-payouts-panel";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function AdminPayoutsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function check() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(!!data?.is_admin);
      setLoading(false);
    }
    check();
  }, [user, supabase]);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="text-slate-400 text-sm">Checking access…</div>
      ) : !isAdmin ? (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-6 text-red-200">
          Access denied.
        </div>
      ) : (
        <div className="space-y-4">
          <Link href="/admin" className="text-sm text-sky-400 hover:text-sky-300">
            ← Back to admin
          </Link>
          <AdminPayoutsPanel />
        </div>
      )}
    </DashboardLayout>
  );
}
