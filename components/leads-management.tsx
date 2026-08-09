"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { EmailBroadcastsPanel } from "@/components/leads/email-broadcasts-panel";

interface FormFieldDraft {
  id?: string;
  field_type: "text" | "email" | "textarea" | "select";
  label: string;
  placeholder: string;
  required: boolean;
  options: string;
  order_index: number;
}

interface LeadMagnet {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  placeholder: string | null;
  success_message: string | null;
  cover_image_url: string | null;
  material_type: "file" | "link";
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  external_link: string | null;
  questionnaire_id: string | null;
  instant_download: boolean;
  is_active: boolean;
  created_at: string;
  leads_count?: number;
  form_title?: string | null;
}

interface LeadRow {
  id: string;
  email: string;
  source: string;
  magnet_id?: string | null;
  created_at: string;
  responses?: Record<string, string>;
}

interface EditorState {
  id?: string;
  title: string;
  subtitle: string;
  ctaText: string;
  placeholder: string;
  successMessage: string;
  coverImageUrl: string;
  materialType: "file" | "link";
  fileUrl: string;
  fileName: string;
  fileType: string;
  externalLink: string;
  questionnaireId: string | null;
  instantDownload: boolean;
  fields: FormFieldDraft[];
}

const emptyEditor = (): EditorState => ({
  title: "Free AI Prompt Sheet",
  subtitle: "Get my free guide delivered instantly.",
  ctaText: "Download free PDF",
  placeholder: "Enter your email",
  successMessage: "You're in! Here's your download.",
  coverImageUrl: "",
  materialType: "file",
  fileUrl: "",
  fileName: "",
  fileType: "",
  externalLink: "",
  questionnaireId: null,
  instantDownload: true,
  fields: [
    { field_type: "email", label: "Email", placeholder: "you@example.com", required: true, options: "", order_index: 0 },
    { field_type: "text", label: "Name", placeholder: "Your name", required: false, options: "", order_index: 1 },
  ],
});

