"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { RichTextEditor } from "@/components/rich-text-editor";

interface AppointmentHubProps {
  productId: string;
}

export function AppointmentHub({ productId }: AppointmentHubProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    whatToExpect: "",
    meetingLocation: "",
    defaultRate: "100",
  });
  const [slotForm, setSlotForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    intervalMinutes: "60",
    ratePerHour: "100",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
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
      setProduct(productData);
      setForm({
        name: productData.name || "",
        description: productData.description || "",
        whatToExpect: productData.what_to_expect || "",
        meetingLocation: productData.meeting_location || "",
        defaultRate: String(productData.price || 100),
      });

      const { data: slotsData } = await supabase
        .from("appointment_slots")
        .select("*")
        .eq("expert_id", user.id)
        .order("start_time", { ascending: true });
      setSlots(slotsData || []);

      const { data: bookingsData } = await supabase
        .from("appointments")
        .select("id, status, created_at, start_time, end_time, total_amount, rate_per_hour, user_id")
        .eq("expert_id", user.id)
        .in("status", ["pending", "confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(50);

      const rows = bookingsData || [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      let profiles: Record<string, { name?: string; email?: string }> = {};
      if (userIds.length) {
        const { data } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
        data?.forEach((p) => {
          profiles[p.id] = p;
        });
      }
      setBookings(
        rows.map((r) => ({
          ...r,
          client_name: profiles[r.user_id]?.name || "Client",
          client_email: profiles[r.user_id]?.email || "—",
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async () => {
    if (!product) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description,
        price: Number(form.defaultRate) || 0,
      };
      // Optional columns may not exist on all environments
      const { error: updateError } = await supabase.from("products").update(payload).eq("id", product.id);
      if (updateError) throw updateError;
      setSuccess("Session settings saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const createSlots = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const interval = Number(slotForm.intervalMinutes) || 60;
      const rate = Number(slotForm.ratePerHour) || 0;
      const [sh, sm] = slotForm.startTime.split(":").map(Number);
      const [eh, em] = slotForm.endTime.split(":").map(Number);
      const day = slotForm.date;
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      if (endMinutes <= startMinutes) throw new Error("End time must be after start time");

      const slotsToInsert = [];
      for (let m = startMinutes; m + interval <= endMinutes; m += interval) {
        const startH = Math.floor(m / 60);
        const startM = m % 60;
        const endTot = m + interval;
        const endH = Math.floor(endTot / 60);
        const endMin = endTot % 60;
        const startIso = new Date(`${day}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
        const endIso = new Date(`${day}T${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`);
        slotsToInsert.push({
          expert_id: user.id,
          start_time: startIso.toISOString(),
          end_time: endIso.toISOString(),
          rate_per_hour: rate,
          is_available: true,
        });
      }
      if (slotsToInsert.length === 0) throw new Error("No slots generated for this range");
      const { error: insertError } = await supabase.from("appointment_slots").insert(slotsToInsert);
      if (insertError) throw insertError;
      setSuccess(`Created ${slotsToInsert.length} slots`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create slots");
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    if (!confirm("Delete this slot?")) return;
    await supabase.from("appointment_slots").delete().eq("id", slotId);
    await load();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
        <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
        Appointment product not found.{" "}
        <Link href="/dashboard/appointments" className="text-sky-400">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <Link href="/dashboard/appointments" className="text-sm text-slate-400 hover:text-slate-200">
          ← Appointments
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">{product.name}</h1>
        <p className="mt-1 text-sm text-slate-400">Session settings, availability, and booking requests for this offering.</p>
      </header>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{success}</div>}

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-slate-50">1. Session settings</h2>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
          placeholder="Session title"
        />
        <div className="overflow-hidden rounded-xl border border-slate-700">
          <RichTextEditor content={form.description} onChange={(description) => setForm({ ...form, description })} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Default hourly rate (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.defaultRate}
            onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={saveSettings}
          className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          Save settings
        </button>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-slate-50">2. Availability calendar</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
          <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
          <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
          <select value={slotForm.intervalMinutes} onChange={(e) => setSlotForm({ ...slotForm, intervalMinutes: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100">
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
          <input type="number" min="0" value={slotForm.ratePerHour} onChange={(e) => setSlotForm({ ...slotForm, ratePerHour: e.target.value })} placeholder="$/hr" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
        </div>
        <button type="button" disabled={saving} onClick={createSlots} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
          Generate slots
        </button>
        <div className="space-y-2">
          {slots.length === 0 ? (
            <p className="text-sm text-slate-500">No availability slots yet.</p>
          ) : (
            slots.slice(0, 40).map((slot) => {
              const duration = Math.round((+new Date(slot.end_time) - +new Date(slot.start_time)) / 60000);
              return (
                <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
                  <div className="text-slate-200">
                    {new Date(slot.start_time).toLocaleString()} · {duration} min · ${slot.rate_per_hour}/hr
                    {!slot.is_available && <span className="ml-2 text-amber-300">Booked</span>}
                  </div>
                  <button type="button" onClick={() => deleteSlot(slot.id)} className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </div>
              );
            })
          )}
        </div>
        <Link href="/appointments/manage" className="inline-block text-sm text-sky-400 hover:text-sky-300">
          Open classic appointments manager →
        </Link>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-slate-50">3. Booking requests</h2>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          {bookings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No booking requests yet.</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-800/70 last:border-0">
                    <td className="px-4 py-3 text-slate-100">{b.client_name}</td>
                    <td className="px-4 py-3 text-slate-300">{b.client_email}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(b.start_time).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-200">${Number(b.total_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 capitalize text-slate-300">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
