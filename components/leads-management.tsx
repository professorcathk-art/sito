"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface LeadMagnetDraft {
  title: string;
  subtitle: string;
  ctaText: string;
}

export function LeadsManagement() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [magnet, setMagnet] = useState<LeadMagnetDraft>({
    title: "Get my free guide",
    subtitle: "Join my list for exclusive tips and updates.",
    ctaText: "Send me the freebie",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      // Load lead magnet config from storefront blocks
      const { data: profile } = await supabase
        .from("profiles")
        .select("storefront_blocks")
        .eq("id", user.id)
        .maybeSingle();
      const blocks = (profile?.storefront_blocks as any[]) || [];
      const leadBlock = blocks.find((b) => b.type === "lead_magnet");
      if (leadBlock?.data) {
        setMagnet({
          title: (leadBlock.data.title as string) || "Get my free guide",
          subtitle: (leadBlock.data.subtitle as string) || "",
          ctaText: (leadBlock.data.ctaText as string) || "Send me the freebie",
        });
      }

      const { data: products } = await supabase.from("products").select("id, name").eq("expert_id", user.id);
      const productIds = (products || []).map((p) => p.id);
      const productNameById = Object.fromEntries((products || []).map((p) => [p.id, p.name]));

      const interestRows = productIds.length
        ? (
            await supabase
              .from("product_interests")
              .select("id, product_id, user_id, user_email, created_at")
              .in("product_id", productIds)
              .order("created_at", { ascending: false })
              .limit(100)
          ).data || []
        : [];

      let contactRows: any[] = [];
      const byColumn = await supabase
        .from("contact_messages")
        .select("id, name, email, subject, created_at, expert_id")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!byColumn.error && byColumn.data) {
        contactRows = byColumn.data;
      } else {
        const bySubject = await supabase
          .from("contact_messages")
          .select("id, name, email, subject, created_at")
          .ilike("subject", `%Storefront lead [${user.id}]%`)
          .order("created_at", { ascending: false })
          .limit(100);
        contactRows = bySubject.data || [];
      }

      const userIds = Array.from(new Set(interestRows.map((r: any) => r.user_id).filter(Boolean)));
      let profiles: Record<string, { email?: string; name?: string }> = {};
      if (userIds.length) {
        const { data } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
        data?.forEach((p) => {
          profiles[p.id] = p;
        });
      }

      const merged = [
        ...interestRows.map((row: any) => ({
          id: `interest-${row.id}`,
          email: profiles[row.user_id]?.email || row.user_email || "—",
          source: productNameById[row.product_id] || "Product interest",
          created_at: row.created_at,
        })),
        ...contactRows.map((row: any) => ({
          id: `contact-${row.id}`,
          email: row.email || "—",
          source: String(row.subject || "Lead magnet").replace(`Storefront lead [${user.id}]: `, "") || "Lead magnet",
          created_at: row.created_at,
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

      setLeads(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLeadMagnet = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("storefront_blocks")
        .eq("id", user.id)
        .maybeSingle();
      const blocks = Array.isArray(profile?.storefront_blocks) ? [...(profile!.storefront_blocks as any[])] : [];
      const idx = blocks.findIndex((b) => b.type === "lead_magnet");
      const data = {
        title: magnet.title,
        subtitle: magnet.subtitle,
        ctaText: magnet.ctaText,
        placeholder: "Enter your email",
        successMessage: "You're in! Check your inbox soon.",
      };
      if (idx >= 0) {
        blocks[idx] = { ...blocks[idx], data: { ...blocks[idx].data, ...data } };
      } else {
        blocks.push({
          id: `lead-magnet-${Date.now()}`,
          type: "lead_magnet",
          order: blocks.length,
          data,
        });
      }
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ storefront_blocks: blocks, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setSuccess("Lead magnet saved to your storefront");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead magnet");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ["Email", "Source Lead Magnet / Product", "Signup Date"];
    const rows = leads.map((l) => [l.email, l.source, new Date(l.created_at).toISOString()]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sito-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const leadCount = useMemo(() => leads.length, [leads.length]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Leads & Marketing</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Lead Magnets & Leads</h1>
        <p className="mt-2 text-sm text-slate-400">
          Create free capture offers for your storefront, then review every signup in one CRM table.
        </p>
      </header>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{success}</div>}

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-slate-50">Lead magnet creator</h2>
        <p className="text-sm text-slate-400">This updates the Lead Magnet block on your public storefront.</p>
        <input
          value={magnet.title}
          onChange={(e) => setMagnet({ ...magnet, title: e.target.value })}
          placeholder="Title (e.g. Free PDF guide)"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
        />
        <textarea
          value={magnet.subtitle}
          onChange={(e) => setMagnet({ ...magnet, subtitle: e.target.value })}
          placeholder="Subtitle"
          rows={2}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
        />
        <input
          value={magnet.ctaText}
          onChange={(e) => setMagnet({ ...magnet, ctaText: e.target.value })}
          placeholder="CTA button text"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100"
        />
        <button
          type="button"
          disabled={saving}
          onClick={saveLeadMagnet}
          className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save lead magnet"}
        </button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Captured leads ({leadCount})</h2>
          <button
            type="button"
            onClick={exportCsv}
            disabled={leads.length === 0}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Loading leads…</div>
          ) : leads.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No leads yet. Share your storefront lead magnet or product interest forms.
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Source Lead Magnet / Product</th>
                  <th className="px-4 py-3 font-medium">Signup Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-900">
                    <td className="px-4 py-3 text-slate-100">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-300">{lead.source}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(lead.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
