"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CourseLessonTreeEditor, type CourseLesson } from "@/components/course-lesson-tree-editor";

type HubTab = "details" | "lessons" | "members";

interface ElearningHubProps {
  productId: string;
}

export function ElearningHub({ productId }: ElearningHubProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<HubTab>("details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    coverImageUrl: "",
    published: false,
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("expert_id", user.id)
        .single();
      if (productError) throw productError;
      if (productData.product_type === "appointment") {
        router.replace(`/dashboard/appointments/${productId}`);
        return;
      }
      setProduct(productData);

      let courseData = null;
      if (productData.course_id) {
        const { data, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", productData.course_id)
          .single();
        if (courseError) throw courseError;
        courseData = data;
        setCourse(data);

        const { data: lessonsData } = await supabase
          .from("course_lessons")
          .select("*")
          .eq("course_id", data.id)
          .order("order_index", { ascending: true });
        setLessons(lessonsData || []);
      }

      setForm({
        name: productData.name || "",
        description: productData.description || "",
        category: courseData?.category || "",
        price: String(productData.price ?? courseData?.price ?? 0),
        coverImageUrl: courseData?.cover_image_url || "",
        published: !!courseData?.published,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load e-Learning");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (courseId: string) => {
    const { data: enrollments } = await supabase
      .from("course_enrollments")
      .select("id, user_id, user_email, created_at, amount_paid")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    const rows = enrollments || [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    let profiles: Record<string, { name?: string; email?: string }> = {};
    if (userIds.length) {
      const { data } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
      data?.forEach((p) => {
        profiles[p.id] = p;
      });
    }
    setMembers(
      rows.map((r) => ({
        id: r.id,
        name: profiles[r.user_id]?.name || r.user_email?.split("@")[0] || "Student",
        email: profiles[r.user_id]?.email || r.user_email || "—",
        created_at: r.created_at,
        amount_paid: r.amount_paid,
      }))
    );
  };

  useEffect(() => {
    load();
  }, [productId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "members" && course?.id) {
      loadMembers(course.id);
    }
  }, [tab, course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveDetails = async () => {
    if (!product || !user) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const price = Number(form.price) || 0;
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: form.name.trim(),
          description: form.description,
          price,
        })
        .eq("id", product.id);
      if (productError) throw productError;

      if (course?.id) {
        const { error: courseError } = await supabase
          .from("courses")
          .update({
            title: form.name.trim(),
            description: form.description,
            category: form.category || null,
            cover_image_url: form.coverImageUrl || null,
            price,
            is_free: price === 0,
            published: form.published,
          })
          .eq("id", course.id);
        if (courseError) throw courseError;
      }
      setSuccess("Course details saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `course-covers/${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("blog-resources").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("blog-resources").getPublicUrl(path);
    setForm((f) => ({ ...f, coverImageUrl: data.publicUrl }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
        <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-400 mb-4">e-Learning product not found.</p>
        <Link href="/dashboard/products" className="text-sky-400 hover:text-sky-300">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const tabs: { id: HubTab; label: string }[] = [
    { id: "details", label: "Course Details" },
    { id: "lessons", label: "Lessons Builder" },
    { id: "members", label: "Course Members" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/elearning" className="text-sm text-slate-400 hover:text-slate-200">
            ← e-Learning
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-400">Classroom hub — details, lessons, and members for this course.</p>
        </div>
        {course?.id && (
          <Link
            href={`/courses/${course.id}`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            View public page
          </Link>
        )}
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-slate-100 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{success}</div>}

      {tab === "details" && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Title</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Cover image</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await handleCoverUpload(file);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed");
                }
              }}
              className="w-full text-sm text-slate-300"
            />
            {form.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.coverImageUrl} alt="" className="mt-3 max-h-40 rounded-xl border border-slate-700 object-cover" />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Public description</label>
            <div className="overflow-hidden rounded-xl border border-slate-700">
              <RichTextEditor
                content={form.description}
                onChange={(description) => setForm({ ...form, description })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="rounded border-slate-600"
            />
            Published (visible to learners)
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDetails}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      )}

      {tab === "lessons" && (
        <div className="space-y-3">
          {!course?.id ? (
            <p className="text-slate-400 text-sm">No linked classroom for this product yet.</p>
          ) : (
            <CourseLessonTreeEditor
              courseId={course.id}
              lessons={lessons}
              onLessonsChange={setLessons}
            />
          )}
        </div>
      )}

      {tab === "members" && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          {members.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">No enrolled students yet.</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Enrollment date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-800/70 last:border-0">
                    <td className="px-4 py-3 text-slate-100">{m.name}</td>
                    <td className="px-4 py-3 text-slate-300">{m.email}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-300">Enrolled</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
