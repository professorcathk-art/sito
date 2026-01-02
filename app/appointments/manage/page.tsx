"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  is_available: boolean;
}

export default function ManageAppointmentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startTime: "",
    endTime: "",
    ratePerHour: "100",
  });

  useEffect(() => {
    if (!user) return;
    fetchSlots();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlots = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("appointment_slots")
        .select("*")
        .eq("expert_id", user.id)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setSlots(data || []);
    } catch (err) {
      console.error("Error fetching appointment slots:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("appointment_slots").insert({
        expert_id: user.id,
        start_time: formData.startTime,
        end_time: formData.endTime,
        rate_per_hour: parseFloat(formData.ratePerHour),
        is_available: true,
      });

      if (error) throw error;
      setShowForm(false);
      setFormData({ startTime: "", endTime: "", ratePerHour: "100" });
      fetchSlots();
    } catch (err: any) {
      console.error("Error creating slot:", err);
      alert("Failed to create appointment slot. Please try again.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this appointment slot?")) return;

    try {
      const { error } = await supabase.from("appointment_slots").delete().eq("id", slotId);
      if (error) throw error;
      fetchSlots();
    } catch (err) {
      console.error("Error deleting slot:", err);
      alert("Failed to delete appointment slot.");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-custom-text">Manage Appointments</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              {showForm ? "Cancel" : "+ Add Time Slot"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateSlot} className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-custom-text mb-6">Create Appointment Slot</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Rate per Hour (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ratePerHour}
                    onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Create Slot
              </button>
            </form>
          )}

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-dark-green-800/50 rounded-lg"></div>
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
              <p className="text-custom-text/80 mb-4">No appointment slots created yet.</p>
              <p className="text-custom-text/60 text-sm">
                Create time slots to allow users to book 1-on-1 sessions with you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 flex items-center justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-custom-text mb-2">
                      {formatDateTime(slot.start_time)} - {formatDateTime(slot.end_time)}
                    </p>
                    <p className="text-custom-text/70">
                      ${slot.rate_per_hour}/hour •{" "}
                      {slot.is_available ? (
                        <span className="text-green-300">Available</span>
                      ) : (
                        <span className="text-red-300">Booked</span>
                      )}
                    </p>
                  </div>
                  {slot.is_available && (
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="px-4 py-2 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

