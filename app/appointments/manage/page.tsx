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
  product_id?: string | null;
  products?: {
    id: string;
    name: string;
  } | null;
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
  const [myBookings, setMyBookings] = useState<BookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingMyBookings, setLoadingMyBookings] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"slots" | "bookings" | "my-bookings">("slots");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    intervalMinutes: "60",
    ratePerHour: "100",
    productId: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchSlots();
    fetchBookedAppointments();
    fetchMyBookings();
    fetchProducts();
    
    // Check if we should show "My Bookings" tab (from success page redirect)
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "my-bookings") {
      setActiveTab("my-bookings");
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("expert_id", user.id)
        .eq("product_type", "appointment")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

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
        payment_intent_id: apt.payment_intent_id,
        profiles: profileMap[apt.user_id] || { name: "Unknown", email: "N/A" },
      }));

      setBookedAppointments(appointments);
    } catch (err) {
      console.error("Error fetching booked appointments:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return;

    try {
      // Fetch appointments first
      const { data: appointmentsData, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for the expert_ids
      const expertIds = Array.from(new Set((appointmentsData || []).map((apt: any) => apt.expert_id).filter(Boolean)));
      let profilesMap: Record<string, { id: string; name: string; title: string | null; email: string }> = {};
      
      if (expertIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, title, email")
          .in("id", expertIds);
        
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const appointments = (appointmentsData || []).map((apt: any) => ({
        id: apt.id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        rate_per_hour: apt.rate_per_hour,
        total_amount: apt.total_amount,
        status: apt.status,
        payment_intent_id: apt.payment_intent_id,
        profiles: profilesMap[apt.expert_id] ? {
          name: profilesMap[apt.expert_id].name || "Unknown Expert",
          email: profilesMap[apt.expert_id].email || "N/A",
        } : { name: "Unknown Expert", email: "N/A" },
      }));

      setMyBookings(appointments);
    } catch (err) {
      console.error("Error fetching my bookings:", err);
    } finally {
      setLoadingMyBookings(false);
    }
  };

  const fetchSlots = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Fetch ALL slots for this expert (including booked ones for calendar view)
      // Fetch slots first, then fetch products separately to avoid relationship ambiguity
      const { data: slotsData, error } = await supabase
        .from("appointment_slots")
        .select("*")
        .eq("expert_id", user.id)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching slots:", error);
        throw error;
      }
      
      // Fetch products separately for slots that have product_id
      const productIds = Array.from(new Set((slotsData || []).map((s: any) => s.product_id).filter(Boolean)));
      let productsMap: Record<string, { id: string; name: string }> = {};
      
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);
        
        if (productsData) {
          productsData.forEach((p: any) => {
            productsMap[p.id] = p;
          });
        }
      }
      
      // Combine slots with product data
      const data = (slotsData || []).map((slot: any) => ({
        ...slot,
        products: slot.product_id ? productsMap[slot.product_id] || null : null,
      }));
      
      console.log(`📅 Fetched ${data?.length || 0} slots for expert ${user.id}`);
      console.log("Slots data:", data);
      
      // Also check which slots are booked and mark them as unavailable
      const { data: bookedSlots } = await supabase
        .from("appointments")
        .select("appointment_slot_id")
        .eq("expert_id", user.id)
        .in("status", ["confirmed", "pending"]);
      
      const bookedSlotIds = new Set((bookedSlots || []).map((apt: any) => apt.appointment_slot_id).filter(Boolean));
      
      // Update slots to mark booked ones as unavailable
      const slotsWithStatus = (data || []).map((slot: any) => ({
        ...slot,
        is_available: slot.is_available && !bookedSlotIds.has(slot.id),
      }));
      
      console.log(`✅ Setting ${slotsWithStatus.length} slots (${slotsWithStatus.filter(s => s.is_available).length} available)`);
      setSlots(slotsWithStatus);
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
          product_id: formData.productId || null,
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
        ratePerHour: "100",
        productId: "",
      });
      setSelectedProductId(null);
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
            <button
              onClick={() => {
                if (products.length === 0) {
                  alert("Please create an appointment product first in the Products page.");
                  return;
                }
                setShowForm(true);
                if (products.length === 1) {
                  setFormData({ ...formData, productId: products[0].id });
                  setSelectedProductId(products[0].id);
                }
              }}
              className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              Add Timeslots
            </button>
          </div>

          {/* Add Appointment Slots Form - Show at top */}
          {showForm && (
            <form onSubmit={handleCreateSlots} className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-custom-text">Add Appointment Slots</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      date: "",
                      startTime: "",
                      endTime: "",
                      intervalMinutes: "60",
                      ratePerHour: "100",
                      productId: "",
                    });
                    setSelectedProductId(null);
                  }}
                  className="text-custom-text/60 hover:text-custom-text"
                >
                  ✕
                </button>
              </div>
              <p className="text-custom-text/70 mb-6 text-sm">
                Set a time range and interval, and the system will automatically create multiple booking slots for you.
              </p>
              
              {products.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Product *
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => {
                      setFormData({ ...formData, productId: e.target.value });
                      setSelectedProductId(e.target.value);
                    }}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    required
                  >
                    <option value="">Select a product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-100"
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
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-100"
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
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-100"
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
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                >
                  Create Slots
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      date: "",
                      startTime: "",
                      endTime: "",
                      intervalMinutes: "60",
                      ratePerHour: "100",
                      productId: "",
                    });
                    setSelectedProductId(null);
                  }}
                  className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Tabs */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 border-b border-cyber-green/30 mb-6 scrollbar-hide">
            <div className="flex gap-2 sm:gap-4 min-w-max">
              <button
                onClick={() => setActiveTab("my-bookings")}
                className={`px-3 sm:px-4 py-2 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "my-bookings"
                    ? "text-cyber-green border-b-2 border-cyber-green"
                    : "text-custom-text/70 hover:text-custom-text"
                }`}
              >
                My Bookings ({myBookings.length})
              </button>
              <button
                onClick={() => setActiveTab("bookings")}
                className={`px-3 sm:px-4 py-2 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "bookings"
                    ? "text-cyber-green border-b-2 border-cyber-green"
                    : "text-custom-text/70 hover:text-custom-text"
                }`}
              >
                Booked with Me ({bookedAppointments.length})
              </button>
              <button
                onClick={() => setActiveTab("slots")}
                className={`px-3 sm:px-4 py-2 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "slots"
                    ? "text-cyber-green border-b-2 border-cyber-green"
                    : "text-custom-text/70 hover:text-custom-text"
                }`}
              >
                Available Timeslots ({slots.filter(s => s.is_available).length})
              </button>
            </div>
          </div>

          {/* My Bookings Section */}
          {activeTab === "my-bookings" && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-custom-text mb-6">My Bookings</h2>
              {loadingMyBookings ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-dark-green-800/50 rounded-lg"></div>
                  ))}
                </div>
              ) : myBookings.length === 0 ? (
                <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
                  <p className="text-custom-text/80 mb-4">You haven&apos;t booked any appointments yet.</p>
                  <p className="text-custom-text/60 text-sm">
                    Browse experts and book appointments to see them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((appointment) => (
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
                            Expert: {appointment.profiles?.name || "Unknown Expert"} ({appointment.profiles?.email || "N/A"})
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
                  <p className="text-custom-text/60 text-sm mb-4">
                    Create time slots to allow users to book 1-on-1 sessions with you.
                  </p>
                  <button
                    onClick={() => {
                      fetchSlots();
                      fetchProducts();
                    }}
                    className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-sm"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-xs text-yellow-200">
                      <p>Debug: Found {slots.length} total slots</p>
                      <p>Products: {products.length}</p>
                      <p>Slots with product_id: {slots.filter(s => s.product_id).length}</p>
                      <p>Slots without product_id: {slots.filter(s => !s.product_id).length}</p>
                    </div>
                  )}
                  
                  {/* Group slots by product */}
                  <div className="mb-6 space-y-6">
                    {/* Show slots grouped by product */}
                    {products.length > 0 && products.map((product) => {
                      const productSlots = slots.filter(s => s.product_id === product.id);
                      if (productSlots.length === 0) return null;
                      
                      return (
                        <div key={product.id} className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                          <h3 className="text-xl font-bold text-custom-text mb-4">{product.name}</h3>
                          <CalendarView
                            slots={productSlots}
                            onDateSelect={(date) => {
                              setSelectedDate(date);
                              setSelectedProductId(product.id);
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
                            hideSlotsDisplay={true}
                          />
                          <div className="mt-4">
                            <button
                              onClick={() => {
                                setShowForm(true);
                                setFormData({ ...formData, productId: product.id });
                                setSelectedProductId(product.id);
                              }}
                              className="px-4 py-2 bg-blue-900/30 text-blue-200 border border-blue-500/50 rounded-lg hover:bg-blue-900/50 transition-colors text-sm"
                            >
                              + Add Timeslots for {product.name}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show slots with product info from join (even if product not in products array) */}
                    {(() => {
                      const slotsWithProducts = slots.filter(s => s.product_id && s.products);
                      const displayedProductIds = new Set(products.map(p => p.id));
                      const additionalSlots = slotsWithProducts.filter(s => !displayedProductIds.has(s.product_id!));
                      
                      if (additionalSlots.length === 0) return null;
                      
                      // Group by product
                      const groupedByProduct: Record<string, typeof additionalSlots> = {};
                      additionalSlots.forEach(slot => {
                        const productId = slot.product_id!;
                        if (!groupedByProduct[productId]) {
                          groupedByProduct[productId] = [];
                        }
                        groupedByProduct[productId].push(slot);
                      });
                      
                      return Object.entries(groupedByProduct).map(([productId, productSlots]) => {
                        const productName = productSlots[0]?.products?.name || "Unknown Product";
                        return (
                          <div key={productId} className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-custom-text mb-4">{productName}</h3>
                            <CalendarView
                              slots={productSlots}
                              onDateSelect={(date) => {
                                setSelectedDate(date);
                                setSelectedProductId(productId);
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
                              hideSlotsDisplay={true}
                            />
                            <div className="mt-4">
                              <button
                                onClick={() => {
                                  setShowForm(true);
                                  setFormData({ ...formData, productId: productId });
                                  setSelectedProductId(productId);
                                }}
                                className="px-4 py-2 bg-blue-900/30 text-blue-200 border border-blue-500/50 rounded-lg hover:bg-blue-900/50 transition-colors text-sm"
                              >
                                + Add Timeslots for {productName}
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* Show unlinked slots */}
                    {slots.filter(s => !s.product_id).length > 0 && (
                      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                        <h3 className="text-xl font-bold text-custom-text mb-4">Unlinked Timeslots</h3>
                        <CalendarView
                          slots={slots.filter(s => !s.product_id)}
                          onDateSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedProductId(null);
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
                          hideSlotsDisplay={true}
                        />
                      </div>
                    )}
                    
                    {/* FALLBACK: Show ALL slots if none were displayed above */}
                    {(() => {
                      const displayedSlots = new Set([
                        ...(products.length > 0 ? products.flatMap(p => slots.filter(s => s.product_id === p.id).map(s => s.id)) : []),
                        ...slots.filter(s => s.product_id && s.products).map(s => s.id),
                        ...slots.filter(s => !s.product_id).map(s => s.id),
                      ]);
                      const undisplayedSlots = slots.filter(s => !displayedSlots.has(s.id));
                      
                      if (undisplayedSlots.length === 0) return null;
                      
                      console.warn(`⚠️ Found ${undisplayedSlots.length} slots that were not displayed!`);
                      return (
                        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
                          <h3 className="text-xl font-bold text-custom-text mb-4">All Timeslots (Fallback Display)</h3>
                          <p className="text-sm text-red-200 mb-4">
                            Showing {undisplayedSlots.length} slot(s) that were not grouped properly
                          </p>
                          <CalendarView
                            slots={undisplayedSlots}
                            onDateSelect={(date) => {
                              setSelectedDate(date);
                              setSelectedProductId(null);
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
                            hideSlotsDisplay={true}
                          />
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Show slots for selected date */}
                  {selectedDate && slots.filter(s => {
                    const slotDate = new Date(s.start_time);
                    const dateStr = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}`;
                    return dateStr === selectedDate && (selectedProductId ? s.product_id === selectedProductId : true);
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
                        {selectedProductId && products.find(p => p.id === selectedProductId) && (
                          <span className="text-lg text-custom-text/70 ml-2">
                            - {products.find(p => p.id === selectedProductId)?.name}
                          </span>
                        )}
                      </h3>
                      <div className="space-y-3">
                        {slots
                          .filter(s => {
                            const slotDate = new Date(s.start_time);
                            const dateStr = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}`;
                            return dateStr === selectedDate && (selectedProductId ? s.product_id === selectedProductId : true);
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
                                    {slot.products && (
                                      <span className="ml-2 text-xs text-custom-text/60">
                                        ({slot.products.name})
                                      </span>
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


        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

