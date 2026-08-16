"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HoneypotField, useHoneypot } from "@/components/forms/honeypot-field";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order_index: number;
}

export interface LeadLandingMagnet {
  id: string;
  title: string;
  subtitle?: string | null;
  cta_text?: string | null;
  placeholder?: string | null;
  success_message?: string | null;
  cover_image_url?: string | null;
  external_link?: string | null;
  material_type?: string | null;
}

interface LeadMagnetLandingProps {
  magnet: LeadLandingMagnet;
  expertId: string;
  expertName: string;
  buttonClassName?: string;
  textColor?: string;
  subColor?: string;
}

function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function LeadMagnetLanding({
  magnet,
  expertId,
  expertName,
  buttonClassName = "",
  textColor,
  subColor,
}: LeadMagnetLandingProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    magnet.success_message || "You're in! Check your inbox soon."
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { honeypotValue, setHoneypotValue, isSpam } = useHoneypot();

  const title = magnet.title || "Free guide";
  const subtitle = magnet.subtitle || "";
  const ctaText = magnet.cta_text || "Get free access";
  const embed = youtubeEmbedUrl(magnet.external_link);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFields(true);
      try {
        const res = await fetch(`/api/lead-magnets/${magnet.id}`);
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled) return;
        setFields(payload.fields || []);
        const initial: Record<string, string> = {};
        (payload.fields || []).forEach((f: FormField) => {
          initial[f.id] = "";
        });
        setFormValues(initial);
        if (payload.magnet?.success_message) {
          setSuccessMessage(payload.magnet.success_message);
        }
      } catch {
        /* keep empty fields → email fallback */
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [magnet.id]);

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
    setError("");
    if (isSpam()) {
      setSuccess(true);
      return;
    }
    setLoading(true);
    try {
      for (const f of fields) {
        if (f.required && !String(formValues[f.id] || "").trim()) {
          throw new Error(`${f.label} is required`);
        }
      }
      let email = emailFromForm();
      if (!email) email = formValues.email?.trim() || "";
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
          leadMagnetId: magnet.id,
          responses: labeledResponses,
          [HONEYPOT_FIELD]: honeypotValue,
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

  const fieldList =
    fields.length > 0
      ? fields
      : [
          {
            id: "email",
            field_type: "email",
            label: "Email",
            placeholder: magnet.placeholder || "Enter your email",
            required: true,
            options: null,
            order_index: 0,
          } as FormField,
        ];

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-16">
      <div className="text-center">
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--store-btn-bg)" }}
        >
          Free resource
        </p>
        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: textColor || "var(--store-text)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mx-auto mt-3 max-w-md text-base leading-relaxed"
            style={{ color: subColor || "var(--store-subheadline)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {magnet.cover_image_url && (
        <div className="relative mx-auto mt-8 aspect-[16/10] w-full max-w-md overflow-hidden rounded-2xl border border-[var(--store-card-border)] shadow-xl">
          <Image
            src={magnet.cover_image_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 448px"
            priority
          />
        </div>
      )}

      {embed && (
        <div className="relative mx-auto mt-6 aspect-video w-full max-w-md overflow-hidden rounded-2xl border border-[var(--store-card-border)] shadow-lg">
          <iframe
            src={embed}
            title="Preview"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 shadow-lg backdrop-blur-xl sm:p-6">
        {success ? (
          <div className="space-y-3 text-center">
            <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">
              {successMessage}
            </p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={fileName || undefined}
                className={`inline-flex min-h-[48px] w-full items-center justify-center px-5 font-semibold ${buttonClassName}`}
              >
                Download {fileName || "file"}
              </a>
            )}
            {!downloadUrl && externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-[48px] w-full items-center justify-center px-5 font-semibold ${buttonClassName}`}
              >
                Open resource
              </a>
            )}
          </div>
        ) : loadingFields ? (
          <p className="text-center text-sm text-[var(--store-subheadline)]">Loading form…</p>
        ) : (
          <form onSubmit={handleSubmit} className="relative space-y-3">
            <HoneypotField value={honeypotValue} onChange={setHoneypotValue} id="lead_landing_website_url_hp" />
            {fieldList.map((f) => (
              <div key={f.id}>
                <label className="mb-1 block text-sm font-medium text-[var(--store-text)]">
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
  );
}
