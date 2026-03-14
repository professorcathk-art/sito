"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

export default function PurchasesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPurchases = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const purchasesData: Purchase[] = [];
      
      // Get user email for email-based enrollment lookup
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .maybeSingle();
      
      const userEmail = profile?.email;
      const { data: authUser } = await supabase.auth.getUser();
      const finalUserEmail = userEmail || authUser?.user?.email;
      
      // Fetch enrollments by user_id (paid and free courses)
      const { data: enrollmentsById, error: enrollmentsByIdError } = await supabase
        .from("course_enrollments")
        .select(`
          id,
          course_id,
          payment_intent_id,
          enrolled_at,
          courses (
            id,
            title,
            description,
            cover_image_url,
            price,
            is_free
          )
        `)
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (enrollmentsByIdError) {
        console.error("Error fetching enrollments by user_id:", enrollmentsByIdError);
      }

      // Fetch enrollments by email (for offline payment enrollments)
      let enrollmentsByEmail: any[] = [];
      if (finalUserEmail) {
        const { data, error: enrollmentsByEmailError } = await supabase
          .from("course_enrollments")
          .select(`
            id,
            course_id,
            payment_intent_id,
            enrolled_at,
            courses (
              id,
              title,
              description,
              cover_image_url,
              price,
              is_free
            )
          `)
          .eq("user_email", finalUserEmail)
          .order("enrolled_at", { ascending: false });
        
        if (enrollmentsByEmailError) {
          console.error("Error fetching enrollments by email:", enrollmentsByEmailError);
        } else if (data) {
          enrollmentsByEmail = data;
        }
      }

      // Combine enrollments and remove duplicates
      const allEnrollments = [...(enrollmentsById || []), ...enrollmentsByEmail];
      const uniqueEnrollments = Array.from(
        new Map(allEnrollments.map((e: any) => [e.id, e])).values()
      );
      
      const enrollments = uniqueEnrollments;

      (enrollments || []).forEach((enrollment: any) => {
        // Include both paid and free courses
        purchasesData.push({
          id: enrollment.id,
          course_id: enrollment.course_id,
          course_title: enrollment.courses?.title || "Unknown Course",
          course_description: enrollment.courses?.description || null,
          course_cover_image: enrollment.courses?.cover_image_url || null,
          payment_intent_id: enrollment.payment_intent_id || null,
          enrolled_at: enrollment.enrolled_at,
          price: enrollment.courses?.price || (enrollment.courses?.is_free ? 0 : null),
          type: "course",
        });
      });

      // Fetch ALL appointments (both paid and free)
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          end_time,
          total_amount,
          payment_intent_id,
          created_at,
          status,
          appointment_slot_id
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Fetch appointment slots and products separately
      const slotIds = Array.from(new Set((appointments || []).map((apt: any) => apt.appointment_slot_id).filter(Boolean)));
      let productsMap: Record<string, { id: string; name: string; description: string | null }> = {};
      
      if (slotIds.length > 0) {
        // Fetch slots with their products
        const { data: slotsData } = await supabase
          .from("appointment_slots")
          .select("id, product_id, products(id, name, description)")
          .in("id", slotIds);
        
        if (slotsData) {
          slotsData.forEach((slot: any) => {
            if (slot.product_id && slot.products) {
              productsMap[slot.id] = slot.products;
            }
          });
        }
      }

      (appointments || []).forEach((appointment: any) => {
        const product = appointment.appointment_slot_id ? productsMap[appointment.appointment_slot_id] : null;
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

      // Sort by date (most recent first)
      purchasesData.sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());

      setPurchases(purchasesData);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-custom-text mb-2">Purchase History</h1>
            <p className="text-text-secondary">View all your course purchases and enrollments</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-text-secondary">Loading purchases...</div>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border-default rounded-md">
              <p className="text-text-secondary mb-4">No purchases found</p>
              <Link
                href="/courses"
                className="inline-block px-6 py-3 bg-cyber-green text-white font-semibold rounded-md hover:bg-gray-200 transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-surface border border-border-default rounded-md p-6 hover:bg-surface transition-colors"
                >
                  <div className="flex gap-6">
                    {purchase.course_cover_image && (
                      <img
                        src={purchase.course_cover_image}
                        alt={purchase.course_title || purchase.appointment_title}
                        className="w-32 h-32 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-custom-text mb-2">
                        {purchase.type === "course" ? purchase.course_title : purchase.appointment_title}
                      </h3>
                      {purchase.course_description && (
                        <p className="text-text-secondary mb-4 line-clamp-2">
                          {purchase.course_description}
                        </p>
                      )}
                      {purchase.type === "appointment" && (
                        <div className="text-text-secondary mb-4 space-y-1">
                          <p>1-on-1 Appointment Session</p>
                          {purchase.start_time && purchase.end_time && (
                            <p className="text-sm">
                              <span className="font-medium">Time:</span> {formatDate(purchase.start_time)} - {new Date(purchase.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                          )}
                          {purchase.status && (
                            <p className="text-sm">
                              <span className="font-medium">Status:</span> <span className="capitalize">{purchase.status}</span>
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-6 text-sm text-text-secondary">
                        <div>
                          <span className="font-medium">{purchase.type === "course" ? "Enrolled:" : "Booked:"}</span> {formatDate(purchase.enrolled_at)}
                        </div>
                        {purchase.price !== null && purchase.price > 0 && (
                          <div>
                            <span className="font-medium">Amount:</span> ${purchase.price.toFixed(2)}
                          </div>
                        )}
                        {purchase.payment_intent_id && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Payment ID:</span>{" "}
                            <span className="font-mono text-xs">{purchase.payment_intent_id.slice(0, 20)}...</span>
                            <a
                              href={`/api/stripe/invoice/${purchase.payment_intent_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyber-green hover:text-white text-sm underline"
                            >
                              View Receipt
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        {purchase.type === "course" ? (
                          <>
                            <Link
                              href={`/courses/${purchase.course_id}`}
                              className="inline-block px-4 py-2 bg-cyber-green text-white font-semibold rounded-md hover:bg-gray-200 transition-colors text-sm"
                            >
                              View Course
                            </Link>
                            <Link
                              href="/courses/manage"
                              className="inline-block ml-3 px-4 py-2 border border-border-default text-custom-text rounded-md hover:bg-surface transition-colors text-sm"
                            >
                              Go to Classroom
                            </Link>
                          </>
                        ) : (
                          <Link
                            href="/appointments/manage?tab=my-bookings"
                            className="inline-block px-4 py-2 bg-cyber-green text-white font-semibold rounded-md hover:bg-gray-200 transition-colors text-sm"
                          >
                            View Appointment
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

