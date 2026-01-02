"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  expert: {
    id: string;
    name: string;
    title: string | null;
  };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAvailableSlots();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAvailableSlots = async () => {
    try {
      // Fetch all available appointment slots with expert info
      const { data, error } = await supabase
        .from("appointment_slots")
        .select(`
          *,
          profiles:expert_id (
            id,
            name,
            title
          )
        `)
        .eq("is_available", true)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Transform data to include expert info
      const slots = (data || []).map((slot: any) => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        rate_per_hour: slot.rate_per_hour,
        expert: Array.isArray(slot.profiles) ? slot.profiles[0] : slot.profiles,
      })).filter((slot: AppointmentSlot) => slot.expert && slot.expert.id !== user?.id);

      setAvailableSlots(slots);
    } catch (err) {
      console.error("Error fetching appointment slots:", err);
    } finally {
      setLoading(false);
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

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  };

  const calculateTotal = (ratePerHour: number, durationMinutes: number) => {
    return (ratePerHour * durationMinutes) / 60;
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-custom-text mb-2">Book Appointments</h1>
            <p className="text-custom-text/70">
              Browse available time slots from experts and book 1-on-1 sessions
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-dark-green-800/50 rounded-lg"></div>
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
              <p className="text-custom-text/80 mb-4">No available appointment slots at the moment.</p>
              <p className="text-custom-text/60 text-sm">
                Check back later or browse expert profiles to see their availability.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableSlots.map((slot) => {
                const duration = calculateDuration(slot.start_time, slot.end_time);
                const total = calculateTotal(slot.rate_per_hour, duration);
                
                return (
                  <div
                    key={slot.id}
                    className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Link
                            href={`/expert/${slot.expert.id}`}
                            className="text-lg font-semibold text-custom-text hover:text-cyber-green transition-colors"
                          >
                            {slot.expert.name}
                          </Link>
                          {slot.expert.title && (
                            <span className="text-custom-text/60 text-sm">• {slot.expert.title}</span>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-custom-text mb-2">
                          {formatDateTime(slot.start_time)} - {formatDateTime(slot.end_time)}
                        </p>
                        <p className="text-custom-text/70 mb-4">
                          Duration: {Math.round(duration)} minutes • ${slot.rate_per_hour}/hour
                        </p>
                        <p className="text-xl font-bold text-cyber-green">
                          Total: ${total.toFixed(2)}
                        </p>
                      </div>
                      <Link
                        href={`/appointments/book/${slot.expert.id}?slot=${slot.id}`}
                        className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

