"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/rich-text-editor";

export interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_type: "youtube" | "vimeo" | null;
  content: string | null;
  order_index: number;
}

interface CourseLessonTreeEditorProps {
  courseId: string;
  lessons: CourseLesson[];
  onLessonsChange: (lessons: CourseLesson[]) => void;
}

function detectVideoType(url: string): "youtube" | "vimeo" {
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "youtube";
}

function SortableLessonRow({
  lesson,
  index,
  selected,
  onSelect,
}: {
  lesson: CourseLesson;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
        selected
          ? "border-slate-200 bg-slate-100 text-slate-950"
          : "border-slate-800 bg-slate-900/70 text-slate-200 hover:border-slate-600"
      } ${isDragging ? "opacity-70 shadow-xl z-10" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-slate-500 hover:text-slate-300 px-1"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button type="button" onClick={onSelect} className="flex-1 text-left min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Lesson {index + 1}</p>
        <p className="truncate text-sm font-medium">{lesson.title || "Untitled lesson"}</p>
      </button>
    </div>
  );
}

export function CourseLessonTreeEditor({
  courseId,
  lessons,
  onLessonsChange,
}: CourseLessonTreeEditorProps) {
  const supabase = createClient();
  const [selectedId, setSelectedId] = useState<string | null>(lessons[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    videoType: "youtube" as "youtube" | "vimeo",
    content: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selected = useMemo(
    () => lessons.find((l) => l.id === selectedId) || null,
    [lessons, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setForm({ title: "", description: "", videoUrl: "", videoType: "youtube", content: "" });
      return;
    }
    setForm({
      title: selected.title || "",
      description: selected.description || "",
      videoUrl: selected.video_url || "",
      videoType: selected.video_type || "youtube",
      content: selected.content || "",
    });
  }, [selected]);

  useEffect(() => {
    if (selectedId && !lessons.some((l) => l.id === selectedId)) {
      setSelectedId(lessons[0]?.id || null);
    }
  }, [lessons, selectedId]);

  const persistOrder = async (ordered: CourseLesson[]) => {
    await Promise.all(
      ordered.map((lesson, index) =>
        supabase.from("course_lessons").update({ order_index: index }).eq("id", lesson.id)
      )
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(lessons, oldIndex, newIndex).map((l, i) => ({ ...l, order_index: i }));
    onLessonsChange(next);
    try {
      await persistOrder(next);
    } catch (err) {
      console.error(err);
      setError("Failed to save lesson order");
    }
  };

  const handleAddLesson = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const orderIndex = lessons.length;
      const { data, error: insertError } = await supabase
        .from("course_lessons")
        .insert({
          course_id: courseId,
          title: `Lesson ${orderIndex + 1}`,
          description: null,
          video_url: null,
          video_type: null,
          content: null,
          order_index: orderIndex,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      const next = [...lessons, data as CourseLesson];
      onLessonsChange(next);
      setSelectedId(data.id);
      setSuccess("Lesson added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!selected) return;
    if (!form.title.trim()) {
      setError("Lesson title is required");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const videoType = form.videoUrl ? detectVideoType(form.videoUrl) || form.videoType : null;
      const { error: updateError } = await supabase
        .from("course_lessons")
        .update({
          title: form.title.trim(),
          description: form.description || null,
          video_url: form.videoUrl || null,
          video_type: form.videoUrl ? videoType : null,
          content: form.content || null,
        })
        .eq("id", selected.id);
      if (updateError) throw updateError;
      onLessonsChange(
        lessons.map((l) =>
          l.id === selected.id
            ? {
                ...l,
                title: form.title.trim(),
                description: form.description || null,
                video_url: form.videoUrl || null,
                video_type: form.videoUrl ? (videoType as "youtube" | "vimeo") : null,
                content: form.content || null,
              }
            : l
        )
      );
      setSuccess("Lesson saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!selected) return;
    if (!confirm("Delete this lesson?")) return;
    setSaving(true);
    setError("");
    try {
      const { error: deleteError } = await supabase.from("course_lessons").delete().eq("id", selected.id);
      if (deleteError) throw deleteError;
      const next = lessons.filter((l) => l.id !== selected.id).map((l, i) => ({ ...l, order_index: i }));
      onLessonsChange(next);
      setSelectedId(next[0]?.id || null);
      await persistOrder(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lesson");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-semibold text-slate-100">Module / Lessons</h3>
          <button
            type="button"
            onClick={handleAddLesson}
            disabled={saving}
            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-50"
          >
            + Add
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {lessons.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-500">No lessons yet. Add your first lesson.</p>
              ) : (
                lessons.map((lesson, index) => (
                  <SortableLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    selected={lesson.id === selectedId}
                    onSelect={() => setSelectedId(lesson.id)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        {!selected ? (
          <div className="py-16 text-center text-sm text-slate-500">Select a lesson to edit content.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-50">Lesson editor</h3>
              <button
                type="button"
                onClick={handleDeleteLesson}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Short description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Video embed</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={form.videoUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setForm({
                      ...form,
                      videoUrl: url,
                      videoType: url ? detectVideoType(url) : form.videoType,
                    });
                  }}
                  placeholder="Paste YouTube or Vimeo URL"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none focus:border-slate-400"
                />
                <select
                  value={form.videoType}
                  onChange={(e) => setForm({ ...form, videoType: e.target.value as "youtube" | "vimeo" })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-slate-500">Provider is auto-detected from the URL when possible.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Lesson content</label>
              <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <RichTextEditor
                  content={form.content}
                  onChange={(content) => setForm({ ...form, content })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}

            <button
              type="button"
              onClick={handleSaveLesson}
              disabled={saving}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save lesson"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
