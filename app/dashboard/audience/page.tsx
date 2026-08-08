"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

type AudienceTab = "overview" | "leads" | "students" | "bookings";

function AudienceContent() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as AudienceTab | null) || "overview";
  const tab: AudienceTab = ["overview", "leads", "students", "bookings"].includes(tabParam)
    ? tabParam
    : "overview";

  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const { data: products } = await supabase
          .from("products")
          .select("id, name")
          .eq("expert_id", user.id);

        const productIds = (products || []).map((p) => p.id);
        const productNameById = Object.fromEntries((products || []).map((p) => [p.id, p.name]));

        const { data: courses } = await supabase
          .from("courses")
          .select("id, title")
          .eq("expert_id", user.id);
        const courseIds = (courses || []).map((c) => c.id);
        const courseTitleById = Object.fromEntries((courses || []).map((c) => [c.id, c.title]));

        const [interestsRes, enrollmentsRes, bookingsRes] = await Promise.all([
          productIds.length
            ? supabase
                .from("product_interests")
                .select("id, product_id, user_id, user_email, created_at")
                .in("product_id", productIds)
                .order("created_at", { ascending: false })
                .limit(50)
            : Promise.resolve({ data: [] as any[] }),
          courseIds.length
            ? supabase
                .from("course_enrollments")
                .select("id, course_id, user_id, user_email, created_at, amount_paid")
                .in("course_id", courseIds)
                .order("created_at", { ascending: false })
                .limit(50)
            : Promise.resolve({ data: [] as any[] }),
          supabase
            .from("appointments")
            .select("id, status, created_at, start_time, user_id")
            .eq("expert_id", user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        // Prefer expert_id column (migration 054); fall back to subject token scoping
        let contactRows: any[] = [];
        const byColumn = await supabase
          .from("contact_messages")
          .select("id, name, email, subject, message, created_at, expert_id")
          .eq("expert_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        if (!byColumn.error && byColumn.data) {
          contactRows = byColumn.data;
        } else {
          const bySubject = await supabase
            .from("contact_messages")
            .select("id, name, email, subject, message, created_at")
            .ilike("subject", `%Storefront lead [${user.id}]%`)
            .order("created_at", { ascending: false })
            .limit(30);
          contactRows = bySubject.data || [];
        }

        const interestRows = interestsRes.data || [];
        const enrollmentRows = enrollmentsRes.data || [];
        const profileIds = Array.from(
          new Set(
            [...interestRows, ...enrollmentRows]
              .map((row: any) => row.user_id)
              .filter(Boolean)
          )
        );
        let profileMap: Record<string, { name?: string; email?: string }> = {};
        if (profileIds.length) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", profileIds);
          profilesData?.forEach((p: any) => {
            profileMap[p.id] = p;
          });
        }

        const interestLeads = interestRows.map((row: any) => ({
          id: `interest-${row.id}`,
          source: "Product interest",
          name: profileMap[row.user_id]?.name || row.user_email?.split("@")[0] || "Lead",
          email: profileMap[row.user_id]?.email || row.user_email || "—",
          detail: productNameById[row.product_id] || "Product",
          created_at: row.created_at,
        }));

        const storefrontLeads = contactRows.map((row: any) => ({
          id: `contact-${row.id}`,
          source: "Storefront lead magnet",
          name: row.name || "Lead",
          email: row.email || "—",
          detail: String(row.subject || "Lead magnet").replace(`Storefront lead [${user.id}]: `, "") || "Lead magnet",
          created_at: row.created_at,
        }));

        setLeads([...interestLeads, ...storefrontLeads].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
        setStudents(
          enrollmentRows.map((row: any) => ({
            id: row.id,
            name: profileMap[row.user_id]?.name || row.user_email?.split("@")[0] || "Student",
            email: profileMap[row.user_id]?.email || row.user_email || "—",
            course: courseTitleById[row.course_id] || "Course",
            amount: row.amount_paid,
            created_at: row.created_at,
          }))
        );

        const bookingRows = bookingsRes.data || [];
        const bookingUserIds = Array.from(new Set(bookingRows.map((b: any) => b.user_id).filter(Boolean)));
        let bookingProfiles: Record<string, { name?: string; email?: string }> = {};
        if (bookingUserIds.length) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", bookingUserIds);
          profilesData?.forEach((p: any) => {
            bookingProfiles[p.id] = p;
          });
        }
        setBookings(
          bookingRows.map((row: any) => ({
            id: row.id,
            name: bookingProfiles[row.user_id]?.name || "Client",
            email: bookingProfiles[row.user_id]?.email || "—",
            start: row.start_time,
            status: row.status,
            created_at: row.created_at,
          }))
        );
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load audience");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, supabase]);

  const stats = useMemo(
    () => [
      { label: "Leads", value: leads.length, href: "/dashboard/audience?tab=leads" },
      { label: "Students", value: students.length, href: "/dashboard/audience?tab=students" },
      { label: "Booking requests", value: bookings.length, href: "/dashboard/audience?tab=bookings" },
    ],
    [leads.length, students.length, bookings.length]
  );

  const tabs: { id: AudienceTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "leads", label: "Leads" },
    { id: "students", label: "Enrolled Students" },
    { id: "bookings", label: "Booking Requests" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audience</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Know your community</h1>
        <p className="mt-2 text-sm text-slate-400">Leads, enrolled students, and booking requests in one place.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "overview" ? "/dashboard/audience" : `/dashboard/audience?tab=${t.id}`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-slate-100 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-2xl bg-slate-900 border border-slate-800" />
          <div className="h-48 rounded-2xl bg-slate-900 border border-slate-800" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {!loading && !error && tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition-all hover:border-slate-600 hover:bg-slate-900"
            >
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-50">{s.value}</p>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && tab === "leads" && (
        <AudienceTable
          empty="No leads yet. Share your storefront lead magnet or products."
          rows={leads.map((l) => [l.name, l.email, l.source, l.detail, formatDate(l.created_at)])}
          headers={["Name", "Email", "Source", "Detail", "Date"]}
        />
      )}

      {!loading && !error && tab === "students" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link href="/courses/manage" className="text-sm font-medium text-sky-400 hover:text-sky-300">
              Manage in Classroom →
            </Link>
          </div>
          <AudienceTable
            empty="No enrolled students yet."
            rows={students.map((s) => [s.name, s.email, s.course, s.amount != null ? `$${s.amount}` : "—", formatDate(s.created_at)])}
            headers={["Name", "Email", "Course", "Paid", "Date"]}
          />
        </div>
      )}

      {!loading && !error && tab === "bookings" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link href="/appointments/manage?tab=bookings" className="text-sm font-medium text-sky-400 hover:text-sky-300">
              Open Appointments →
            </Link>
          </div>
          <AudienceTable
            empty="No pending booking requests."
            rows={bookings.map((b) => [b.name, b.email, b.start ? formatDate(b.start) : "—", b.status, formatDate(b.created_at)])}
            headers={["Client", "Email", "Slot", "Status", "Requested"]}
          />
        </div>
      )}
    </div>
  );
}

function AudienceTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-400">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-800/80 last:border-0 hover:bg-slate-900">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AudiencePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-slate-400">Loading audience…</div>}>
        <AudienceContent />
      </Suspense>
    </DashboardLayout>
  );
}
