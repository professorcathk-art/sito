"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RichTextEditor } from "@/components/rich-text-editor";
import Link from "next/link";

      const { error } = await supabase
        .from("courses")
        .update({
          title: courseForm.title,
          description: courseForm.description || null,
          cover_image_url: courseForm.coverImageUrl || null,
          price: parseFloat(courseForm.price) || 0,
          is_free: courseForm.isFree,
          published: courseForm.published,
          category: courseForm.category || null,
        })
        .eq("id", selectedCourse.id)
        .eq("expert_id", user.id);

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: "youtube" | "vimeo" | null;
  content: string | null;
  order_index: number;
}

export default function ManageCoursePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    videoType: "youtube" as "youtube" | "vimeo",
    content: "",
  });
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    price: "0",
    isFree: true,
    published: false,
    category: "",
  });
  const [isRichTextMode, setIsRichTextMode] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCourses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      console.error("Error fetching lessons:", err);
    }
  };

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      coverImageUrl: course.cover_image_url || "",
      price: course.price.toString(),
      isFree: course.is_free,
      published: course.published,
      category: course.category || "",
    });
    await fetchLessons(course.id);
  };

  const handleSaveCourse = async () => {
    if (!selectedCourse || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({
          title: courseForm.title,
          description: courseForm.description || null,
          cover_image_url: courseForm.coverImageUrl || null,
          price: parseFloat(courseForm.price) || 0,
          is_free: courseForm.isFree,
          published: courseForm.published,
          category: courseForm.category || null,
        })
        .eq("id", selectedCourse.id)
        .eq("expert_id", user.id);

      if (error) throw error;
      alert("Course updated successfully!");
      await fetchCourses();
      // Fetch updated course from database
      const { data: updatedCourseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", selectedCourse.id)
        .single();
      if (updatedCourseData) {
        setSelectedCourse(updatedCourseData);
      }
    } catch (err) {
      console.error("Error saving course:", err);
      alert("Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCourse) return;

    try {
      const newLesson = {
        course_id: selectedCourse.id,
        title: lessonForm.title,
        description: lessonForm.description || null,
        video_url: lessonForm.videoUrl || null,
        video_type: lessonForm.videoUrl ? lessonForm.videoType : null,
        content: lessonForm.content || null,
        order_index: lessons.length,
      };

      const { error } = await supabase.from("course_lessons").insert(newLesson);

      if (error) throw error;
      alert("Lesson added successfully!");
      setLessonForm({
        title: "",
        description: "",
        videoUrl: "",
        videoType: "youtube",
        content: "",
      });
      setShowLessonForm(false);
      await fetchLessons(selectedCourse.id);
    } catch (err) {
      console.error("Error adding lesson:", err);
      alert("Failed to add lesson.");
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      videoUrl: lesson.video_url || "",
      videoType: lesson.video_type || "youtube",
      content: lesson.content || "",
    });
    setShowLessonForm(true);
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingLesson || !selectedCourse) return;

    try {
      const updatedLesson = {
        title: lessonForm.title,
        description: lessonForm.description || null,
        video_url: lessonForm.videoUrl || null,
        video_type: lessonForm.videoUrl ? lessonForm.videoType : null,
        content: lessonForm.content || null,
      };

      const { error } = await supabase
        .from("course_lessons")
        .update(updatedLesson)
        .eq("id", editingLesson.id)
        .eq("course_id", selectedCourse.id);

      if (error) throw error;
      alert("Lesson updated successfully!");
      setLessonForm({
        title: "",
        description: "",
        videoUrl: "",
        videoType: "youtube",
        content: "",
      });
      setEditingLesson(null);
      setShowLessonForm(false);
      await fetchLessons(selectedCourse.id);
    } catch (err) {
      console.error("Error updating lesson:", err);
      alert("Failed to update lesson.");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    if (!user || !selectedCourse) return;

    try {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId)
        .eq("course_id", selectedCourse.id);

      if (error) throw error;
      alert("Lesson deleted successfully!");
      await fetchLessons(selectedCourse.id);
    } catch (err) {
      console.error("Error deleting lesson:", err);
      alert("Failed to delete lesson.");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-custom-text">Loading courses...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-custom-text mb-8">Manage Course</h1>

          {!selectedCourse ? (
            <div className="space-y-4">
              {courses.length === 0 ? (
                <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
                  <p className="text-custom-text/80 mb-4">No courses found.</p>
                  <p className="text-custom-text/60 text-sm mb-4">
                    Create a course from the Products page first.
                  </p>
                  <Link
                    href="/products"
                    className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                  >
                    Go to Products
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 cursor-pointer hover:border-cyber-green transition-colors"
                    >
                      {course.cover_image_url && (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="text-xl font-bold text-custom-text mb-2">{course.title}</h3>
                      <p className="text-custom-text/70 text-sm mb-4 line-clamp-2">
                        {course.description || "No description"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-cyber-green font-semibold">
                          {course.is_free ? "Free" : `$${course.price}`}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${course.published ? "bg-green-900/50 text-green-300" : "bg-yellow-900/50 text-yellow-300"}`}>
                          {course.published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-cyber-green hover:text-cyber-green-light mb-4"
              >
                ← Back to Courses
              </button>

              {/* Course Details Form */}
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-custom-text mb-6">Course Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Title</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Description</label>
                    <RichTextEditor
                      content={courseForm.description}
                      onChange={(newContent) => setCourseForm({ ...courseForm, description: newContent })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Cover Image URL</label>
                    <input
                      type="text"
                      value={courseForm.coverImageUrl}
                      onChange={(e) => setCourseForm({ ...courseForm, coverImageUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Category</label>
                    <input
                      type="text"
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      placeholder="e.g., AI Courses, Business, Design, Marketing"
                    />
                    <p className="text-xs text-custom-text/60 mt-1">Categorize your course to help users discover it</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-custom-text mb-2">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                        disabled={courseForm.isFree}
                        className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        id="is_free"
                        checked={courseForm.isFree}
                        onChange={(e) => setCourseForm({ ...courseForm, isFree: e.target.checked })}
                        className="h-4 w-4 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                      />
                      <label htmlFor="is_free" className="ml-2 block text-sm text-custom-text">
                        Free Course
                      </label>
                    </div>
                    <div className="flex items-center mt-6">
                      <input
                        type="checkbox"
                        id="published"
                        checked={courseForm.published}
                        onChange={(e) => setCourseForm({ ...courseForm, published: e.target.checked })}
                        className="h-4 w-4 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                      />
                      <label htmlFor="published" className="ml-2 block text-sm text-custom-text">
                        Published
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCourse}
                    disabled={saving}
                    className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Course Details"}
                  </button>
                </div>
              </div>

              {/* Lessons Management */}
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-custom-text mb-6">Lessons</h2>
                {lessons.length === 0 && !showLessonForm ? (
                  <p className="text-custom-text/70 mb-4">No lessons added yet.</p>
                ) : (
                  <div className="space-y-4 mb-6">
                    {lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-lg font-semibold text-custom-text">
                            {index + 1}. {lesson.title}
                          </p>
                          <p className="text-custom-text/70 text-sm">{lesson.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditLesson(lesson)}
                            className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-lg hover:bg-blue-900/70 transition-colors text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="px-3 py-1 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Lesson Form */}
                {showLessonForm && (
                  <div className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-6 mt-6">
                    <h3 className="text-xl font-bold text-custom-text mb-4">
                      {editingLesson ? "Edit Lesson" : "Add New Lesson"}
                    </h3>
                    <form onSubmit={editingLesson ? handleUpdateLesson : handleAddLesson} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">Title</label>
                        <input
                          type="text"
                          value={lessonForm.title}
                          onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">Description</label>
                        <textarea
                          value={lessonForm.description}
                          onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">Video URL (YouTube/Vimeo)</label>
                        <input
                          type="text"
                          value={lessonForm.videoUrl}
                          onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                          placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                        />
                      </div>
                      {lessonForm.videoUrl && (
                        <div>
                          <label className="block text-sm font-medium text-custom-text mb-2">Video Type</label>
                          <select
                            value={lessonForm.videoType}
                            onChange={(e) => setLessonForm({ ...lessonForm, videoType: e.target.value as "youtube" | "vimeo" })}
                            className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="vimeo">Vimeo</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-custom-text">
                            Lesson Content <span className="text-xs text-custom-text/60">(Rich Text)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsRichTextMode(!isRichTextMode)}
                            className="px-3 py-1 text-xs font-medium bg-dark-green-800/50 border border-cyber-green/30 rounded-lg text-custom-text hover:bg-dark-green-800 hover:border-cyber-green transition-colors"
                          >
                            {isRichTextMode ? "Plain Text" : "Rich Text"}
                          </button>
                        </div>
                        {isRichTextMode ? (
                          <RichTextEditor
                            content={lessonForm.content}
                            onChange={(newContent) => setLessonForm({ ...lessonForm, content: newContent })}
                          />
                        ) : (
                          <textarea
                            value={lessonForm.content}
                            onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                            placeholder="Enter lesson content (plain text)"
                          ></textarea>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                        >
                          {editingLesson ? "Update Lesson" : "Add Lesson"}
                        </button>
                        <button
                          type="button"
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
                    </form>
                  </div>
                )}

                {/* Add Lesson Button */}
                {!showLessonForm && (
                  <button
                    onClick={() => setShowLessonForm(true)}
                    className="w-full px-6 py-4 bg-dark-green-800/50 border-2 border-dashed border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/70 hover:border-cyber-green transition-colors"
                  >
                    + Add Lesson
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

