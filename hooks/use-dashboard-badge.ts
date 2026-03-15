"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

export function useDashboardBadge() {
  const { user } = useAuth();
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setHasNewActivity(false);
      return;
    }

    async function check() {
      if (!user?.id) return;
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Pending appointments (as expert)
        const { count: pendingCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("expert_id", user.id)
          .eq("status", "pending");

        if ((pendingCount || 0) > 0) {
          setHasNewActivity(true);
          return;
        }

        // New enrollments (as expert, last 7 days)
        const { data: myCourses } = await supabase
          .from("courses")
          .select("id")
          .eq("expert_id", user.id);
        const courseIds = (myCourses || []).map((c: any) => c.id);

        if (courseIds.length > 0) {
          const { count: enrollCount } = await supabase
            .from("course_enrollments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds)
            .gte("enrolled_at", weekAgo.toISOString());

          if ((enrollCount || 0) > 0) {
            setHasNewActivity(true);
            return;
          }
        }

        // Unread messages
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("to_id", user.id)
          .eq("read", false);

        setHasNewActivity((unreadCount || 0) > 0);
      } catch {
        setHasNewActivity(false);
      }
    }

    check();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return hasNewActivity;
}
