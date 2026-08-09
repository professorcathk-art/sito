"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  DEFAULT_AVAILABILITY_RULES,
  parseAvailabilityRules,
  type AvailabilityRules,
} from "@/lib/appointment-availability";
import { BookingsAgenda, type AgendaBooking } from "@/components/appointments/bookings-agenda";
import { AvailabilitySettings } from "@/components/appointments/availability-settings";
import {
  SessionSettings,
  type SessionSettingsForm,
} from "@/components/appointments/session-settings";

interface AppointmentHubProps {
  productId: string;
}

type HubTab = "bookings" | "availability" | "settings";

export function AppointmentHub({ productId }: AppointmentHubProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: HubTab =
    tabParam === "availability" || tabParam === "settings" || tabParam === "bookings"
      ? tabParam
      : "bookings";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [productName, setProductName] = useState("");
  const [sessionForm, setSessionForm] = useState<SessionSettingsForm>({
    name: "",
    description: "",
    whatToExpect: "",
    meetingLocation: "",
    price: "100",
    pricingType: "hourly",
  });
  const [rules, setRules] = useState<AvailabilityRules>({
    ...DEFAULT_AVAILABILITY_RULES,
    weekly: { ...DEFAULT_AVAILABILITY_RULES.weekly },
    dateOverrides: [],
  });
  const [bookings, setBookings] = useState<AgendaBooking[]>([]);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);

  const setTab = (tab: HubTab) => {
    router.replace(`/dashboard/appointments/${productId}?tab=${tab}`, { scroll: false });
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("expert_id", user.id)
        .single();
      if (productError) throw productError;
      if (productData.product_type !== "appointment") {
        router.replace(`/dashboard/elearning/${productId}`);
        return;
      }

      setProductName(productData.name || "Appointment");
      setSessionForm({
        name: productData.name || "",
        description: productData.description || "",
        whatToExpect: productData.what_to_expect || "",
        meetingLocation: productData.meeting_location || "",
        price: String(productData.price ?? 100),
        pricingType: productData.pricing_type === "one_time" ? "one_time" : "hourly",
      });
      setRules(parseAvailabilityRules(productData.availability_rules));

      const { data: bookingsData } = await supabase
        .from("appointments")
        .select(
          "id, status, created_at, start_time, end_time, total_amount, rate_per_hour, meeting_link, user_id, questionnaire_response_id, product_id"
        )
        .eq("expert_id", user.id)
        .or(`product_id.eq.${productId},product_id.is.null`)
        .in("status", ["pending", "confirmed", "completed", "cancelled"])
        .order("start_time", { ascending: false })
        .limit(100);

      const rows = bookingsData || [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      const responseIds = Array.from(
        new Set(rows.map((r) => r.questionnaire_response_id).filter(Boolean) as string[])
      );

      const profiles: Record<string, { name?: string; email?: string; avatar_url?: string }> = {};
      if (userIds.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", userIds);
        data?.forEach((p) => {
          profiles[p.id] = p;
        });
      }

      const intakeByResponse: Record<string, Array<{ label: string; value: string }>> = {};
      if (responseIds.length) {
        const { data: responses } = await supabase
          .from("questionnaire_responses")
          .select("id, responses, questionnaire_id")
          .in("id", responseIds);

        const qIds = Array.from(
          new Set((responses || []).map((r) => r.questionnaire_id).filter(Boolean))
        );
        const fieldLabels: Record<string, Record<string, string>> = {};
        if (qIds.length) {
          const { data: fields } = await supabase
            .from("questionnaire_fields")
            .select("id, label, questionnaire_id")
            .in("questionnaire_id", qIds);
          fields?.forEach((f) => {
            if (!fieldLabels[f.questionnaire_id]) fieldLabels[f.questionnaire_id] = {};
            fieldLabels[f.questionnaire_id][f.id] = f.label;
          });
        }

        (responses || []).forEach((r) => {
          const raw = r.responses as Record<string, string> | null;
          if (!raw || typeof raw !== "object") return;
          const labels = fieldLabels[r.questionnaire_id] || {};
          intakeByResponse[r.id] = Object.entries(raw).map(([key, value]) => ({
            label: labels[key] || key,
            value: String(value ?? ""),
          }));
        });
      }

      setBookings(
        rows.map((r) => ({
          id: r.id,
          status: r.status,
          start_time: r.start_time,
          end_time: r.end_time,
          total_amount: r.total_amount != null ? Number(r.total_amount) : null,
          rate_per_hour: r.rate_per_hour != null ? Number(r.rate_per_hour) : null,
          meeting_link: r.meeting_link,
          user_id: r.user_id,
          client_name: profiles[r.user_id]?.name || "Client",
          client_email: profiles[r.user_id]?.email || "—",
          client_avatar: profiles[r.user_id]?.avatar_url || null,
          intake: r.questionnaire_response_id
            ? intakeByResponse[r.questionnaire_response_id]
            : undefined,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointment hub");
    } finally {
      setLoading(false);
    }
  }, [user, productId, supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: Record<string, unknown> = {
        name: sessionForm.name.trim(),
        description: sessionForm.description,
        price: Number(sessionForm.price) || 0,
        pricing_type: sessionForm.pricingType,
        what_to_expect: sessionForm.whatToExpect || null,
        meeting_location: sessionForm.meetingLocation || null,
      };
      // tagline column may not exist everywhere
      const { error: updateError } = await supabase
        .from("products")
        .update(payload)
        .eq("id", productId);
      if (updateError) {
        // Retry without optional columns
        const { error: retryError } = await supabase
          .from("products")
          .update({
            name: sessionForm.name.trim(),
            description: sessionForm.description,
            price: Number(sessionForm.price) || 0,
            pricing_type: sessionForm.pricingType,
          })
          .eq("id", productId);
        if (retryError) throw retryError;
      }
      setSuccess("Appointment settings saved");
      setProductName(sessionForm.name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({ availability_rules: rules })
        .eq("id", productId);

      if (updateError) {
        // Column may not be migrated yet — still allow local UX with clear error
        throw new Error(
          updateError.message.includes("availability_rules")
            ? "Run migration 055_appointment_availability_rules.sql to enable weekly schedules."
            : updateError.message
        );
      }

      const syncRes = await fetch("/api/appointments/sync-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error || "Failed to sync slots");

      setLastSyncedCount(syncData.created ?? 0);
      setSuccess(`Availability saved · ${syncData.created ?? 0} open slots synced`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const handleBookingAction = async (
    id: string,
    action: "approve" | "add_meeting_link" | "mark_completed" | "cancel",
    meetingLink?: string
  ) => {
    setActingId(id);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, meeting_link: meetingLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setSuccess(
        action === "approve"
          ? "Booking confirmed"
          : action === "cancel"
            ? "Booking cancelled"
            : action === "mark_completed"
              ? "Marked completed"
              : "Meeting link updated"
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
        <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60" />
      </div>
    );
  }

  const tabs: { id: HubTab; label: string }[] = [
    { id: "bookings", label: "📅 Bookings & Calendar" },
    { id: "availability", label: "⏰ Manage Availability" },
    { id: "settings", label: "⚙️ Appointment Settings" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Appointment hub
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">{productName}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage bookings, recurring hours, and session pricing in one place.
          </p>
        </div>
        <Link
          href="/dashboard/appointments"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← All appointments
        </Link>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-slate-100 text-slate-950"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        {activeTab === "bookings" && (
          <BookingsAgenda
            bookings={bookings}
            expertTimezone={rules.timezone}
            actingId={actingId}
            onAction={handleBookingAction}
            onRefresh={load}
          />
        )}
        {activeTab === "availability" && (
          <AvailabilitySettings
            rules={rules}
            onChange={setRules}
            onSave={saveAvailability}
            saving={saving}
            lastSyncedCount={lastSyncedCount}
          />
        )}
        {activeTab === "settings" && (
          <SessionSettings
            form={sessionForm}
            onChange={setSessionForm}
            onSave={saveSettings}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
