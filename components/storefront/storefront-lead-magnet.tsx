"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { StorefrontLeadMagnetData } from "@/types/storefront";

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order_index: number;
}

interface StorefrontLeadMagnetProps {
  data: StorefrontLeadMagnetData;
  expertId?: string;
  expertName?: string;
  buttonClassName?: string;
  isPreview?: boolean;
}

export function StorefrontLeadMagnet({
  data,
  expertId,
  expertName,
  buttonClassName = "",
  isPreview = false,
}: StorefrontLeadMagnetProps) {
  const leadMagnetId = data.leadMagnetId;
  const [title, setTitle] = useState(data.title || "Get my free guide");
  const [subtitle, setSubtitle] = useState(data.subtitle || "Join my list for exclusive tips and updates.");
  const [ctaText, setCtaText] = useState(data.ctaText || "Send me the freebie");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMagnet, setLoadingMagnet] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    data.successMessage || "You're in! Check your inbox soon."
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!leadMagnetId || isPreview) return;
    let cancelled = false;
    (async () => {
      setLoadingMagnet(true);
      try {
        const res = await fetch(`/api/lead-magnets/${leadMagnetId}`);
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled) return;
        const m = payload.magnet;
        if (m) {
          setTitle(m.title || title);
          setSubtitle(m.subtitle || subtitle);
          setCtaText(m.cta_text || ctaText);
          setSuccessMessage(m.success_message || successMessage);
          setCoverUrl(m.cover_image_url || null);
        }
        setFields(payload.fields || []);
        const initial: Record<string, string> = {};
        (payload.fields || []).forEach((f: FormField) => {
          initial[f.id] = "";
        });
        setFormValues(initial);
      } catch {
        /* keep block defaults */
      } finally {
        if (!cancelled) setLoadingMagnet(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadMagnetId, isPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = () => {
    if (isPreview) {
      setSuccess(true);
      return;
    }
    setError("");
    setSuccess(false);
    setDownloadUrl(null);
    setExternalLink(null);
    setModalOpen(true);
  };

  const emailFromForm = () => {
    const emailField = fields.find((f) => f.field_type === "email");
    if (emailField && formValues[emailField.id]) return formValues[emailField.id].trim();
    return (formValues.email || "").trim();
  };

  const nameFromForm = () => {
    const nameField = fields.find((f) => /name/i.test(f.label));
    if (nameField) return formValues[nameField.id]?.trim() || "";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      setSuccess(true);
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Validate required
      for (const f of fields) {
        if (f.required && !String(formValues[f.id] || "").trim()) {
          throw new Error(`${f.label} is required`);
        }
      }
      let email = emailFromForm();
      // Legacy email-only path
      if (!leadMagnetId && !email) {
        email = formValues.email?.trim() || "";
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("A valid email is required");
      }

      const labeledResponses: Record<string, string> = {};
      fields.forEach((f) => {
        labeledResponses[f.label] = formValues[f.id] || "";
      });

      const res = await fetch("/api/storefront-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: nameFromForm(),
          expertId,
          expertName,
          leadTitle: title,
          leadMagnetId: leadMagnetId || undefined,
          responses: labeledResponses,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Something went wrong. Please try again.");
      }
      setSuccess(true);
      setSuccessMessage(payload.successMessage || successMessage);
      setDownloadUrl(payload.downloadUrl || null);
      setExternalLink(payload.externalLink || null);
      setFileName(payload.fileName || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Legacy: no leadMagnetId → simple inline email form
  if (!leadMagnetId) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 sm:p-6 shadow-lg backdrop-blur-xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--store-btn-bg)" }}>
          Free download
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--store-text)] tracking-tight">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-[var(--store-subheadline)] leading-relaxed">{subtitle}</p>}
        {success ? (
          <p className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">
            {successMessage}
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = formValues.email?.trim() || "";
              setError("");
              setLoading(true);
              try {
                if (isPreview) {
                  setSuccess(true);
                  return;
                }
                const res = await fetch("/api/storefront-lead", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, expertId, expertName, leadTitle: title }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(payload.error || "Something went wrong.");
                setSuccess(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to submit.");
              } finally {
                setLoading(false);
              }
            }}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              name="email"
              type="email"
              required
              value={formValues.email || ""}
              onChange={(e) => setFormValues({ email: e.target.value })}
              placeholder={data.placeholder || "Enter your email"}
              disabled={loading}
              className="min-h-[48px] flex-1 rounded-xl border border-[var(--store-card-border)] bg-white/80 px-4 text-[var(--store-text)] outline-none placeholder:opacity-50 focus:ring-2 focus:ring-[var(--store-btn-bg)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading}
              className={`min-h-[48px] shrink-0 px-5 font-semibold transition-all hover:opacity-90 disabled:opacity-60 ${buttonClassName}`}
            >
              {loading ? "Sending..." : ctaText}
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 sm:p-6 shadow-lg backdrop-blur-xl">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          {coverUrl && (
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl">
              <Image src={coverUrl} alt="" fill className="object-cover" sizes="96px" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--store-btn-bg)" }}
            >
              Free download
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--store-text)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--store-subheadline)]">{subtitle}</p>
            )}
            <button
              type="button"
              onClick={openModal}
              disabled={loadingMagnet}
              className={`mt-4 min-h-[48px] px-5 font-semibold transition-all hover:opacity-90 disabled:opacity-60 ${buttonClassName}`}
            >
              {loadingMagnet ? "Loading…" : ctaText}
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 shadow-2xl backdrop-blur-xl"
            style={{ color: "var(--store-text)" }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-[var(--store-subheadline)]">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[var(--store-subheadline)] hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="space-y-3">
                <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                  {successMessage}
                </p>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={fileName || undefined}
                    className={`inline-flex min-h-[48px] items-center justify-center px-5 font-semibold ${buttonClassName}`}
                  >
                    Download {fileName || "file"}
                  </a>
                )}
                {!downloadUrl && externalLink && (
                  <a
                    href={externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[48px] items-center justify-center px-5 font-semibold ${buttonClassName}`}
                  >
                    Open resource
                  </a>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {(fields.length > 0
                  ? fields
                  : [
                      {
                        id: "email",
                        field_type: "email",
                        label: "Email",
                        placeholder: "Enter your email",
                        required: true,
                        options: null,
                        order_index: 0,
                      } as FormField,
                    ]
                ).map((f) => (
                  <div key={f.id}>
                    <label className="mb-1 block text-sm font-medium">
                      {f.label}
                      {f.required ? " *" : ""}
                    </label>
                    {f.field_type === "textarea" ? (
                      <textarea
                        required={f.required}
                        value={formValues[f.id] || ""}
                        onChange={(e) => setFormValues({ ...formValues, [f.id]: e.target.value })}
                        placeholder={f.placeholder || ""}
                        rows={3}
                        className="w-full rounded-xl border border-[var(--store-card-border)] bg-white/80 px-3 py-2 text-[var(--store-text)] outline-none"
                      />
                    ) : f.field_type === "select" ? (
                      <select
                        required={f.required}
                        value={formValues[f.id] || ""}
                        onChange={(e) => setFormValues({ ...formValues, [f.id]: e.target.value })}
                        className="w-full rounded-xl border border-[var(--store-card-border)] bg-white/80 px-3 py-2 text-[var(--store-text)] outline-none"
                      >
                        <option value="">Select…</option>
                        {(f.options || []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.field_type === "email" ? "email" : "text"}
                        required={f.required}
                        value={formValues[f.id] || ""}
                        onChange={(e) => setFormValues({ ...formValues, [f.id]: e.target.value })}
                        placeholder={f.placeholder || ""}
                        className="w-full rounded-xl border border-[var(--store-card-border)] bg-white/80 px-3 py-2 text-[var(--store-text)] outline-none"
                      />
                    )}
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full min-h-[48px] font-semibold disabled:opacity-60 ${buttonClassName}`}
                >
                  {loading ? "Submitting…" : ctaText}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
