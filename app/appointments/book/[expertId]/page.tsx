"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { CalendarView } from "@/components/calendar-view";

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  is_available: boolean;
  expert: {
    id: string;
    name: string;
    title: string | null;
  };
}

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;
  const { user } = useAuth();
  const supabase = createClient();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [expert, setExpert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [expertId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      // Fetch expert info
      const { data: expertData } = await supabase
        .from("profiles")
        .select("id, name, title")
        .eq("id", expertId)
        .single();

      setExpert(expertData);

              // Fetch available appointment slots (including those linked to products)
              const { data: slotsData, error } = await supabase
                .from("appointment_slots")
                .select("id, start_time, end_time, rate_per_hour, product_id, is_available")
                .eq("expert_id", expertId)
                .eq("is_available", true)
                .gte("start_time", new Date().toISOString())
                .order("start_time", { ascending: true });

      if (error) throw error;

      // Fetch expert profile separately
      const { data: expertProfile } = await supabase
        .from("profiles")
        .select("id, name, title")
        .eq("id", expertId)
        .single();

      setSlots(
        (slotsData || []).map((slot: any) => ({
          id: slot.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          rate_per_hour: slot.rate_per_hour,
          is_available: slot.is_available !== false,
          expert: expertProfile || { id: expertId, name: "Expert", title: null },
        }))
      );
    } catch (err) {
      console.error("Error fetching appointment slots:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
    return Math.max(0, duration); // Ensure non-negative
  };

  const calculateTotal = (ratePerHour: number, durationMinutes: number): number => {
    if (durationMinutes <= 0) return 0;
    return (ratePerHour / 60) * durationMinutes;
  };

  const handleBookAppointment = async (slot: AppointmentSlot) => {
    if (!user) {
      router.push(`/login?redirect=/appointments/book/${expertId}`);
      return;
    }

    if (user.id === expertId) {
      alert("You cannot book an appointment with yourself");
      return;
    }

    if (!confirm(`Book appointment for $${calculateTotal(slot.rate_per_hour, calculateDuration(slot.start_time, slot.end_time)).toFixed(2)}?`)) {
      return;
    }

    setBooking(true);
    try {
      const duration = calculateDuration(slot.start_time, slot.end_time);
      const totalAmount = calculateTotal(slot.rate_per_hour, duration);

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          expert_id: expertId,
          user_id: user.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration_minutes: duration,
          rate_per_hour: slot.rate_per_hour,
          total_amount: totalAmount,
          status: "pending",
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Mark slot as unavailable
      await supabase
        .from("appointment_slots")
        .update({ is_available: false })
        .eq("id", slot.id);

      alert("Appointment booked successfully! The expert will be notified.");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error booking appointment:", err);
      alert("Failed to book appointment. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-custom-bg">
        <Navigation />
        <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link
              href={`/expert/${expertId}`}
              className="text-cyber-green hover:text-cyber-green-light mb-4 inline-block"
            >
              ← Back to Expert Profile
            </Link>

            <h1 className="text-4xl font-bold text-custom-text mb-2">
              Book Appointment with {expert?.name || "Expert"}
            </h1>
            {expert?.title && (
              <p className="text-custom-text/70 mb-8">{expert.title}</p>
            )}

            {!user && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 mb-2">Please sign in to book an appointment</p>
                <Link
                  href={`/login?redirect=/appointments/book/${expertId}`}
                  className="text-cyber-green hover:text-cyber-green-light font-semibold"
                >
                  Sign In →
                </Link>
              </div>
            )}

            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-dark-green-800/50 rounded-lg"></div>
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
                <p className="text-custom-text/80 mb-4">
                  No available appointment slots at this time.
                </p>
                <Link
                  href={`/expert/${expertId}`}
                  className="text-cyber-green hover:text-cyber-green-light"
                >
                  Return to expert profile
                </Link>
              </div>
            ) : (
              <>
                <CalendarView
                  slots={slots}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                  }}
                />
                
                {/* Show slots for selected date with booking buttons */}
                {selectedDate && slots.filter(s => new Date(s.start_time).toISOString().split("T")[0] === selectedDate).length > 0 && (
              <div className="mt-6 bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-custom-text mb-4">
                  Available Timeslots for {new Date(selectedDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <div className="space-y-3">
                  {slots
                    .filter(s => new Date(s.start_time).toISOString().split("T")[0] === selectedDate)
                    .map((slot) => {
                      const duration = calculateDuration(slot.start_time, slot.end_time);
                      const total = calculateTotal(slot.rate_per_hour, duration);
                      
                      if (duration <= 0) return null;

                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-4 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg"
                        >
                          <div>
                            <p className="text-custom-text font-semibold">
                              {new Date(slot.start_time).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })} - {new Date(slot.end_time).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm text-custom-text/70">
                              ${slot.rate_per_hour}/hour • {duration} min • ${total.toFixed(2)} total
                            </p>
                          </div>
                          {user ? (
                            <button
                              onClick={() => handleBookAppointment(slot)}
                              disabled={booking}
                              className="px-6 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                            >
                              {booking ? "Booking..." : "Book Now"}
                            </button>
                          ) : (
                            <Link
                              href={`/login?redirect=/appointments/book/${expertId}`}
                              className="px-6 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors inline-block text-center"
                            >
                              Sign In to Book
                            </Link>
                          )}
                        </div>
                      );
                    })}
                </div>
                </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

