"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CourseLessonTreeEditor, type CourseLesson } from "@/components/course-lesson-tree-editor";

function EditCourseContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const skipLessons = searchParams?.get("skipLessons") === "true";
  const courseId = params.id as string;
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchCourse();
  }, [courseId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single();
      if (error) throw error;
      if (data.expert_id !== user?.id) {
        router.push("/courses/manage");
        return;
      }
      setCourse(data);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);
    } catch (err) {
      console.error("Error fetching course:", err);
      alert("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (lessons.length === 0) {
      alert("Please add at least one lesson before publishing");
      return;
    }
    try {
      const { error } = await supabase.from("courses").update({ published: true }).eq("id", courseId);
      if (error) throw error;
      alert("Course published successfully!");
      router.push(`/courses/${courseId}`);
    } catch (err) {
      console.error("Error publishing course:", err);
      alert("Failed to publish course");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
        <div className="h-72 rounded-2xl bg-slate-900 border border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Course builder</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">
            {course?.title || "Edit Course"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Drag lessons to reorder. Edit rich content and embed video on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/courses/manage"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Back to Classroom
          </Link>
          {course && !course.published && (
            <button
              onClick={handlePublish}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white"
            >
              Publish course
            </button>
          )}
        </div>
      </div>

      <CourseLessonTreeEditor
        courseId={courseId}
        lessons={lessons}
        onLessonsChange={setLessons}
      />

      {skipLessons && (
        <button
          onClick={() => router.push("/dashboard/products")}
          className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-900"
        >
          Skip for now — return to Products
        </button>
      )}
    </div>
  );
}

export default function EditCoursePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-slate-400">Loading course builder…</div>}>
        <EditCourseContent />
      </Suspense>
    </DashboardLayout>
  );
}
