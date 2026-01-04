"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Purchase {
  id: string;
  course_id: string;
  course_title: string;
  course_description: string | null;
  course_cover_image: string | null;
  payment_intent_id: string | null;
  enrolled_at: string;
  price: number | null;
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
      // Fetch enrollments with payment_intent_id (paid courses)
      const { data: enrollments, error } = await supabase
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

      if (error) throw error;

      const purchasesData: Purchase[] = (enrollments || []).map((enrollment: any) => ({
        id: enrollment.id,
        course_id: enrollment.course_id,
        course_title: enrollment.courses?.title || "Unknown Course",
        course_description: enrollment.courses?.description || null,
        course_cover_image: enrollment.courses?.cover_image_url || null,
        payment_intent_id: enrollment.payment_intent_id,
        enrolled_at: enrollment.enrolled_at,
        price: enrollment.courses?.price || null,
      }));

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
                        alt={purchase.course_title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-custom-text mb-2">
                        {purchase.course_title}
                      </h3>
                      {purchase.course_description && (
                        <p className="text-custom-text/70 mb-4 line-clamp-2">
                          {purchase.course_description}
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

