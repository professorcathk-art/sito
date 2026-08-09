"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { createClient } from "@/lib/supabase/client";

interface Purchase {
  id: string;
  course_id?: string;
  appointment_id?: string;
  course_title?: string;
  appointment_title?: string;
  course_description?: string | null;
  course_cover_image?: string | null;
  payment_intent_id: string | null;
  enrolled_at: string;
  price: number | null;
  type: "course" | "appointment";
  start_time?: string;
  end_time?: string;
  status?: string;
}

export default function LearningHistoryPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPurchases();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPurchases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const purchasesData: Purchase[] = [];
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .maybeSingle();
      const { data: authUser } = await supabase.auth.getUser();
      const finalUserEmail = profile?.email || authUser?.user?.email;

      const { data: enrollmentsById } = await supabase
        .from("course_enrollments")
        .select(
          `id, course_id, payment_intent_id, enrolled_at,
          courses (id, title, description, cover_image_url, price, is_free)`
        )
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      let enrollmentsByEmail: any[] = [];
      if (finalUserEmail) {
        const { data } = await supabase
          .from("course_enrollments")
          .select(
            `id, course_id, payment_intent_id, enrolled_at,
            courses (id, title, description, cover_image_url, price, is_free)`
          )
          .eq("user_email", finalUserEmail)
          .order("enrolled_at", { ascending: false });
        enrollmentsByEmail = data || [];
      }

      const uniqueEnrollments = Array.from(
        new Map(
          [...(enrollmentsById || []), ...enrollmentsByEmail].map((e: any) => [e.id, e])
        ).values()
      );

      uniqueEnrollments.forEach((enrollment: any) => {
        const course = Array.isArray(enrollment.courses)
          ? enrollment.courses[0]
          : enrollment.courses;
        purchasesData.push({
          id: enrollment.id,
          course_id: enrollment.course_id,
          course_title: course?.title || "Unknown Course",
          course_description: course?.description || null,
          course_cover_image: course?.cover_image_url || null,
          payment_intent_id: enrollment.payment_intent_id || null,
          enrolled_at: enrollment.enrolled_at,
          price: course?.price || (course?.is_free ? 0 : null),
          type: "course",
        });
      });

      const { data: appointments } = await supabase
        .from("appointments")
        .select(
          "id, start_time, end_time, total_amount, payment_intent_id, created_at, status, appointment_slot_id"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const slotIds = Array.from(
        new Set((appointments || []).map((apt) => apt.appointment_slot_id).filter(Boolean))
      );
      const productsMap: Record<string, { name: string }> = {};
      if (slotIds.length) {
        const { data: slotsData } = await supabase
          .from("appointment_slots")
          .select("id, product_id, products(id, name)")
          .in("id", slotIds);
        slotsData?.forEach((slot: any) => {
          const product = Array.isArray(slot.products) ? slot.products[0] : slot.products;
          if (product?.name) productsMap[slot.id] = { name: product.name };
        });
      }

      (appointments || []).forEach((appointment) => {
        const product = appointment.appointment_slot_id
          ? productsMap[appointment.appointment_slot_id]
          : null;
        purchasesData.push({
          id: appointment.id,
          appointment_id: appointment.id,
          appointment_title: product?.name || "1-on-1 Appointment",
          payment_intent_id: appointment.payment_intent_id,
          enrolled_at: appointment.created_at,
          price: appointment.total_amount || null,
          type: "appointment",
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status,
        });
      });

      purchasesData.sort(
        (a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
      );
      setPurchases(purchasesData);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              My Learning
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">
              Purchase History
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Courses and sessions you&apos;ve enrolled in or booked.
            </p>
          </header>

          {loading ? (
            <div className="text-sm text-slate-400">Loading purchases…</div>
          ) : purchases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center">
              <p className="text-slate-400 mb-4">No purchases found</p>
              <Link
                href="/featured-courses"
                className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                Browse courses
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <article
                  key={purchase.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {purchase.course_cover_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={purchase.course_cover_image}
                        alt=""
                        className="h-28 w-40 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-slate-50">
                        {purchase.type === "course"
                          ? purchase.course_title
                          : purchase.appointment_title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {purchase.type === "course" ? "Course" : "Appointment"} ·{" "}
                        {formatDate(purchase.enrolled_at)}
                        {purchase.price != null ? ` · $${Number(purchase.price).toFixed(2)}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {purchase.type === "course" && purchase.course_id ? (
                          <Link
                            href={`/learn/${purchase.course_id}`}
                            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                          >
                            Open course
                          </Link>
                        ) : (
                          <Link
                            href="/dashboard/learning/bookings"
                            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                          >
                            View booking
                          </Link>
                        )}
                        {purchase.payment_intent_id && (
                          <a
                            href={`/api/stripe/invoice/${purchase.payment_intent_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                          >
                            Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
