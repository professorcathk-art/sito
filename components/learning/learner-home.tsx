"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatInTimeZone } from "@/lib/appointment-availability";

interface EnrolledCourse {
  enrollmentId: string;
  courseId: string;
  title: string;
  coverImageUrl: string | null;
  expertName: string;
  completedLessons: number;
  totalLessons: number;
}

interface UpcomingSession {
  id: string;
  expertName: string;
  expertId: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingLink?: string | null;
}

export function LearnerHome() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", user.id)
          .maybeSingle();
        const { data: authUser } = await supabase.auth.getUser();
        const email = profile?.email || authUser?.user?.email || "";

        const { data: byId } = await supabase
          .from("course_enrollments")
          .select("id, course_id, courses(id, title, cover_image_url, expert_id)")
          .eq("user_id", user.id);

        let byEmail: typeof byId = [];
        if (email) {
          const { data } = await supabase
            .from("course_enrollments")
            .select("id, course_id, courses(id, title, cover_image_url, expert_id)")
            .eq("user_email", email)
            .is("user_id", null);
          byEmail = data || [];
        }

        const enrollmentMap = new Map<string, any>();
        [...(byId || []), ...(byEmail || [])].forEach((row: any) => {
          const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
          if (!course?.id) return;
          if (!enrollmentMap.has(course.id)) {
            enrollmentMap.set(course.id, { ...row, course });
          }
        });

        const enrollments = Array.from(enrollmentMap.values());
        const expertIds = Array.from(
          new Set(enrollments.map((e) => e.course.expert_id).filter(Boolean))
        );
        const expertNames: Record<string, string> = {};
        if (expertIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", expertIds);
          profiles?.forEach((p) => {
            expertNames[p.id] = p.name || "Expert";
          });
        }

        const courseCards: EnrolledCourse[] = [];
        for (const row of enrollments) {
          const courseId = row.course.id as string;
          const { count: totalLessons } = await supabase
            .from("course_lessons")
            .select("*", { count: "exact", head: true })
            .eq("course_id", courseId);

          const { count: completedLessons } = await supabase
            .from("lesson_progress")
            .select("*", { count: "exact", head: true })
            .eq("enrollment_id", row.id)
            .eq("completed", true);

          courseCards.push({
            enrollmentId: row.id,
            courseId,
            title: row.course.title || "Untitled course",
            coverImageUrl: row.course.cover_image_url || null,
            expertName: expertNames[row.course.expert_id] || "Expert",
            completedLessons: completedLessons || 0,
            totalLessons: totalLessons || 0,
          });
        }

        courseCards.sort((a, b) => a.title.localeCompare(b.title));
        setCourses(courseCards);

        const { data: upcoming } = await supabase
          .from("appointments")
          .select("id, status, start_time, end_time, meeting_link, expert_id")
          .eq("user_id", user.id)
          .in("status", ["pending", "confirmed"])
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(5);

        const sessionExpertIds = Array.from(
          new Set((upcoming || []).map((a) => a.expert_id).filter(Boolean))
        );
        const sessionNames: Record<string, string> = {};
        if (sessionExpertIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", sessionExpertIds);
          profiles?.forEach((p) => {
            sessionNames[p.id] = p.name || "Expert";
          });
        }

        setSessions(
          (upcoming || []).map((a) => ({
            id: a.id,
            expertId: a.expert_id,
            expertName: sessionNames[a.expert_id] || "Expert",
            startTime: a.start_time,
            endTime: a.end_time,
            status: a.status,
            meetingLink: a.meeting_link,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load your learning home");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-lg bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-900/60 border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          My Learning
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">My Enrolled Courses</h1>
        <p className="mt-2 text-sm text-slate-400">
          Pick up where you left off, or join your next 1-on-1 session.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-14 text-center">
          <p className="text-lg font-medium text-slate-200">No courses yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Enroll in an e-learning course from an expert storefront to see it here.
          </p>
          <Link
            href="/featured-courses"
            className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const pct =
              course.totalLessons > 0
                ? Math.round((course.completedLessons / course.totalLessons) * 100)
                : 0;
            const cta =
              course.completedLessons > 0 && course.completedLessons < course.totalLessons
                ? "Resume Learning"
                : course.completedLessons >= course.totalLessons && course.totalLessons > 0
                  ? "Review Course"
                  : "Start Learning";
            return (
              <article
                key={course.enrollmentId}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50"
              >
                <div className="relative aspect-[16/9] bg-slate-800">
                  {course.coverImageUrl ? (
                    <Image
                      src={course.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-slate-600">
                      📚
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-lg font-semibold text-slate-50 line-clamp-2">
                    {course.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">{course.expertName}</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>
                        {course.completedLessons}/{course.totalLessons || "—"} lessons completed
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/learn/${course.courseId}`}
                    className="mt-4 inline-flex justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    {cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Upcoming 1-on-1 Sessions</h2>
            <p className="mt-1 text-sm text-slate-500">Confirmed and pending bookings ahead.</p>
          </div>
          <Link
            href="/dashboard/learning/bookings"
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            View all
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-8 text-sm text-slate-400">
            No upcoming sessions.{" "}
            <Link href="/directory" className="text-sky-400 hover:underline">
              Book an expert
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <article
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-50">{s.expertName}</h3>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] capitalize text-slate-300">
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatInTimeZone(s.startTime, tz)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {s.status === "confirmed" && s.meetingLink && (
                    <a
                      href={s.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950"
                    >
                      Join call
                    </a>
                  )}
                  <Link
                    href={`/expert/${s.expertId}`}
                    className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    View expert
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
