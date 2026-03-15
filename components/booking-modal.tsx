"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { stripHtml } from "@/lib/utils/strip-html";

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  is_available: boolean;
  product_id?: string | null;
}

interface QuestionnaireField {
  id: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order_index: number;
}

interface BookingModalProps {
  expertId: string;
  expertName: string;
  product?: {
    id: string;
    name: string;
    price: number;
    pricing_type?: string;
  } | null;
  onClose: () => void;
}

function calculateDuration(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60));
}

function calculateTotal(ratePerHour: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return (ratePerHour / 60) * durationMinutes;
}

export function BookingModal({
  expertId,
  expertName,
  product: initialProduct,
  onClose,
}: BookingModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [product, setProduct] = useState(initialProduct);
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [questionnaireFields, setQuestionnaireFields] = useState<QuestionnaireField[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expertId) return;
    fetchSlotsAndProduct();
  }, [expertId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlotsAndProduct = async () => {
    setLoading(true);
    try {
      const [slotsRes, productRes] = await Promise.all([
        supabase
          .from("appointment_slots")
          .select("id, start_time, end_time, rate_per_hour, product_id, is_available")
          .eq("expert_id", expertId)
          .eq("is_available", true)
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true }),
        supabase
          .from("products")
          .select("id, name, price, pricing_type")
          .eq("expert_id", expertId)
          .eq("product_type", "appointment")
          .maybeSingle(),
      ]);

      if (slotsRes.data) setSlots(slotsRes.data as AppointmentSlot[]);
      if (productRes.data && !initialProduct) {
        setProduct(productRes.data as { id: string; name: string; price: number; pricing_type?: string });
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setLoading(false);
    }
  };

  const slotsByDate: Record<string, AppointmentSlot[]> = {};
  slots.forEach((slot) => {
    const d = new Date(slot.start_time);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!slotsByDate[dateStr]) slotsByDate[dateStr] = [];
    slotsByDate[dateStr].push(slot);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedDateSlots = selectedDate ? slotsByDate[selectedDate] || [] : [];

  const handleSlotSelect = async (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
    const productId = slot.product_id || product?.id;
    if (!productId) return;

    const { data: questionnaire } = await supabase
      .from("questionnaires")
      .select("id")
      .eq("product_id", productId)
      .maybeSingle();

    if (questionnaire?.id) {
      const { data: fields } = await supabase
        .from("questionnaire_fields")
        .select("*")
        .eq("questionnaire_id", questionnaire.id)
        .order("order_index", { ascending: true });
      setQuestionnaireId(questionnaire.id);
      setQuestionnaireFields((fields || []) as QuestionnaireField[]);
      const initial: Record<string, string> = {};
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).single();
        (fields || []).forEach((f: any) => {
          const lb = (f.label || "").toLowerCase();
          if (lb.includes("name")) initial[f.id] = profile?.name || "";
          else if (lb.includes("email")) initial[f.id] = profile?.email || user.email || "";
          else initial[f.id] = "";
        });
      } else {
        (fields || []).forEach((f: any) => { initial[f.id] = ""; });
      }
      setFormData(initial);
    } else {
      setQuestionnaireId(null);
      setQuestionnaireFields([]);
      setFormData({});
    }
  };

  const handleProceedToForm = () => {
    if (selectedSlot) setStep(2);
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (user.id === expertId) {
      alert("You cannot book an appointment with yourself");
      return;
    }
    if (!selectedSlot) return;

    const duration = calculateDuration(selectedSlot.start_time, selectedSlot.end_time);
    const totalAmount = calculateTotal(selectedSlot.rate_per_hour, duration);

    setSubmitting(true);
    try {
      const productId = selectedSlot.product_id || product?.id;
      let questionnaireResponseId: string | null = null;

      if (questionnaireId && questionnaireFields.length > 0 && Object.keys(formData).length > 0) {
        const { data: resp, error } = await supabase
          .from("questionnaire_responses")
          .insert({
            questionnaire_id: questionnaireId,
            user_id: user.id,
            responses: formData,
          })
          .select("id")
          .single();
        if (!error && resp) questionnaireResponseId = resp.id;
      }

      if (totalAmount <= 0) {
        const { data: appointment, error } = await supabase
          .from("appointments")
          .insert({
            expert_id: expertId,
            user_id: user.id,
            appointment_slot_id: selectedSlot.id,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            duration_minutes: duration,
            rate_per_hour: selectedSlot.rate_per_hour,
            total_amount: 0,
            status: "pending",
            product_id: productId || null,
            questionnaire_response_id: questionnaireResponseId,
          })
          .select()
          .single();

        if (error) throw error;
        if (questionnaireResponseId && appointment?.id) {
          await supabase.from("questionnaire_responses").update({ appointment_id: appointment.id }).eq("id", questionnaireResponseId);
        }
        await supabase.from("appointment_slots").update({ is_available: false }).eq("id", selectedSlot.id);

        const slotTime = new Date(selectedSlot.start_time).toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        try {
          const { data: expertProfile } = await supabase.from("profiles").select("name, email").eq("id", expertId).single();
          const { data: myProfile } = await supabase.from("profiles").select("name, email").eq("id", user.id).single();
          if (expertProfile?.email && myProfile?.name) {
            await fetch("/api/booking/send-request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                expertEmail: expertProfile.email,
                expertName: expertProfile.name || "Expert",
                userName: myProfile.name,
                userEmail: myProfile.email || user.email || "",
                slotTime,
              }),
            });
          }
        } catch (e) {
          console.warn("Booking email failed:", e);
        }
        alert("Appointment booked successfully! The expert will be notified.");
        onClose();
        router.push("/dashboard");
        return;
      }

      const { data: expertProfile } = await supabase.from("profiles").select("stripe_connect_account_id").eq("id", expertId).single();
      const connectedAccountId = expertProfile?.stripe_connect_account_id;
      if (!connectedAccountId) {
        alert("Expert has not set up payment. Please contact them.");
        setSubmitting(false);
        return;
      }

      const { data: productData } = await supabase
        .from("products")
        .select("stripe_product_id, stripe_price_id, payment_method, contact_email")
        .eq("id", productId)
        .single();

      if (productData?.payment_method === "offline") {
        alert(productData.contact_email ? `Contact the expert at: ${productData.contact_email}` : "This appointment requires offline payment.");
        setSubmitting(false);
        return;
      }

      const priceInCents = Math.round(totalAmount * 100);
      const res = await fetch("/api/stripe/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceData: {
            unit_amount: priceInCents,
            currency: "usd",
            product_data: {
              name: stripHtml(`Appointment - ${new Date(selectedSlot.start_time).toLocaleDateString()}`),
              description: stripHtml(`1-on-1 session with ${expertName}`),
            },
          },
          quantity: 1,
          connectedAccountId,
          appointmentId: selectedSlot.id,
          slotStartTime: selectedSlot.start_time,
          slotEndTime: selectedSlot.end_time,
          questionnaireResponseId,
          productId: productId || undefined,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      alert(err.message || "Failed to complete booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayPrice = product
    ? product.price === 0
      ? "Free"
      : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`
    : "—";

  const productName = product?.name || "1-on-1 Session";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--store-bg)] border border-[var(--store-card-border)] rounded-3xl shadow-2xl flex flex-col relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[var(--store-card-border)] text-[var(--store-text)] sticky top-0 bg-[var(--store-bg)] z-10">
          <div>
            <h2 className="text-xl font-bold">{productName}</h2>
            <p className="text-sm opacity-80 mt-0.5">{displayPrice}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--store-card-border)]/30 transition-colors"
            aria-label="Close"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-[var(--store-text)] opacity-70">Loading availability…</div>
          ) : slots.length === 0 ? (
            <div className="py-12 text-center text-[var(--store-text)] opacity-70">No available slots at the moment.</div>
          ) : step === 1 ? (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--store-text)]">Select date & time</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--store-btn-bg)] hover:opacity-50 transition-opacity text-[var(--store-text)]"
                    >
                      ←
                    </button>
                    <span className="px-2 text-sm font-medium text-[var(--store-text)] min-w-[120px] text-center">
                      {monthNames[month]} {year}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--store-btn-bg)] hover:opacity-50 transition-opacity text-[var(--store-text)]"
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-[var(--store-text)] opacity-60 py-1">
                      {d}
                    </div>
                  ))}
                  {days.map((date, i) => {
                    if (!date) return <div key={`e-${i}`} className="aspect-square" />;
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const hasSlots = !!slotsByDate[dateStr];
                    const isSelected = selectedDate === dateStr;
                    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                    const isPast = dateStr < todayStr;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => !isPast && hasSlots && setSelectedDate(dateStr)}
                        disabled={isPast || !hasSlots}
                        className={`aspect-square rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] shadow-md"
                            : hasSlots
                              ? "text-[var(--store-text)] hover:bg-[var(--store-btn-bg)] hover:opacity-50"
                              : "text-[var(--store-text)] opacity-30 cursor-not-allowed"
                        } ${isPast ? "opacity-30 cursor-not-allowed" : ""}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDate && selectedDateSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--store-text)] opacity-80 mb-2">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedDateSlots.map((slot) => {
                      const start = new Date(slot.start_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const isSelected = selectedSlot?.id === slot.id;
                      const total = calculateTotal(slot.rate_per_hour, calculateDuration(slot.start_time, slot.end_time));
                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] shadow-md"
                              : "border border-[var(--store-card-border)] text-[var(--store-text)] hover:bg-[var(--store-btn-bg)] hover:opacity-50"
                          }`}
                        >
                          {start}
                          <span className="block text-xs opacity-80 mt-0.5">${total.toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedSlot && (
                    <button
                      onClick={handleProceedToForm}
                      className="w-full py-4 mt-6 bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
                    >
                      Next: Details
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-[var(--store-text)] opacity-70 hover:opacity-100 mb-2"
              >
                ← Back
              </button>
              <h3 className="text-lg font-semibold text-[var(--store-text)]">Your details</h3>
              {questionnaireFields.length > 0 ? (
                questionnaireFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-[var(--store-text)] opacity-90 mb-1.5">
                      {field.label}
                      {field.required && " *"}
                    </label>
                    {field.field_type === "textarea" ? (
                      <textarea
                        value={formData[field.id] ?? ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        placeholder={field.placeholder || ""}
                        required={field.required}
                        rows={3}
                        className="w-full bg-transparent border border-[var(--store-card-border)] rounded-xl p-3 text-[var(--store-text)] focus:border-[var(--store-btn-bg)] focus:ring-1 focus:ring-[var(--store-btn-bg)] outline-none resize-none"
                      />
                    ) : (
                      <input
                        type={field.field_type === "email" ? "email" : "text"}
                        value={formData[field.id] ?? ""}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        placeholder={field.placeholder || ""}
                        required={field.required}
                        className="w-full bg-transparent border border-[var(--store-card-border)] rounded-xl p-3 text-[var(--store-text)] focus:border-[var(--store-btn-bg)] focus:ring-1 focus:ring-[var(--store-btn-bg)] outline-none"
                      />
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--store-text)] opacity-90 mb-1.5">Name *</label>
                    <input
                      type="text"
                      value={formData.name ?? ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                      className="w-full bg-transparent border border-[var(--store-card-border)] rounded-xl p-3 text-[var(--store-text)] focus:border-[var(--store-btn-bg)] focus:ring-1 focus:ring-[var(--store-btn-bg)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--store-text)] opacity-90 mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={formData.email ?? ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                      className="w-full bg-transparent border border-[var(--store-card-border)] rounded-xl p-3 text-[var(--store-text)] focus:border-[var(--store-btn-bg)] focus:ring-1 focus:ring-[var(--store-btn-bg)] outline-none"
                    />
                  </div>
                </>
              )}
              <button
                onClick={handleProceedToPayment}
                disabled={submitting}
                className="w-full py-4 mt-6 bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? "Processing…" : "Proceed to Payment"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
