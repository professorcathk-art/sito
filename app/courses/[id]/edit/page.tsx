"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: "youtube" | "vimeo" | null;
  content: string | null;
  order_index: number;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const skipLessons = searchParams?.get("skipLessons") === "true";
  const courseId = params.id as string;
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    videoType: "youtube" as "youtube" | "vimeo",
    content: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchCourse();
  }, [courseId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error) throw error;
      if (data.expert_id !== user?.id) {
        router.push("/dashboard");
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
    } catch (err: any) {
      console.error("Error fetching course:", err);
      alert("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) {
      alert("Please enter a lesson title");
      return;
    }

    setSaving(true);
    try {
      if (editingLesson) {
        const { error } = await supabase
          .from("course_lessons")
          .update({
            title: lessonForm.title,
            description: lessonForm.description || null,
            video_url: lessonForm.videoUrl || null,
            video_type: lessonForm.videoUrl ? lessonForm.videoType : null,
            content: lessonForm.content || null,
          })
          .eq("id", editingLesson.id);

        if (error) throw error;
      } else {
        const maxOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order_index)) : -1;
        const { error } = await supabase
          .from("course_lessons")
          .insert({
            course_id: courseId,
            title: lessonForm.title,
            description: lessonForm.description || null,
            video_url: lessonForm.videoUrl || null,
            video_type: lessonForm.videoUrl ? lessonForm.videoType : null,
            content: lessonForm.content || null,
            order_index: maxOrder + 1,
          });

        if (error) throw error;
      }

      setShowLessonForm(false);
      setEditingLesson(null);
      setLessonForm({
        title: "",
        description: "",
        videoUrl: "",
        videoType: "youtube",
        content: "",
      });
      fetchCourse();
    } catch (err: any) {
      console.error("Error saving lesson:", err);
      alert("Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;
      fetchCourse();
    } catch (err: any) {
      console.error("Error deleting lesson:", err);
      alert("Failed to delete lesson");
    }
  };

  const handlePublish = async () => {
    if (lessons.length === 0) {
      alert("Please add at least one lesson before publishing");
      return;
    }

    try {
      const { error } = await supabase
        .from("courses")
        .update({ published: true })
        .eq("id", courseId);

      if (error) throw error;
      alert("Course published successfully!");
      router.push(`/courses/${courseId}`);
    } catch (err: any) {
      console.error("Error publishing course:", err);
      alert("Failed to publish course");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-custom-bg">
          <Navigation />
          <div className="pt-16 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-dark-green-800/50 rounded w-1/3 mb-8"></div>
                <div className="h-64 bg-dark-green-800/50 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-custom-bg">
        <Navigation />
        <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-custom-text">
                {course?.title || "Edit Course"}
              </h1>
              {course && !course.published && (
                <button
                  onClick={handlePublish}
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                >
                  Publish Course
                </button>
              )}
            </div>

            {/* Lessons List */}
            <div className="space-y-4 mb-8">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-custom-text mb-1">
                        Lesson {index + 1}: {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="text-custom-text/70 mb-2">{lesson.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingLesson(lesson);
                          setLessonForm({
                            title: lesson.title,
                            description: lesson.description || "",
                            videoUrl: lesson.video_url || "",
                            videoType: lesson.video_type || "youtube",
                            content: lesson.content || "",
                          });
                          setShowLessonForm(true);
                        }}
                        className="px-4 py-2 bg-dark-green-900/50 text-custom-text rounded-lg hover:bg-dark-green-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="px-4 py-2 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add/Edit Lesson Form */}
            {showLessonForm && (
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold text-custom-text mb-6">
                  {editingLesson ? "Edit Lesson" : "Add New Lesson"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">
                      Description
                    </label>
                    <textarea
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">
                      Video URL (YouTube or Vimeo)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={lessonForm.videoUrl}
                        onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                        className="flex-1 px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                      <select
                        value={lessonForm.videoType}
                        onChange={(e) => setLessonForm({ ...lessonForm, videoType: e.target.value as any })}
                        className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">
                      Notes (Rich Text)
                    </label>
                    <RichTextEditor
                      content={lessonForm.content}
                      onChange={(content) => setLessonForm({ ...lessonForm, content })}
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleSaveLesson}
                      disabled={saving}
                      className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : editingLesson ? "Update Lesson" : "Add Lesson"}
                    </button>
                    <button
                      onClick={() => {
                        setShowLessonForm(false);
                        setEditingLesson(null);
                        setLessonForm({
                          title: "",
                          description: "",
                          videoUrl: "",
                          videoType: "youtube",
                          content: "",
                        });
                      }}
                      className="px-6 py-3 border border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Lesson Button */}
            {!showLessonForm && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowLessonForm(true)}
                  className="w-full px-6 py-4 bg-dark-green-800/50 border-2 border-dashed border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/70 hover:border-cyber-green transition-colors"
                >
                  + Add Lesson
                </button>
                {skipLessons && (
                  <button
                    onClick={() => router.push("/products")}
                    className="w-full px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                  >
                    Skip for Now - Return to Products
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

