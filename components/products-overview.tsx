"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { RichTextEditor } from "@/components/rich-text-editor";

interface ProductCard {
  id: string;
  name: string;
  price: number;
  product_type?: string;
  e_learning_subtype?: string | null;
  course_id?: string | null;
  cover_image_url?: string | null;
  published?: boolean;
}

export function ProductsOverview() {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [offerType, setOfferType] = useState<"e-learning" | "appointment" | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    coverImageUrl: "",
    e_learning_subtype: "online-course" as "online-course" | "ebook" | "ai-prompt" | "live-webinar" | "other",
  });

  const loadProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("id, name, price, product_type, e_learning_subtype, course_id, courses(cover_image_url, published)")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;

      setProducts(
        (data || []).map((p: any) => {
          const course = Array.isArray(p.courses) ? p.courses[0] : p.courses;
          return {
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            product_type: p.product_type,
            e_learning_subtype: p.e_learning_subtype,
            course_id: p.course_id,
            cover_image_url: course?.cover_image_url || null,
            published: p.product_type === "appointment" ? true : !!course?.published,
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const manageHref = (product: ProductCard) => {
    if (product.product_type === "appointment") return `/dashboard/appointments/${product.id}`;
    return `/dashboard/elearning/${product.id}`;
  };

  const resetWizard = () => {
    setShowWizard(false);
    setStep(1);
    setOfferType(null);
    setForm({
      name: "",
      description: "",
      category: "",
      price: "",
      coverImageUrl: "",
      e_learning_subtype: "online-course",
    });
    setError("");
  };

  const handleCreate = async () => {
    if (!user || !offerType) return;
    const plain = form.description.replace(/<[^>]*>/g, "").trim();
    if (!form.name.trim() || !plain) {
      setError("Title and description are required.");
      setStep(2);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (offerType === "appointment") {
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("expert_id", user.id)
          .eq("product_type", "appointment")
          .maybeSingle();
        if (existing?.id) {
          router.push(`/dashboard/appointments/${existing.id}`);
          return;
        }
        const { data: product, error: insertError } = await supabase
          .from("products")
          .insert({
            expert_id: user.id,
            name: form.name.trim(),
            description: form.description,
            price: 0,
            pricing_type: "hourly",
            product_type: "appointment",
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        await supabase.from("questionnaires").insert({
          expert_id: user.id,
          product_id: product.id,
          type: "appointment",
          title: `${form.name.trim()} intake`,
        });

        router.push(`/dashboard/appointments/${product.id}`);
        return;
      }

      const price = form.price === "" ? 0 : Number(form.price);
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          expert_id: user.id,
          title: form.name.trim(),
          description: form.description,
          cover_image_url: form.coverImageUrl || null,
          price,
          is_free: price === 0,
          published: false,
          category: form.category || null,
        })
        .select("id")
        .single();
      if (courseError) throw courseError;

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          expert_id: user.id,
          name: form.name.trim(),
          description: form.description,
          price,
          pricing_type: "one-off",
          product_type: "e-learning",
          e_learning_subtype: form.e_learning_subtype,
          course_id: course.id,
        })
        .select("id")
        .single();
      if (productError) throw productError;

      await supabase.from("questionnaires").insert({
        expert_id: user.id,
        product_id: product.id,
        type: "course_interest",
        title: `${form.name.trim()} interest form`,
      });

      router.push(`/dashboard/elearning/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Products</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Overview</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage paid offerings. Click a card to open its detail hub. Lead magnets live under Leads & Marketing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowWizard(true);
            setStep(1);
            setOfferType(null);
          }}
          className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white"
        >
          + Add Product
        </button>
      </header>

      {error && !showWizard && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
          <p className="text-slate-400">No products yet. Create your first e-Learning or Appointment offering.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={manageHref(product)}
              className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition-all hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-xl"
            >
              <div className="relative aspect-video bg-slate-950">
                {product.cover_image_url ? (
                  <Image src={product.cover_image_url} alt="" fill className="object-cover" sizes="33vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                    {product.product_type === "appointment" ? "1-on-1" : "e-Learning"}
                  </div>
                )}
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    {product.product_type === "appointment" ? "Appointment" : "e-Learning"}
                  </span>
                </div>
                <span className="absolute bottom-3 right-3 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-950">
                  {product.price === 0 ? "Free" : `$${product.price}`}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="line-clamp-2 text-base font-semibold text-slate-50 group-hover:text-white">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      product.published
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {product.published ? "Published" : "Draft"}
                  </span>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white">Manage →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-50">Add Product</h2>
              <button type="button" onClick={resetWizard} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="mb-5 flex gap-2 text-xs font-semibold text-slate-500">
              <span className={step === 1 ? "text-slate-100" : ""}>1. Type</span>
              <span>→</span>
              <span className={step === 2 ? "text-slate-100" : ""}>2. Content</span>
              <span>→</span>
              <span className={step === 3 ? "text-slate-100" : ""}>3. Pricing</span>
            </div>

            {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</div>}

            {step === 1 && (
              <div className="space-y-3">
                {[
                  { id: "e-learning" as const, title: "e-Learning", desc: "Courses, ebooks, prompts, notes" },
                  { id: "appointment" as const, title: "Appointment", desc: "1-on-1 consultation sessions" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOfferType(opt.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      offerType === opt.id
                        ? "border-slate-200 bg-slate-100 text-slate-950"
                        : "border-slate-700 text-slate-200 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-semibold">{opt.title}</p>
                    <p className={`text-sm mt-1 ${offerType === opt.id ? "text-slate-600" : "text-slate-400"}`}>{opt.desc}</p>
                  </button>
                ))}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetWizard} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!offerType}
                    onClick={() => setStep(2)}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Product title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100"
                />
                {offerType === "e-learning" && (
                  <>
                    <select
                      value={form.e_learning_subtype}
                      onChange={(e) => setForm({ ...form, e_learning_subtype: e.target.value as typeof form.e_learning_subtype })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100"
                    >
                      <option value="online-course">Online Course</option>
                      <option value="ebook">Ebook / Download</option>
                      <option value="ai-prompt">AI Prompt</option>
                      <option value="live-webinar">Live Webinar</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Topic / category"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100"
                    />
                  </>
                )}
                <div className="rounded-xl border border-slate-700 overflow-hidden">
                  <RichTextEditor
                    content={form.description}
                    onChange={(description) => setForm({ ...form, description })}
                    placeholder="Describe your offering…"
                  />
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const plain = form.description.replace(/<[^>]*>/g, "").trim();
                      if (!form.name.trim() || !plain) {
                        setError("Title and description are required.");
                        return;
                      }
                      if (offerType === "e-learning" && !form.category.trim()) {
                        setError("Topic / category is required for e-Learning.");
                        return;
                      }
                      setError("");
                      setStep(3);
                    }}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {offerType === "e-learning" ? (
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">Price (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0 for free"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-500">You can publish and add lessons in the e-Learning hub next.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Appointment pricing is set per timeslot in the Appointments hub. Create the offering, then configure availability.
                  </p>
                )}
                <div className="flex justify-between gap-2 pt-2">
                  <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCreate}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {saving ? "Creating…" : "Create & manage"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
