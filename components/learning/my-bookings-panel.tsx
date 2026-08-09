"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatInTimeZone } from "@/lib/appointment-availability";

interface MyBooking {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  meeting_link?: string | null;
  expert_id: string;
  expert_name: string;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  completed: "bg-sky-500/15 text-sky-300",
  cancelled: "bg-slate-500/15 text-slate-400",
};

export function MyBookingsPanel() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [error, setError] = useState("");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("appointments")
          .select("id, status, start_time, end_time, meeting_link, expert_id")
          .eq("user_id", user.id)
          .order("start_time", { ascending: false })
          .limit(50);
        if (fetchError) throw fetchError;

        const rows = data || [];
        const expertIds = Array.from(new Set(rows.map((r) => r.expert_id)));
        const names: Record<string, string> = {};
        if (expertIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", expertIds);
          profiles?.forEach((p) => {
            names[p.id] = p.name || "Expert";
          });
        }

        setBookings(
          rows.map((r) => ({
            ...r,
            expert_name: names[r.expert_id] || "Expert",
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, supabase]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          My Learning
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">My Bookings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sessions you booked with experts. Times shown in {tz}.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-400">
          No bookings yet.{" "}
          <Link href="/directory" className="text-sky-400 hover:underline">
            Find an expert
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <article
              key={b.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-50">{b.expert_name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[b.status] || STATUS_STYLES.cancelled}`}
                  >
                    {b.status === "pending" ? "Pending" : b.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {formatInTimeZone(b.start_time, tz)}
                </p>
              </div>
              <div className="flex gap-2">
                {b.status === "confirmed" && b.meeting_link && (
                  <a
                    href={b.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    Join call
                  </a>
                )}
                <Link
                  href={`/expert/${b.expert_id}`}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  View expert
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