export function LeadsManagement() {
  const { user } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [filterMagnetId, setFilterMagnetId] = useState<string>("all");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tablesReady, setTablesReady] = useState(true);
  const [activeTab, setActiveTab] = useState<"magnets" | "crm" | "broadcasts">("magnets");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const { data: magnetsData, error: magnetsError } = await supabase
        .from("lead_magnets")
        .select("*")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      if (magnetsError && /relation|does not exist|lead_magnets/i.test(magnetsError.message)) {
        setTablesReady(false);
        setMagnets([]);
        // Still load legacy CRM
      } else if (magnetsError) {
        throw magnetsError;
      } else {
        setTablesReady(true);
        const list = (magnetsData || []) as LeadMagnet[];

        // Counts
        const ids = list.map((m) => m.id);
        let counts: Record<string, number> = {};
        if (ids.length) {
          const { data: subs } = await supabase
            .from("lead_submissions")
            .select("lead_magnet_id")
            .in("lead_magnet_id", ids);
          (subs || []).forEach((s) => {
            counts[s.lead_magnet_id] = (counts[s.lead_magnet_id] || 0) + 1;
          });
        }

        // Form titles
        const qIds = list.map((m) => m.questionnaire_id).filter(Boolean) as string[];
        let formTitles: Record<string, string> = {};
        if (qIds.length) {
          const { data: qs } = await supabase.from("questionnaires").select("id, title").in("id", qIds);
          qs?.forEach((q) => {
            formTitles[q.id] = q.title;
          });
        }

        setMagnets(
          list.map((m) => ({
            ...m,
            leads_count: counts[m.id] || 0,
            form_title: m.questionnaire_id ? formTitles[m.questionnaire_id] || "Custom form" : null,
          }))
        );

        // Migrate legacy storefront block → first magnet if empty
        if (list.length === 0) {
          await migrateLegacyBlock();
        }
      }

      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const migrateLegacyBlock = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("storefront_blocks")
      .eq("id", user.id)
      .maybeSingle();
    const blocks = (profile?.storefront_blocks as Array<{ type: string; data?: Record<string, unknown> }>) || [];
    const leadBlock = blocks.find((b) => b.type === "lead_magnet");
    if (!leadBlock?.data?.title) return;

    const { data: created } = await supabase
      .from("lead_magnets")
      .insert({
        expert_id: user.id,
        title: (leadBlock.data.title as string) || "Get my free guide",
        subtitle: (leadBlock.data.subtitle as string) || null,
        cta_text: (leadBlock.data.ctaText as string) || "Download free",
        placeholder: (leadBlock.data.placeholder as string) || "Enter your email",
        success_message: (leadBlock.data.successMessage as string) || "You're in!",
        material_type: "link",
        external_link: null,
      })
      .select("*")
      .single();

    if (created) {
      // Point block at new magnet id
      const nextBlocks = blocks.map((b) =>
        b.type === "lead_magnet"
          ? { ...b, data: { ...b.data, leadMagnetId: created.id, title: created.title } }
          : b
      );
      await supabase.from("profiles").update({ storefront_blocks: nextBlocks }).eq("id", user.id);
      setMagnets([{ ...created, leads_count: 0, form_title: null }]);
    }
  };

  const loadLeads = async () => {
    if (!user) return;
    const rows: LeadRow[] = [];

    // New submissions
    const { data: subs, error: subsError } = await supabase
      .from("lead_submissions")
      .select("id, email, lead_magnet_id, responses, created_at")
      .eq("expert_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!subsError && subs) {
      const magnetNames = Object.fromEntries(magnets.map((m) => [m.id, m.title]));
      // Refresh names if magnets not yet in state
      const missing = Array.from(
        new Set(subs.map((s) => s.lead_magnet_id).filter((id) => !magnetNames[id]))
      );
      if (missing.length) {
        const { data: ms } = await supabase.from("lead_magnets").select("id, title").in("id", missing);
        ms?.forEach((m) => {
          magnetNames[m.id] = m.title;
        });
      }
      rows.push(
        ...subs.map((s) => ({
          id: `sub-${s.id}`,
          email: s.email,
          source: magnetNames[s.lead_magnet_id] || "Lead magnet",
          magnet_id: s.lead_magnet_id,
          created_at: s.created_at,
          responses: (s.responses as Record<string, string>) || {},
        }))
      );
    }

    // Legacy contact_messages + product interests
    const { data: products } = await supabase.from("products").select("id, name").eq("expert_id", user.id);
    const productIds = (products || []).map((p) => p.id);
    const productNameById = Object.fromEntries((products || []).map((p) => [p.id, p.name]));

    if (productIds.length) {
      const { data: interests } = await supabase
        .from("product_interests")
        .select("id, product_id, user_id, user_email, created_at")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .limit(100);
      const userIds = Array.from(new Set((interests || []).map((r) => r.user_id).filter(Boolean)));
      let profiles: Record<string, { email?: string }> = {};
      if (userIds.length) {
        const { data } = await supabase.from("profiles").select("id, email").in("id", userIds);
        data?.forEach((p) => {
          profiles[p.id] = p;
        });
      }
      rows.push(
        ...(interests || []).map((row) => ({
          id: `interest-${row.id}`,
          email: profiles[row.user_id]?.email || row.user_email || "—",
          source: productNameById[row.product_id] || "Product interest",
          magnet_id: null,
          created_at: row.created_at,
        }))
      );
    }

    let contactRows: Array<{ id: string; email: string; subject: string; created_at: string }> = [];
    const byColumn = await supabase
      .from("contact_messages")
      .select("id, email, subject, created_at")
      .eq("expert_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!byColumn.error && byColumn.data) {
      contactRows = byColumn.data;
    } else {
      const bySubject = await supabase
        .from("contact_messages")
        .select("id, email, subject, created_at")
        .ilike("subject", `%Storefront lead [${user.id}]%`)
        .order("created_at", { ascending: false })
        .limit(100);
      contactRows = bySubject.data || [];
    }
    rows.push(
      ...contactRows.map((row) => ({
        id: `contact-${row.id}`,
        email: row.email || "—",
        source: row.subject?.replace(/^Storefront lead \[[^\]]+\]:\s*/, "") || "Storefront lead",
        magnet_id: null,
        created_at: row.created_at,
      }))
    );

    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setLeads(rows);
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredLeads = useMemo(() => {
    if (filterMagnetId === "all") return leads;
    return leads.filter((l) => l.magnet_id === filterMagnetId);
  }, [leads, filterMagnetId]);

  const broadcastLeadCounts = useMemo(() => {
    const byMagnet: Record<string, number> = {};
    const emailsAll = new Set<string>();
    const emailsByMagnet: Record<string, Set<string>> = {};
    leads.forEach((l) => {
      const email = (l.email || "").toLowerCase();
      if (!email || email === "—") return;
      emailsAll.add(email);
      if (l.magnet_id) {
        if (!emailsByMagnet[l.magnet_id]) emailsByMagnet[l.magnet_id] = new Set();
        emailsByMagnet[l.magnet_id].add(email);
      }
    });
    Object.entries(emailsByMagnet).forEach(([id, set]) => {
      byMagnet[id] = set.size;
    });
    return { all: emailsAll.size, byMagnet };
  }, [leads]);

  const openCreate = () => {
    setEditor(emptyEditor());
    setEditorOpen(true);
    setSuccess("");
    setError("");
  };

  const openEdit = async (magnet: LeadMagnet) => {
    setError("");
    let fields: FormFieldDraft[] = emptyEditor().fields;
    if (magnet.questionnaire_id) {
      const { data: fieldRows } = await supabase
        .from("questionnaire_fields")
        .select("*")
        .eq("questionnaire_id", magnet.questionnaire_id)
        .order("order_index", { ascending: true });
      if (fieldRows?.length) {
        fields = fieldRows.map((f, i) => ({
          id: f.id,
          field_type: (["text", "email", "textarea", "select"].includes(f.field_type)
            ? f.field_type
            : "text") as FormFieldDraft["field_type"],
          label: f.label,
          placeholder: f.placeholder || "",
          required: !!f.required,
          options: Array.isArray(f.options) ? (f.options as string[]).join(", ") : "",
          order_index: f.order_index ?? i,
        }));
      }
    }
    setEditor({
      id: magnet.id,
      title: magnet.title,
      subtitle: magnet.subtitle || "",
      ctaText: magnet.cta_text || "Download free",
      placeholder: magnet.placeholder || "Enter your email",
      successMessage: magnet.success_message || "You're in!",
      coverImageUrl: magnet.cover_image_url || "",
      materialType: magnet.material_type || "file",
      fileUrl: magnet.file_url || "",
      fileName: magnet.file_name || "",
      fileType: magnet.file_type || "",
      externalLink: magnet.external_link || "",
      questionnaireId: magnet.questionnaire_id,
      instantDownload: magnet.instant_download !== false,
      fields,
    });
    setEditorOpen(true);
  };

  const uploadFile = async (file: File, kind: "material" | "cover") => {
    if (!user) return;
    setUploading(true);
    setError("");
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `lead-magnets/${user.id}/${kind}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("blog-resources")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("blog-resources").getPublicUrl(path);
      if (kind === "cover") {
        setEditor((e) => ({ ...e, coverImageUrl: data.publicUrl }));
      } else {
        setEditor((e) => ({
          ...e,
          materialType: "file",
          fileUrl: data.publicUrl,
          fileName: file.name,
          fileType: file.type || ext,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveEditor = async () => {
    if (!user) return;
    if (!editor.title.trim()) {
      setError("Title is required");
      return;
    }
    if (editor.materialType === "file" && !editor.fileUrl) {
      setError("Upload a file or switch to an external link");
      return;
    }
    if (editor.materialType === "link" && !editor.externalLink.trim()) {
      setError("Add an external link (Notion, Drive, Figma…)");
      return;
    }
    if (!tablesReady) {
      setError("Run migration 056_lead_magnets.sql in Supabase first.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Upsert questionnaire + fields
      let questionnaireId = editor.questionnaireId;
      const formTitle = `${editor.title.trim()} — Form`;
      if (questionnaireId) {
        await supabase
          .from("questionnaires")
          .update({ title: formTitle, type: "lead_magnet", is_active: true })
          .eq("id", questionnaireId)
          .eq("expert_id", user.id);
        await supabase.from("questionnaire_fields").delete().eq("questionnaire_id", questionnaireId);
      } else {
        const { data: q, error: qErr } = await supabase
          .from("questionnaires")
          .insert({
            expert_id: user.id,
            type: "lead_magnet",
            title: formTitle,
            is_active: true,
          })
          .select("id")
          .single();
        if (qErr) throw qErr;
        questionnaireId = q.id;
      }

      const fieldRows = editor.fields
        .filter((f) => f.label.trim())
        .map((f, i) => ({
          questionnaire_id: questionnaireId!,
          field_type: f.field_type,
          label: f.label.trim(),
          placeholder: f.placeholder || null,
          required: f.required,
          options:
            f.field_type === "select"
              ? f.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : null,
          order_index: i,
        }));
      if (fieldRows.length) {
        const { error: fErr } = await supabase.from("questionnaire_fields").insert(fieldRows);
        if (fErr) throw fErr;
      }

      const payload = {
        expert_id: user.id,
        title: editor.title.trim(),
        subtitle: editor.subtitle.trim() || null,
        cta_text: editor.ctaText.trim() || "Download free",
        placeholder: editor.placeholder.trim() || "Enter your email",
        success_message: editor.successMessage.trim() || "You're in!",
        cover_image_url: editor.coverImageUrl || null,
        material_type: editor.materialType,
        file_url: editor.materialType === "file" ? editor.fileUrl : null,
        file_name: editor.materialType === "file" ? editor.fileName : null,
        file_type: editor.materialType === "file" ? editor.fileType : null,
        external_link: editor.materialType === "link" ? editor.externalLink.trim() : null,
        questionnaire_id: questionnaireId,
        instant_download: editor.instantDownload,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (editor.id) {
        const { error: uErr } = await supabase.from("lead_magnets").update(payload).eq("id", editor.id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase.from("lead_magnets").insert(payload);
        if (iErr) throw iErr;
      }

      setSuccess(editor.id ? "Lead magnet updated" : "Lead magnet created");
      setEditorOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteMagnet = async (id: string) => {
    if (!confirm("Delete this lead magnet? Captured leads for it will also be removed.")) return;
    const { error: delError } = await supabase.from("lead_magnets").delete().eq("id", id);
    if (delError) {
      setError(delError.message);
      return;
    }
    setSuccess("Lead magnet deleted");
    await load();
  };

  const copyLink = async (magnet: LeadMagnet) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.sito.club";
    // Prefer storefront slug if available
    const { data: profile } = await supabase
      .from("profiles")
      .select("custom_slug")
      .eq("id", user!.id)
      .maybeSingle();
    const url = profile?.custom_slug
      ? `${origin}/s/${profile.custom_slug}?lead=${magnet.id}`
      : `${origin}/dashboard/leads`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(magnet.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  const exportCsv = () => {
    const header = ["Email", "Source Lead Magnet", "Form Responses", "Signup Date"];
    const lines = filteredLeads.map((l) => {
      const resp = l.responses
        ? Object.entries(l.responses)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ")
        : "";
      return [l.email, l.source, resp, new Date(l.created_at).toISOString()]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sito-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-lg bg-slate-800" />
        <div className="h-40 rounded-2xl border border-slate-800 bg-slate-900/60" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Leads & marketing
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Lead magnets</h1>
          <p className="mt-2 text-sm text-slate-400">
            Capture leads with free downloads, manage CRM, and send email broadcasts.
          </p>
        </div>
        {activeTab === "magnets" && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            + Create lead magnet
          </button>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {(
          [
            { id: "magnets" as const, label: "🎁 Lead magnets" },
            { id: "crm" as const, label: "📋 Captured leads" },
            { id: "broadcasts" as const, label: "✉️ Email broadcasts" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-slate-100 text-slate-950"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!tablesReady && activeTab !== "broadcasts" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Run Supabase migration <code className="text-amber-50">056_lead_magnets.sql</code> to enable
          multi-asset lead magnets. CRM below still shows legacy signups.
        </div>
      )}
      {error && activeTab !== "broadcasts" && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && activeTab !== "broadcasts" && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {activeTab === "broadcasts" && (
        <EmailBroadcastsPanel
          magnets={magnets.map((m) => ({ id: m.id, title: m.title }))}
          leadCounts={broadcastLeadCounts}
        />
      )}

      {activeTab === "magnets" && (magnets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-400">
          No lead magnets yet. Create one to start capturing emails with a free download.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {magnets.map((m) => (
            <article
              key={m.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <div className="flex gap-3">
                {m.cover_image_url ? (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                    <Image src={m.cover_image_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl">
                    🎁
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-slate-50">{m.title}</h2>
                  {m.subtitle && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{m.subtitle}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">
                  {m.material_type === "file"
                    ? `File: ${m.file_name || "upload"}`
                    : `Link: ${m.external_link ? "external" : "—"}`}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">
                  Form: {m.form_title || "Default"}
                </span>
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300">
                  {m.leads_count || 0} leads
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => copyLink(m)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  {copiedId === m.id ? "Copied!" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMagnet(m.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ))}

      {/* CRM */}
      {activeTab === "crm" && (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Captured leads</h2>
            <p className="text-sm text-slate-400">All form submissions across your magnets and products.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterMagnetId}
              onChange={(e) => setFilterMagnetId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">All sources</option>
              {magnets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No leads captured yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Subscriber email</th>
                  <th className="px-4 py-3">Source lead magnet</th>
                  <th className="px-4 py-3">Form responses</th>
                  <th className="px-4 py-3">Signup date</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((l) => {
                  const hasResponses = l.responses && Object.keys(l.responses).length > 0;
                  const open = expandedLeadId === l.id;
                  return (
                    <tr key={l.id} className="border-t border-slate-800 align-top">
                      <td className="px-4 py-3 text-slate-200">{l.email}</td>
                      <td className="px-4 py-3 text-slate-400">{l.source}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {hasResponses ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedLeadId(open ? null : l.id)}
                              className="text-sky-400 hover:text-sky-300"
                            >
                              {open ? "Hide" : "View answers"}
                            </button>
                            {open && (
                              <dl className="mt-2 space-y-1 rounded-lg bg-slate-950 p-2 text-xs">
                                {Object.entries(l.responses!).map(([k, v]) => (
                                  <div key={k}>
                                    <dt className="text-slate-500">{k}</dt>
                                    <dd className="text-slate-200">{v}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-50">
                {editor.id ? "Edit lead magnet" : "Create lead magnet"}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Basic info
                </h3>
                <input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="Title"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                />
                <textarea
                  value={editor.subtitle}
                  onChange={(e) => setEditor({ ...editor, subtitle: e.target.value })}
                  placeholder="Subtitle / description"
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                />
                <input
                  value={editor.ctaText}
                  onChange={(e) => setEditor({ ...editor, ctaText: e.target.value })}
                  placeholder="CTA button text"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                />
                <div className="flex items-center gap-3">
                  {editor.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editor.coverImageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f, "cover");
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => coverInputRef.current?.click()}
                    className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200"
                  >
                    {uploading ? "Uploading…" : "Cover image (optional)"}
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Material
                </h3>
                <div className="flex gap-2">
                  {(["file", "link"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditor({ ...editor, materialType: t })}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        editor.materialType === t
                          ? "bg-slate-100 text-slate-950"
                          : "border border-slate-600 text-slate-300"
                      }`}
                    >
                      {t === "file" ? "Upload file" : "External link"}
                    </button>
                  ))}
                </div>
                {editor.materialType === "file" ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.zip,.docx,.epub,application/pdf,application/zip,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f, "material");
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200"
                    >
                      {uploading
                        ? "Uploading…"
                        : editor.fileName
                          ? `Change file (${editor.fileName})`
                          : "Upload PDF / ZIP / DOCX / EPUB"}
                    </button>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={editor.externalLink}
                    onChange={(e) => setEditor({ ...editor, externalLink: e.target.value })}
                    placeholder="https://notion.so/… or Drive / Figma link"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editor.instantDownload}
                    onChange={(e) => setEditor({ ...editor, instantDownload: e.target.checked })}
                  />
                  Show instant download / link after form submit
                </label>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Custom form
                </h3>
                <p className="text-xs text-slate-500">
                  Questions shown before the download. Email is recommended as required.
                </p>
                {editor.fields.map((f, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 p-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={f.label}
                        onChange={(e) => {
                          const fields = [...editor.fields];
                          fields[idx] = { ...f, label: e.target.value };
                          setEditor({ ...editor, fields });
                        }}
                        placeholder="Label"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                      <select
                        value={f.field_type}
                        onChange={(e) => {
                          const fields = [...editor.fields];
                          fields[idx] = {
                            ...f,
                            field_type: e.target.value as FormFieldDraft["field_type"],
                          };
                          setEditor({ ...editor, fields });
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="textarea">Long text</option>
                        <option value="select">Select</option>
                      </select>
                    </div>
                    <input
                      value={f.placeholder}
                      onChange={(e) => {
                        const fields = [...editor.fields];
                        fields[idx] = { ...f, placeholder: e.target.value };
                        setEditor({ ...editor, fields });
                      }}
                      placeholder="Placeholder"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                    {f.field_type === "select" && (
                      <input
                        value={f.options}
                        onChange={(e) => {
                          const fields = [...editor.fields];
                          fields[idx] = { ...f, options: e.target.value };
                          setEditor({ ...editor, fields });
                        }}
                        placeholder="Options (comma-separated)"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => {
                            const fields = [...editor.fields];
                            fields[idx] = { ...f, required: e.target.checked };
                            setEditor({ ...editor, fields });
                          }}
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({
                            ...editor,
                            fields: editor.fields.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-xs text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      fields: [
                        ...editor.fields,
                        {
                          field_type: "text",
                          label: "",
                          placeholder: "",
                          required: false,
                          options: "",
                          order_index: editor.fields.length,
                        },
                      ],
                    })
                  }
                  className="text-sm text-sky-400 hover:text-sky-300"
                >
                  + Add question
                </button>
              </section>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveEditor}
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save lead magnet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
