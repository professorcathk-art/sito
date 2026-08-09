"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { formatInTimeZone } from "@/lib/appointment-availability";

export interface AgendaBooking {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  total_amount?: number | null;
  rate_per_hour?: number | null;
  meeting_link?: string | null;
  user_id: string;
  client_name: string;
  client_email: string;
  client_avatar?: string | null;
  client_timezone?: string | null;
  intake?: Array<{ label: string; value: string }>;
}

interface BookingsAgendaProps {
  bookings: AgendaBooking[];
  expertTimezone: string;
  onRefresh: () => void;
  actingId: string | null;
  onAction: (id: string, action: "approve" | "add_meeting_link" | "mark_completed" | "cancel", meetingLink?: string) => Promise<void>;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function statusLabel(status: string): string {
  if (status === "pending") return "Pending payment / approval";
  if (status === "confirmed") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function BookingCard({
  booking,
  expertTimezone,
  actingId,
  onAction,
}: {
  booking: AgendaBooking;
  expertTimezone: string;
  actingId: string | null;
  onAction: BookingsAgendaProps["onAction"];
}) {
  const [openIntake, setOpenIntake] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(booking.meeting_link || "");
  const busy = actingId === booking.id;
  const clientTz = booking.client_timezone || "UTC";

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-slate-800">
          {booking.client_avatar ? (
            <Image src={booking.client_avatar} alt="" fill className="object-cover" sizes="44px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-300">
              {(booking.client_name || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-50">{booking.client_name}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[booking.status] || STATUS_STYLES.cancelled}`}
            >
              {statusLabel(booking.status)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-400">{booking.client_email}</p>
          <div className="mt-2 space-y-0.5 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Your time · </span>
              {formatInTimeZone(booking.start_time, expertTimezone)} –{" "}
              {formatInTimeZone(booking.end_time, expertTimezone, {
                weekday: undefined,
                month: undefined,
                day: undefined,
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              <span className="text-slate-500">({expertTimezone})</span>
            </p>
            <p className="text-slate-400">
              <span className="text-slate-500">Client · </span>
              {formatInTimeZone(booking.start_time, clientTz)}{" "}
              <span className="text-slate-500">({clientTz})</span>
            </p>
          </div>
        </div>
        {typeof booking.total_amount === "number" && (
          <p className="text-sm font-medium text-slate-200">
            {booking.total_amount === 0 ? "Free" : `$${booking.total_amount.toFixed(2)}`}
          </p>
        )}
      </div>

      {booking.intake && booking.intake.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setOpenIntake((v) => !v)}
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            {openIntake ? "Hide intake answers" : "View intake form"} ▾
          </button>
          {openIntake && (
            <dl className="mt-2 space-y-2 rounded-xl bg-slate-900/80 p-3 text-sm">
              {booking.intake.map((item, i) => (
                <div key={i}>
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="text-slate-200">{item.value || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {editingLink && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            disabled={busy || !linkDraft.trim()}
            onClick={() => onAction(booking.id, "add_meeting_link", linkDraft.trim())}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            Save link
          </button>
          <button
            type="button"
            onClick={() => setEditingLink(false)}
            className="rounded-lg px-3 py-2 text-sm text-slate-400"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {booking.status === "confirmed" && booking.meeting_link && (
          <a
            href={booking.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Join call
          </a>
        )}
        {booking.status === "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(booking.id, "approve")}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setLinkDraft(booking.meeting_link || "");
                setEditingLink(true);
              }}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              {booking.meeting_link ? "Edit meeting link" : "Add meeting link"}
            </button>
            {booking.status === "confirmed" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction(booking.id, "mark_completed")}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Mark completed
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Cancel this booking?")) onAction(booking.id, "cancel");
              }}
              className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/40"
            >
              Cancel booking
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function BookingsAgenda({
  bookings,
  expertTimezone,
  actingId,
  onAction,
}: BookingsAgendaProps) {
  const groups = useMemo(() => {
    const now = Date.now();
    const upcoming: AgendaBooking[] = [];
    const completed: AgendaBooking[] = [];
    const cancelled: AgendaBooking[] = [];

    for (const b of bookings) {
      if (b.status === "cancelled") {
        cancelled.push(b);
        continue;
      }
      if (b.status === "completed") {
        completed.push(b);
        continue;
      }
      const end = new Date(b.end_time).getTime();
      if (!isNaN(end) && end < now && b.status === "confirmed") {
        completed.push(b);
      } else {
        upcoming.push(b);
      }
    }

    const byStart = (a: AgendaBooking, b: AgendaBooking) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    upcoming.sort(byStart);
    completed.sort((a, b) => byStart(b, a));
    cancelled.sort((a, b) => byStart(b, a));
    return { upcoming, completed, cancelled };
  }, [bookings]);

  const sections: { key: string; title: string; items: AgendaBooking[] }[] = [
    { key: "upcoming", title: "Upcoming", items: groups.upcoming },
    { key: "completed", title: "Completed", items: groups.completed },
    { key: "cancelled", title: "Cancelled", items: groups.cancelled },
  ];

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-400">
        No bookings yet. Once clients book from your storefront, they appear here.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Bookings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Agenda of client sessions — approve, join calls, and manage meeting links.
        </p>
      </div>
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <section key={section.key}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.title} ({section.items.length})
            </h3>
            <div className="space-y-3">
              {section.items.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  expertTimezone={expertTimezone}
                  actingId={actingId}
                  onAction={onAction}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
