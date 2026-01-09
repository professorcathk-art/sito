/**
 * Checkout Success Page
 * 
 * This page is shown after a successful payment.
 * The session_id query parameter contains the checkout session ID.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      // First, verify payment and create enrollment/appointment if needed
      fetch(`/api/stripe/checkout/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((verifyData) => {
          console.log("Payment verification result:", verifyData);
          
          // Then fetch session details for redirect
          return fetch(`/api/stripe/checkout/session?session_id=${sessionId}`);
        })
        .then((res) => res.json())
        .then((data) => {
          if (data.appointment_id) {
            setAppointmentId(data.appointment_id);
            // Redirect to My Bookings after a short delay
            setTimeout(() => {
              router.push("/appointments/manage?tab=my-bookings");
            }, 3000);
          } else if (data.course_id) {
            setCourseId(data.course_id);
            // Redirect to classroom after a short delay
            setTimeout(() => {
              router.push("/courses/manage");
            }, 3000);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error processing payment:", err);
          setLoading(false);
        });
    } else {
      setError("No session ID provided");
      setLoading(false);
    }
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="text-center">
              <div className="animate-pulse text-custom-text/60">
                Processing...
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-300 mb-4">
                Error
              </h1>
              <p className="text-red-300">{error}</p>
            </div>
          ) : (
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">✓</div>
              <h1 className="text-3xl font-bold text-custom-text mb-4">
                Payment Successful!
              </h1>
              <p className="text-custom-text/80 mb-6">
                Thank you for your purchase. Your payment has been processed successfully.
                {appointmentId && (
                  <span className="block mt-2 text-sm">
                    Your appointment has been booked. Redirecting to Manage Appointments...
                  </span>
                )}
                {courseId && (
                  <span className="block mt-2 text-sm">
                    You have been enrolled in the course. Redirecting to your classroom...
                  </span>
                )}
              </p>
              {sessionId && (
                <p className="text-sm text-custom-text/60 mb-6">
                  Session ID: {sessionId}
                </p>
              )}
              <div className="flex gap-4 justify-center">
                {appointmentId ? (
                  <Link
                    href="/appointments/manage"
                    className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                  >
                    Go to Manage Appointments
                  </Link>
                ) : (
                  <Link
                    href="/courses/manage"
                    className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                  >
                    Go to Classroom
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-custom-bg">
        <Navigation />
        <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-pulse text-custom-text/60">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

