"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { CalendarView } from "@/components/calendar-view";

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  rate_per_hour: number;
  is_available: boolean;
}

interface BookedAppointment {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  total_amount: number;
  status: string;
  profiles: {
    name: string;
    email: string;
  };
}

export default function ManageAppointmentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"slots" | "bookings">("slots");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    intervalMinutes: "60",
    ratePerHour: "100",
  });

  useEffect(() => {
    if (!user) return;
    fetchSlots();
    fetchBookedAppointments();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBookedAppointments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("expert_id", user.id)
        .order("start_time", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = Array.from(new Set((data || []).map((apt: any) => apt.user_id)));
      let profileMap: { [key: string]: { name: string; email: string } } = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profileMap[profile.id] = {
              name: profile.name || "Unknown",
              email: profile.email || "N/A",
            };
          });
        }
      }

      const appointments = (data || []).map((apt: any) => ({
        id: apt.id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        rate_per_hour: apt.rate_per_hour,
        total_amount: apt.total_amount,
        status: apt.status,
        profiles: profileMap[apt.user_id] || { name: "Unknown", email: "N/A" },
      }));

      setBookedAppointments(appointments);
    } catch (err) {
      console.error("Error fetching booked appointments:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

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

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const date = formData.date;
      const startTime = formData.startTime;
      const endTime = formData.endTime;
      const intervalMinutes = parseInt(formData.intervalMinutes);
      const ratePerHour = parseFloat(formData.ratePerHour);

      // Combine date with start and end times
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (endDateTime <= startDateTime) {
        alert("End time must be after start time");
        return;
      }

      // Generate slots based on interval
      const slots = [];
      let currentTime = new Date(startDateTime);

      while (currentTime < endDateTime) {
        const slotEnd = new Date(currentTime.getTime() + intervalMinutes * 60000);
        
        // Don't create a slot if it would exceed the end time
        if (slotEnd > endDateTime) break;

        slots.push({
          expert_id: user.id,
          start_time: currentTime.toISOString(),
          end_time: slotEnd.toISOString(),
          rate_per_hour: ratePerHour,
          is_available: true,
        });

        currentTime = slotEnd;
      }

      if (slots.length === 0) {
        alert("No slots could be created with the given time range and interval.");
        return;
      }

      const { error } = await supabase.from("appointment_slots").insert(slots);

      if (error) throw error;
      
      setShowForm(false);
      setFormData({ 
        date: "",
        startTime: "", 
        endTime: "", 
        intervalMinutes: "60",
        ratePerHour: "100" 
      });
      fetchSlots();
      alert(`Successfully created ${slots.length} appointment slot(s)!`);
    } catch (err: any) {
      console.error("Error creating slots:", err);
      alert("Failed to create appointment slots. Please try again.");
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
            <Link
              href="/products"
              className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              Create Timeslots from Products
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-cyber-green/30 mb-6">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === "bookings"
                  ? "text-cyber-green border-b-2 border-cyber-green"
                  : "text-custom-text/70 hover:text-custom-text"
              }`}
            >
              Booked Appointments ({bookedAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab("slots")}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === "slots"
                  ? "text-cyber-green border-b-2 border-cyber-green"
                  : "text-custom-text/70 hover:text-custom-text"
              }`}
            >
              Available Timeslots ({slots.filter(s => s.is_available).length})
            </button>
          </div>

          {/* Booked Appointments Section */}
          {activeTab === "bookings" && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-custom-text mb-6">Booked Appointments</h2>
            {loadingBookings ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-dark-green-800/50 rounded-lg"></div>
                ))}
              </div>
            ) : bookedAppointments.length === 0 ? (
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
                <p className="text-custom-text/80 mb-4">No appointments booked yet.</p>
                <p className="text-custom-text/60 text-sm">
                  Users will see your available slots and book them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-custom-text mb-2">
                          {formatDateTime(appointment.start_time)} - {formatDateTime(appointment.end_time)}
                        </p>
                        <p className="text-custom-text/70 mb-1">
                          Booked by: {appointment.profiles?.name || "N/A"} ({appointment.profiles?.email || "N/A"})
                        </p>
                        <p className="text-custom-text/70">
                          ${appointment.rate_per_hour}/hour • Total: ${appointment.total_amount.toFixed(2)} • Status: {appointment.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Available Timeslots Section */}
          {activeTab === "slots" && (
            <div>
              <h2 className="text-2xl font-bold text-custom-text mb-6">Available Timeslots</h2>
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
                <>
                  <CalendarView
                    slots={slots}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                    }}
                    onSlotToggle={async (slotId, isAvailable) => {
                      try {
                        const { error } = await supabase
                          .from("appointment_slots")
                          .update({ is_available: isAvailable })
                          .eq("id", slotId)
                          .eq("expert_id", user?.id);
                        if (error) throw error;
                        fetchSlots();
                      } catch (err) {
                        console.error("Error toggling slot:", err);
                        alert("Failed to update slot availability.");
                      }
                    }}
                    showToggle={true}
                  />
                  
                  {/* Show slots for selected date */}
                  {selectedDate && slots.filter(s => {
                    const slotDate = new Date(s.start_time);
                    const dateStr = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}`;
                    return dateStr === selectedDate;
                  }).length > 0 && (
                    <div className="mt-6 bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-custom-text mb-4">
                        Timeslots for {(() => {
                          const [year, month, day] = selectedDate.split('-').map(Number);
                          const displayDate = new Date(year, month - 1, day);
                          return displayDate.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          });
                        })()}
                      </h3>
                      <div className="space-y-3">
                        {slots
                          .filter(s => {
                            const slotDate = new Date(s.start_time);
                            const dateStr = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}`;
                            return dateStr === selectedDate;
                          })
                          .map((slot) => {
                            const startTime = new Date(slot.start_time).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            });
                            const endTime = new Date(slot.end_time).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            });
                            const duration = slot.duration_minutes || Math.round((new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / 60000);

                            return (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between p-4 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg"
                              >
                                <div>
                                  <p className="text-custom-text font-semibold">
                                    {startTime} - {endTime}
                                  </p>
                                  <p className="text-sm text-custom-text/70">
                                    ${slot.rate_per_hour}/hour • {duration} min •{" "}
                                    {slot.is_available ? (
                                      <span className="text-green-300">Available</span>
                                    ) : (
                                      <span className="text-red-300">Unavailable</span>
                                    )}
                                  </p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={slot.is_available}
                                    onChange={(e) => {
                                      supabase
                                        .from("appointment_slots")
                                        .update({ is_available: e.target.checked })
                                        .eq("id", slot.id)
                                        .eq("expert_id", user?.id)
                                        .then(() => fetchSlots());
                                    }}
                                    className="w-5 h-5 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-custom-text">Available</span>
                                </label>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {false && showForm && (
            <form onSubmit={handleCreateSlots} className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-custom-text mb-6">Create Appointment Slots</h2>
              <p className="text-custom-text/70 mb-6 text-sm">
                Set a time range and interval, and the system will automatically create multiple booking slots for you.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
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
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Session Duration (minutes) *
                  </label>
                  <select
                    value={formData.intervalMinutes}
                    onChange={(e) => setFormData({ ...formData, intervalMinutes: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Rate per Hour (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.ratePerHour}
                  onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                  className="w-full max-w-xs px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Create Slots
              </button>
            </form>
          )}

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

