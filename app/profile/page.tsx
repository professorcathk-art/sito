"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "booking" | "enrollment" | "message";
  title: string;
  description: string;
  timeAgo: string;
  href: string;
  isNew?: boolean;
  meta?: string;
  sortTime: string;
}

export default function ProfilePage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const items: NotificationItem[] = [];

      // 1. Pending bookings (as expert - need approval)
      const { data: pendingAppointments } = await supabase
        .from("appointments")
        .select("id, user_id, start_time, created_at")
        .eq("expert_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      const userIds = Array.from(new Set((pendingAppointments || []).map((a: any) => a.user_id)));
      let clientNames: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        profiles?.forEach((p: any) => { clientNames[p.id] = p.name || "Client"; });
      }

      (pendingAppointments || []).forEach((apt: any) => {
        const startDate = apt.start_time ? new Date(apt.start_time) : null;
        const dateStr = startDate && !isNaN(startDate.getTime())
          ? startDate.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "—";
        items.push({
          id: `booking-${apt.id}`,
          type: "booking",
          title: "New booking request",
          description: `${clientNames[apt.user_id] || "Someone"} requested a session`,
          timeAgo: formatTimeAgo(apt.created_at),
          href: "/appointments/manage?tab=bookings",
          isNew: true,
          meta: dateStr,
          sortTime: apt.created_at,
        });
      });

      // 2. Upcoming confirmed bookings (as expert - next 7 days)
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const { data: upcomingAppointments } = await supabase
        .from("appointments")
        .select("id, user_id, start_time, created_at")
        .eq("expert_id", user.id)
        .eq("status", "confirmed")
        .gte("start_time", new Date().toISOString())
        .lte("start_time", weekFromNow.toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      const upcomingUserIds = Array.from(new Set((upcomingAppointments || []).map((a: any) => a.user_id)));
      let upcomingNames: Record<string, string> = {};
      if (upcomingUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", upcomingUserIds);
        profiles?.forEach((p: any) => { upcomingNames[p.id] = p.name || "Client"; });
      }

      (upcomingAppointments || []).forEach((apt: any) => {
        const startDate = apt.start_time ? new Date(apt.start_time) : null;
        const dateStr = startDate && !isNaN(startDate.getTime())
          ? startDate.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "—";
        items.push({
          id: `upcoming-${apt.id}`,
          type: "booking",
          title: "Upcoming session",
          description: `With ${upcomingNames[apt.user_id] || "client"}`,
          timeAgo: formatTimeAgo(apt.start_time),
          href: "/appointments/manage?tab=bookings",
          meta: dateStr,
          sortTime: apt.start_time,
        });
      });

      // 3. New course enrollments (as expert - last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: myCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("expert_id", user.id);
      const courseIds = (myCourses || []).map((c: any) => c.id);

      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("id, course_id, user_id, user_email, enrolled_at, courses(title)")
          .in("course_id", courseIds)
          .gte("enrolled_at", weekAgo.toISOString())
          .order("enrolled_at", { ascending: false })
          .limit(10);

        const enrollUserIds = Array.from(new Set((enrollments || []).map((e: any) => e.user_id).filter(Boolean)));
        let enrollNames: Record<string, string> = {};
        if (enrollUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", enrollUserIds);
          profiles?.forEach((p: any) => { enrollNames[p.id] = p.name || "Learner"; });
        }

        (enrollments || []).forEach((e: any) => {
          const name = e.user_id ? enrollNames[e.user_id] : (e.user_email || "Someone");
          const courseTitle = (e.courses as any)?.title || "your course";
          items.push({
            id: `enrollment-${e.id}`,
            type: "enrollment",
            title: "New enrollment",
            description: `${name} enrolled in ${courseTitle}`,
            timeAgo: formatTimeAgo(e.enrolled_at),
            href: "/courses/manage",
            isNew: true,
            sortTime: e.enrolled_at,
          });
        });
      }

      // 4. Unread messages
      const { data: unreadMessages } = await supabase
        .from("messages")
        .select("id, from_id, subject, created_at")
        .eq("to_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      const msgFromIds = Array.from(new Set((unreadMessages || []).map((m: any) => m.from_id)));
      let msgNames: Record<string, string> = {};
      if (msgFromIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", msgFromIds);
        profiles?.forEach((p: any) => { msgNames[p.id] = p.name || "Someone"; });
      }

      (unreadMessages || []).forEach((m: any) => {
        items.push({
          id: `msg-${m.id}`,
          type: "message",
          title: "New message",
          description: `From ${msgNames[m.from_id] || "someone"}: ${(m.subject || "").slice(0, 40)}${(m.subject || "").length > 40 ? "…" : ""}`,
          timeAgo: formatTimeAgo(m.created_at),
          href: "/messages",
          isNew: true,
          sortTime: m.created_at,
        });
      });

      // Sort by time (most recent first)
      items.sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());
      setNotifications(items.slice(0, 20));
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const typeConfig = {
    booking: { icon: "📅", color: "bg-indigo-500/20 text-indigo-400", label: "Booking" },
    enrollment: { icon: "📚", color: "bg-emerald-500/20 text-emerald-400", label: "Enrollment" },
    message: { icon: "💬", color: "bg-amber-500/20 text-amber-400", label: "Message" },
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-custom-text mb-2">Notifications</h1>
            <p className="text-text-secondary mb-8">
              Upcoming bookings, new enrollments, and messages
            </p>

            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-surface border border-border-default rounded-xl p-12 text-center">
                <p className="text-4xl mb-4">🔔</p>
                <p className="text-text-secondary text-lg mb-2">No notifications yet</p>
                <p className="text-text-secondary text-sm mb-6">
                  When you get new bookings, enrollments, or messages, they&apos;ll appear here.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/appointments/manage"
                    className="px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Manage Appointments
                  </Link>
                  <Link
                    href="/courses/manage"
                    className="px-6 py-3 border border-border-default text-custom-text rounded-lg hover:bg-surface transition-colors"
                  >
                    Classroom
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => {
                  const config = typeConfig[item.type];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block bg-surface border border-border-default rounded-xl p-4 sm:p-5 hover:border-cyber-green/40 hover:bg-surface/80 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}
                        >
                          <span className="text-lg">{config.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-custom-text group-hover:text-cyber-green transition-colors">
                                {item.title}
                              </p>
                              <p className="text-sm text-text-secondary mt-0.5">{item.description}</p>
                              {item.meta && (
                                <p className="text-xs text-text-secondary mt-1">{item.meta}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.isNew && (
                                <span className="w-2 h-2 bg-cyber-green rounded-full" title="New" />
                              )}
                              <span className="text-xs text-text-secondary whitespace-nowrap">
                                {item.timeAgo}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-slate-500 group-hover:text-cyber-green transition-colors">
                          →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/profile/setup"
                className="text-cyber-green hover:text-white font-medium transition-colors"
              >
                Set up profile →
              </Link>
              <Link
                href="/dashboard/storefront"
                className="text-cyber-green hover:text-white font-medium transition-colors"
              >
                Storefront →
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
