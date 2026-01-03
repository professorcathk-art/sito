"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RichTextEditor } from "@/components/rich-text-editor";
import Link from "next/link";

interface Course {
  id: string;
  expert_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price: number;
  is_free: boolean;
  published: boolean;
  category: string | null;
}

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
    published: true, // Courses are always published from product page
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
      // Fetch courses where user is expert
      const { data: expertCourses, error: expertError } = await supabase
        .from("courses")
        .select("*")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      if (expertError) throw expertError;

      // Fetch courses where user is enrolled
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select("course_id, courses(*)")
        .eq("user_id", user.id);

      if (enrollmentError) throw enrollmentError;

      // Combine expert courses and enrolled courses
      const enrolledCourses = (enrollments || []).map((e: any) => e.courses).filter(Boolean);
      const allCourses = [...(expertCourses || []), ...enrolledCourses];
      
      // Remove duplicates
      const uniqueCourses = Array.from(
        new Map(allCourses.map((c: any) => [c.id, c])).values()
      );

      setCourses(uniqueCourses);
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
      published: true, // Courses are always published from product page
      category: course.category || "",
    });
    await fetchLessons(course.id);
  };

  const handleSaveCourse = async () => {
    if (!selectedCourse || !user) return;

    // Authorization check: Only course owner can edit
    if (selectedCourse.expert_id !== user.id) {
      alert("You don't have permission to edit this course. Only the course owner can make changes.");
      return;
    }

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
          published: true, // Always published - courses are published from product page
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

    // Authorization check: Only course owner can add lessons
    if (selectedCourse.expert_id !== user.id) {
      alert("You don't have permission to add lessons to this course. Only the course owner can make changes.");
      return;
    }

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

    // Authorization check: Only course owner can edit
    if (selectedCourse.expert_id !== user.id) {
      alert("You don't have permission to edit this course. Only the course owner can make changes.");
      return;
    }

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

    // Authorization check: Only course owner can delete lessons
    if (selectedCourse.expert_id !== user.id) {
      alert("You don't have permission to delete lessons from this course. Only the course owner can make changes.");
      return;
    }

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
          <h1 className="text-4xl font-bold text-custom-text mb-8">Classroom</h1>

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

              {/* Course Details - View/Edit based on ownership */}
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-custom-text mb-6">Course Details</h2>
                {selectedCourse.expert_id === user?.id ? (
                  // Owner can edit
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
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveCourse}
                        disabled={saving}
                        className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Course Details"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedCourse || !user) return;
                          if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
                          
                          try {
                            // Delete associated product first
                            const { error: productError } = await supabase
                              .from("products")
                              .delete()
                              .eq("course_id", selectedCourse.id)
                              .eq("expert_id", user.id);
                            
                            if (productError) throw productError;
                            
                            // Delete course lessons
                            const { error: lessonsError } = await supabase
                              .from("course_lessons")
                              .delete()
                              .eq("course_id", selectedCourse.id);
                            
                            if (lessonsError) throw lessonsError;
                            
                            // Delete course enrollments
                            const { error: enrollmentsError } = await supabase
                              .from("course_enrollments")
                              .delete()
                              .eq("course_id", selectedCourse.id);
                            
                            if (enrollmentsError) throw enrollmentsError;
                            
                            // Finally delete the course
                            const { error: courseError } = await supabase
                              .from("courses")
                              .delete()
                              .eq("id", selectedCourse.id)
                              .eq("expert_id", user.id);
                            
                            if (courseError) throw courseError;
                            
                            alert("Course deleted successfully!");
                            setSelectedCourse(null);
                            await fetchCourses();
                          } catch (err) {
                            console.error("Error deleting course:", err);
                            alert("Failed to delete course. Please try again.");
                          }
                        }}
                        className="px-6 py-3 bg-red-900/50 text-red-300 font-semibold rounded-lg hover:bg-red-900/70 transition-colors"
                      >
                        Delete Course
                      </button>
                    </div>
                  </div>
                ) : (
                  // Non-owner view-only
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-custom-text/70 mb-2">Title</label>
                      <p className="text-custom-text">{selectedCourse.title}</p>
                    </div>
                    {selectedCourse.description && (
                      <div>
                        <label className="block text-sm font-medium text-custom-text/70 mb-2">Description</label>
                        <div 
                          className="prose prose-invert prose-lg max-w-none blog-content text-custom-text/80"
                          dangerouslySetInnerHTML={{ __html: selectedCourse.description }}
                        />
                      </div>
                    )}
                    {selectedCourse.cover_image_url && (
                      <div>
                        <label className="block text-sm font-medium text-custom-text/70 mb-2">Cover Image</label>
                        <img
                          src={selectedCourse.cover_image_url}
                          alt={selectedCourse.title}
                          className="w-full max-w-md rounded-lg"
                        />
                      </div>
                    )}
                    {selectedCourse.category && (
                      <div>
                        <label className="block text-sm font-medium text-custom-text/70 mb-2">Category</label>
                        <p className="text-custom-text">{selectedCourse.category}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-custom-text/70 mb-2">Price</label>
                      <p className="text-custom-text">
                        {selectedCourse.is_free ? "Free" : `$${selectedCourse.price}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lessons - View/Edit based on ownership */}
              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-custom-text mb-6">Lessons</h2>
                {lessons.length === 0 ? (
                  <p className="text-custom-text/70 mb-4">No lessons added yet.</p>
                ) : (
                  <div className="space-y-4 mb-6">
                    {lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-custom-text mb-1">
                              {index + 1}. {lesson.title}
                            </p>
                            {lesson.description && (
                              <p className="text-custom-text/70 text-sm mb-2">{lesson.description}</p>
                            )}
                            {lesson.video_url && (
                              <a
                                href={lesson.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyber-green hover:text-cyber-green-light text-sm"
                              >
                                Watch Video →
                              </a>
                            )}
                            {lesson.content && (
                              <div 
                                className="prose prose-invert prose-sm max-w-none blog-content text-custom-text/80 mt-2"
                                dangerouslySetInnerHTML={{ __html: lesson.content }}
                              />
                            )}
                          </div>
                          {/* Only show edit/delete buttons for course owner */}
                          {selectedCourse.expert_id === user?.id && (
                            <div className="flex gap-2 ml-4">
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Lesson Form - Only show for course owner */}
                {selectedCourse.expert_id === user?.id && (
                  <>
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

                    {/* Add Lesson Button - Only show for course owner */}
                    {!showLessonForm && (
                      <button
                        onClick={() => setShowLessonForm(true)}
                        className="w-full px-6 py-4 bg-dark-green-800/50 border-2 border-dashed border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/70 hover:border-cyber-green transition-colors"
                      >
                        + Add Lesson
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

