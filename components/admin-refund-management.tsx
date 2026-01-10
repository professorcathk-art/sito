"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface Enrollment {
  id: string;
  course_id: string;
  user_id: string;
  payment_intent_id: string | null;
  refund_status: string;
  refund_id: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  enrolled_at: string;
  courses: {
    id: string;
    title: string;
    expert_id: string;
    price: number;
    profiles: {
      id: string;
      name: string;
      email: string;
    };
  };
  profiles: {
    id: string;
    name: string;
    email: string;
  };
}

interface Appointment {
  id: string;
  expert_id: string;
  user_id: string;
  payment_intent_id: string | null;
  refund_status: string;
  refund_id: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  total_amount: number;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
  expert_profile: {
    id: string;
    name: string;
    email: string;
  };
  user_profile: {
    id: string;
    name: string;
    email: string;
  };
}

export function AdminRefundManagement() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "course" | "appointment">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "none" | "processing" | "refunded">("all");

  useEffect(() => {
    if (user) {
      fetchRefundableItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterType, filterStatus]);

  const fetchRefundableItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch paid enrollments
      if (filterType === "all" || filterType === "course") {
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("course_enrollments")
          .select(`
            id,
            course_id,
            user_id,
            payment_intent_id,
            refund_status,
            refund_id,
            refunded_at,
            refund_amount,
            refund_reason,
            enrolled_at,
            courses!inner(
              id,
              title,
              expert_id,
              price,
              profiles!courses_expert_id_fkey(id, name, email)
            ),
            profiles!course_enrollments_user_id_fkey(id, name, email)
          `)
          .not("payment_intent_id", "is", null)
          .order("enrolled_at", { ascending: false })
          .limit(100);

        if (enrollmentsError) {
          console.error("Error fetching enrollments:", enrollmentsError);
        } else {
          let filtered = (enrollmentsData || []) as any[];
          
          if (filterStatus === "none") {
            filtered = filtered.filter((e: any) => !e.refund_status || e.refund_status === "none");
          } else if (filterStatus === "processing") {
            filtered = filtered.filter((e: any) => e.refund_status === "processing");
          } else if (filterStatus === "refunded") {
            filtered = filtered.filter((e: any) => e.refund_status === "refunded");
          }

          // Transform the data to match our interface
          const transformed = filtered.map((e: any) => ({
            ...e,
            courses: Array.isArray(e.courses) ? e.courses[0] : e.courses,
            profiles: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles,
          }));

          setEnrollments(transformed as Enrollment[]);
        }
      } else {
        setEnrollments([]);
      }

      // Fetch paid appointments
      if (filterType === "all" || filterType === "appointment") {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            id,
            expert_id,
            user_id,
            payment_intent_id,
            refund_status,
            refund_id,
            refunded_at,
            refund_amount,
            refund_reason,
            total_amount,
            status,
            start_time,
            end_time,
            created_at,
            expert_profile:profiles!appointments_expert_id_fkey(id, name, email),
            user_profile:profiles!appointments_user_id_fkey(id, name, email)
          `)
          .not("payment_intent_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(100);

        if (appointmentsError) {
          console.error("Error fetching appointments:", appointmentsError);
        } else {
          let filtered = (appointmentsData || []) as any[];
          
          if (filterStatus === "none") {
            filtered = filtered.filter((a: any) => !a.refund_status || a.refund_status === "none");
          } else if (filterStatus === "processing") {
            filtered = filtered.filter((a: any) => a.refund_status === "processing");
          } else if (filterStatus === "refunded") {
            filtered = filtered.filter((a: any) => a.refund_status === "refunded");
          }

          // Transform the data to match our interface
          const transformed = filtered.map((a: any) => ({
            ...a,
            expert_profile: a.expert_profile || (Array.isArray(a.expert_profile) ? a.expert_profile[0] : null),
            user_profile: a.user_profile || (Array.isArray(a.user_profile) ? a.user_profile[0] : null),
          }));

          setAppointments(transformed as Appointment[]);
        }
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      console.error("Error fetching refundable items:", err);
      setError(err.message || "Failed to fetch refundable items");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (type: "course" | "appointment", id: string, reason?: string) => {
    if (!confirm(`Are you sure you want to process a refund for this ${type}? This action cannot be undone.`)) {
      return;
    }

    setRefunding(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/stripe/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          id,
          reason: reason || "Admin refund: Product not delivered by merchant",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process refund");
      }

      const data = await response.json();
      setSuccess(`Refund processed successfully: ${data.refund.id}`);
      
      // Refresh the list
      await fetchRefundableItems();
    } catch (err: any) {
      console.error("Error processing refund:", err);
      setError(err.message || "Failed to process refund");
    } finally {
      setRefunding(null);
    }
  };

  const getRefundStatusBadge = (status: string | null) => {
    if (!status || status === "none") {
      return <span className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs">Paid</span>;
    }
    if (status === "processing") {
      return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 rounded text-xs">Processing</span>;
    }
    if (status === "refunded") {
      return <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">Refunded</span>;
    }
    if (status === "failed") {
      return <span className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs">Failed</span>;
    }
    return <span className="px-2 py-1 bg-gray-900/30 text-gray-300 rounded text-xs">{status}</span>;
  };

  if (loading) {
    return (
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-dark-green-900/50 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-dark-green-900/50 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-dark-green-900/50 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-custom-text">Refund Management</h2>
        <button
          onClick={fetchRefundableItems}
          className="px-4 py-2 bg-cyber-green/20 border border-cyber-green/50 text-cyber-green rounded-lg hover:bg-cyber-green/30 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-custom-text mb-2">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text focus:border-cyber-green focus:outline-none"
          >
            <option value="all">All</option>
            <option value="course">Courses</option>
            <option value="appointment">Appointments</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-custom-text mb-2">Refund Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text focus:border-cyber-green focus:outline-none"
          >
            <option value="all">All</option>
            <option value="none">Not Refunded</option>
            <option value="processing">Processing</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Course Enrollments */}
      {(filterType === "all" || filterType === "course") && enrollments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-custom-text mb-4">Course Enrollments</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cyber-green/30">
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Course</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Student</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Expert</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Amount</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Enrolled</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-cyber-green/10 hover:bg-dark-green-800/20">
                    <td className="p-3 text-sm text-custom-text">
                      {enrollment.courses?.title || "Unknown Course"}
                    </td>
                    <td className="p-3 text-sm text-custom-text">
                      {enrollment.profiles?.name || enrollment.profiles?.email || "Unknown"}
                    </td>
                    <td className="p-3 text-sm text-custom-text">
                      {enrollment.courses?.profiles?.name || "Unknown Expert"}
                    </td>
                    <td className="p-3 text-sm text-custom-text">
                      ${enrollment.courses?.price?.toFixed(2) || "0.00"}
                    </td>
                    <td className="p-3 text-sm">
                      {getRefundStatusBadge(enrollment.refund_status)}
                    </td>
                    <td className="p-3 text-sm text-custom-text/70">
                      {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {(!enrollment.refund_status || enrollment.refund_status === "none") && (
                        <button
                          onClick={() => handleRefund("course", enrollment.id)}
                          disabled={refunding === enrollment.id}
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 text-xs font-medium"
                        >
                          {refunding === enrollment.id ? "Processing..." : "Refund"}
                        </button>
                      )}
                      {enrollment.refund_status === "refunded" && enrollment.refund_amount && (
                        <span className="text-xs text-custom-text/60">
                          Refunded: ${enrollment.refund_amount.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Appointments */}
      {(filterType === "all" || filterType === "appointment") && appointments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-custom-text mb-4">Appointments</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cyber-green/30">
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Customer</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Expert</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Date/Time</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Amount</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Status</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Booked</th>
                  <th className="text-left p-3 text-sm font-semibold text-custom-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-cyber-green/10 hover:bg-dark-green-800/20">
                    <td className="p-3 text-sm text-custom-text">
                      {appointment.user_profile?.name || appointment.user_profile?.email || "Unknown"}
                    </td>
                    <td className="p-3 text-sm text-custom-text">
                      {appointment.expert_profile?.name || "Unknown Expert"}
                    </td>
                    <td className="p-3 text-sm text-custom-text">
                      {new Date(appointment.start_time).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-custom-text">
                      ${appointment.total_amount?.toFixed(2) || "0.00"}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex flex-col gap-1">
                        {getRefundStatusBadge(appointment.refund_status)}
                        <span className="text-xs text-custom-text/60">
                          {appointment.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-custom-text/70">
                      {new Date(appointment.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {(!appointment.refund_status || appointment.refund_status === "none") && (
                        <button
                          onClick={() => handleRefund("appointment", appointment.id)}
                          disabled={refunding === appointment.id}
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 text-xs font-medium"
                        >
                          {refunding === appointment.id ? "Processing..." : "Refund"}
                        </button>
                      )}
                      {appointment.refund_status === "refunded" && appointment.refund_amount && (
                        <span className="text-xs text-custom-text/60">
                          Refunded: ${appointment.refund_amount.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {enrollments.length === 0 && appointments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-custom-text/60">No refundable items found.</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <p className="text-yellow-200 text-sm">
          <strong>Admin Refund Policy:</strong> Use this tool to process refunds when merchants (experts) fail to deliver their products or services to customers. 
          All refunds are processed through Stripe and will be reflected in the customer&apos;s account.
        </p>
      </div>
    </div>
  );
}
