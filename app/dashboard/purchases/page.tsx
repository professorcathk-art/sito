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
      
      // Fetch enrollments with payment_intent_id (paid courses)
      const { data: enrollments, error: enrollmentsError } = await supabase
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
            price
          )
        `)
        .eq("user_id", user.id)
        .not("payment_intent_id", "is", null)
        .order("enrolled_at", { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      (enrollments || []).forEach((enrollment: any) => {
        purchasesData.push({
          id: enrollment.id,
          course_id: enrollment.course_id,
          course_title: enrollment.courses?.title || "Unknown Course",
          course_description: enrollment.courses?.description || null,
          course_cover_image: enrollment.courses?.cover_image_url || null,
          payment_intent_id: enrollment.payment_intent_id,
          enrolled_at: enrollment.enrolled_at,
          price: enrollment.courses?.price || null,
          type: "course",
        });
      });

      // Fetch appointments with payment_intent_id (paid appointments)
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          end_time,
          total_amount,
          payment_intent_id,
          created_at,
          products (
            id,
            name,
            description
          )
        `)
        .eq("user_id", user.id)
        .not("payment_intent_id", "is", null)
        .order("created_at", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      (appointments || []).forEach((appointment: any) => {
        purchasesData.push({
          id: appointment.id,
          appointment_id: appointment.id,
          appointment_title: appointment.products?.name || "1-on-1 Appointment",
          payment_intent_id: appointment.payment_intent_id,
          enrolled_at: appointment.created_at,
          price: appointment.total_amount || null,
          type: "appointment",
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
            <p className="text-custom-text/70">View all your course purchases and enrollments</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-custom-text/60">Loading purchases...</div>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12 bg-dark-green-800/30 border border-cyber-green/30 rounded-lg">
              <p className="text-custom-text/70 mb-4">No purchases found</p>
              <Link
                href="/courses"
                className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 hover:bg-dark-green-800/50 transition-colors"
                >
                  <div className="flex gap-6">
                    {purchase.course_cover_image && (
                      <img
                        src={purchase.course_cover_image}
                        alt={purchase.course_title || purchase.appointment_title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-custom-text mb-2">
                        {purchase.type === "course" ? purchase.course_title : purchase.appointment_title}
                      </h3>
                      {purchase.course_description && (
                        <p className="text-custom-text/70 mb-4 line-clamp-2">
                          {purchase.course_description}
                        </p>
                      )}
                      {purchase.type === "appointment" && (
                        <p className="text-custom-text/70 mb-4">
                          1-on-1 Appointment Session
                        </p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-custom-text/60">
                        <div>
                          <span className="font-medium">Purchased:</span> {formatDate(purchase.enrolled_at)}
                        </div>
                        {purchase.price !== null && purchase.price > 0 && (
                          <div>
                            <span className="font-medium">Amount:</span> ${purchase.price.toFixed(2)}
                          </div>
                        )}
                        {purchase.payment_intent_id && (
                          <div>
                            <span className="font-medium">Payment ID:</span>{" "}
                            <span className="font-mono text-xs">{purchase.payment_intent_id.slice(0, 20)}...</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        {purchase.type === "course" ? (
                          <>
                            <Link
                              href={`/courses/${purchase.course_id}`}
                              className="inline-block px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-sm"
                            >
                              View Course
                            </Link>
                            <Link
                              href="/courses/manage"
                              className="inline-block ml-3 px-4 py-2 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors text-sm"
                            >
                              Go to Classroom
                            </Link>
                          </>
                        ) : (
                          <Link
                            href="/appointments/manage"
                            className="inline-block px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-sm"
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

