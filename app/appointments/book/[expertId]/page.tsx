"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { CalendarView } from "@/components/calendar-view";
import { QuestionnaireForm } from "@/components/questionnaire-form";

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  is_available: boolean;
  product_id?: string | null;
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
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  useEffect(() => {
    fetchData();
  }, [expertId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Auto-trigger booking flow if slot ID is in URL
  useEffect(() => {
    if (!user || slots.length === 0) return;
    
    const slotId = searchParams.get("slot");
    if (slotId) {
      const slot = slots.find(s => s.id === slotId);
      if (slot && !selectedSlot) {
        handleBookAppointment(slot);
      }
    }
  }, [slots, user, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Store selected slot for later use
    setSelectedSlot(slot);

    // Check for questionnaire first (MANDATORY)
      // Questionnaire is linked to product_id, so we need to get product_id from slot
      try {
        let productId = slot.product_id;
      
      // If slot doesn't have product_id, find the appointment product for this expert
      if (!productId) {
        const { data: appointmentProduct } = await supabase
          .from("products")
          .select("id")
          .eq("expert_id", expertId)
          .eq("product_type", "appointment")
          .maybeSingle();
        productId = appointmentProduct?.id || null;
      }

      if (!productId) {
        alert("Appointment product not found. Please contact the expert.");
        setBooking(false);
        return;
      }

      // Find questionnaire by product_id
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id, is_active")
        .eq("product_id", productId)
        .maybeSingle();

      if (qError && qError.code !== "PGRST116") {
        console.error("Error checking for questionnaire:", qError);
      }

      if (questionnaire?.id) {
        // Fetch ALL fields (not just check if they exist)
        const { data: fieldsData } = await supabase
          .from("questionnaire_fields")
          .select("*")
          .eq("questionnaire_id", questionnaire.id)
          .order("order_index", { ascending: true });

        if (fieldsData && fieldsData.length > 0) {
          // Show form with ALL fields
          setQuestionnaireId(questionnaire.id);
          setShowQuestionnaire(true);
          return;
        } else {
          // No fields exist - show error (only experts can create fields)
          alert("Booking form is not yet set up by the expert. Please contact them directly.");
          setBooking(false);
          return;
        }
      } else {
        // No questionnaire exists - DO NOT CREATE (only experts can create questionnaires)
        alert("Booking form is not yet set up by the expert. Please contact them directly.");
        setBooking(false);
        return;
      }
    } catch (err) {
      console.error("Error setting up questionnaire:", err);
    }

    // If we get here, proceed with booking (fallback)
    proceedWithBooking(slot);
  };

  const proceedWithBooking = async (slot: AppointmentSlot, questionnaireResponse?: any) => {
    if (!user || !slot) return;

    const duration = calculateDuration(slot.start_time, slot.end_time);
    const totalAmount = calculateTotal(slot.rate_per_hour, duration);

    if (totalAmount <= 0) {
      // Free appointment - book directly
      if (!confirm(`Book free appointment?`)) {
        return;
      }

      setBooking(true);
      try {
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
      return;
    }

    // Paid appointment - check if product has Stripe setup
    setBooking(true);
    try {
      // Fetch product linked to this slot - try to find product by expert_id if slot doesn't have product_id
      let slotData: any = null;
      
      // First try to get product_id from slot
      const { data: slotWithProduct } = await supabase
        .from("appointment_slots")
        .select("product_id")
        .eq("id", slot.id)
        .single();

      if (slotWithProduct?.product_id) {
        // Slot has product_id - fetch product
        const { data: productData } = await supabase
          .from("products")
          .select("id, stripe_product_id, stripe_price_id, payment_method, contact_email")
          .eq("id", slotWithProduct.product_id)
          .single();
        
        slotData = { product_id: slotWithProduct.product_id, products: productData };
      } else {
        // Slot doesn't have product_id - find appointment product for this expert
        const { data: appointmentProduct } = await supabase
          .from("products")
          .select("id, stripe_product_id, stripe_price_id, payment_method, contact_email")
          .eq("expert_id", expertId)
          .eq("product_type", "appointment")
          .maybeSingle();
        
        if (appointmentProduct) {
          slotData = { product_id: appointmentProduct.id, products: appointmentProduct };
          // Update slot with product_id for future bookings
          await supabase
            .from("appointment_slots")
            .update({ product_id: appointmentProduct.id })
            .eq("id", slot.id);
        }
      }

      if (!slotData?.product_id) {
        alert("Appointment service is not set up. Please contact the expert.");
        setBooking(false);
        return;
      }

      const product = slotData.products as any;
      
      // Check payment method
      if (product.payment_method === "offline") {
        // Show offline payment info
        if (product.contact_email) {
          alert(`This appointment requires offline payment. Please contact the expert at: ${product.contact_email}`);
        } else {
          alert("This appointment requires offline payment. Please contact the expert directly.");
        }
        setBooking(false);
        return;
      }

      // Stripe payment - check if Stripe IDs exist
      if (!product.stripe_product_id || !product.stripe_price_id) {
        alert("Payment method not configured. Please contact the expert.");
        setBooking(false);
        return;
      }

      // Get connected account ID from expert's profile
      const { data: expertProfile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("id", expertId)
        .maybeSingle();
      
      const connectedAccountId = expertProfile?.stripe_connect_account_id;
      
      if (!connectedAccountId) {
        alert("Expert has not set up payment processing. Please contact them directly.");
        setBooking(false);
        return;
      }

      // Create Stripe checkout session
      // Calculate price for this specific slot duration
      const priceInCents = Math.round(totalAmount * 100);
      
      // For appointments, we need to create a checkout session with the calculated amount
      // Since Stripe prices are fixed, we'll use line_items with price_data for dynamic pricing
      const response = await fetch("/api/stripe/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use price_data for dynamic pricing based on slot duration
          priceData: {
            unit_amount: priceInCents,
            currency: "usd",
            product_data: {
              name: `Appointment - ${new Date(slot.start_time).toLocaleDateString()}`,
              description: `1-on-1 session with ${expert?.name || "Expert"}`,
            },
          },
          quantity: 1,
          connectedAccountId: connectedAccountId,
          // Use snake_case keys to match API expectations
          appointmentId: slot.id,
          slotStartTime: slot.start_time,
          slotEndTime: slot.end_time,
          questionnaireResponseId: questionnaireResponse?.id || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Error booking appointment:", err);
      alert(`Failed to start payment: ${err.message || "Please try again."}`);
    } finally {
      setBooking(false);
    }
  };

  const handleQuestionnaireSubmit = async (responses: any) => {
    if (!questionnaireId || !selectedSlot) return;

    try {
      // Save questionnaire response
      const { data: responseData, error: responseError } = await supabase
        .from("questionnaire_responses")
        .insert({
          questionnaire_id: questionnaireId,
          user_id: user?.id,
          responses: responses,
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Proceed with booking
      setShowQuestionnaire(false);
      await proceedWithBooking(selectedSlot, responseData);
    } catch (err: any) {
      console.error("Error submitting questionnaire:", err);
      alert(`Failed to submit form: ${err.message || "Please try again."}`);
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

      {/* Questionnaire Form Modal */}
      {showQuestionnaire && questionnaireId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-green-900 border border-cyber-green/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-custom-text">Booking Form</h2>
              <button
                onClick={() => {
                  setShowQuestionnaire(false);
                  setQuestionnaireId(null);
                  setSelectedSlot(null);
                }}
                className="text-custom-text/60 hover:text-custom-text transition-colors"
              >
                ✕
              </button>
            </div>
            <QuestionnaireForm
              questionnaireId={questionnaireId}
              onSubmit={handleQuestionnaireSubmit}
              onCancel={() => {
                setShowQuestionnaire(false);
                setQuestionnaireId(null);
                setSelectedSlot(null);
              }}
            />
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

