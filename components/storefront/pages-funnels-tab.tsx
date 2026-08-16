"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PRO_MONTHLY_PRICE_USD } from "@/lib/billing";
import {
  DEFAULT_NAV_ITEMS,
  isValidLeadSlug,
  parseStorefrontNav,
  slugifyLeadMagnet,
  type StorefrontNavConfig,
  type StorefrontNavItem,
} from "@/lib/storefront-pages";

interface LeadMagnetRow {
  id: string;
  title: string;
  is_active: boolean;
  public_slug: string | null;
  hide_nav: boolean;
  landing_enabled: boolean;
}

interface PagesFunnelsTabProps {
  isPro: boolean;
  customSlug: string;
  navConfig: StorefrontNavConfig;
  onNavChange: (next: StorefrontNavConfig) => void;
  onUpgradeClick: () => void;
  userId: string;
}

export function PagesFunnelsTab({
  isPro,
  customSlug,
  navConfig,
  onNavChange,
  onUpgradeClick,
  userId,
}: PagesFunnelsTabProps) {
  const supabase = createClient();
  const [magnets, setMagnets] = useState<LeadMagnetRow[]>([]);
  const [loadingMagnets, setLoadingMagnets] = useState(true);
  const [magnetError, setMagnetError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draftSlugs, setDraftSlugs] = useState<Record<string, string>>({});

  const items = parseStorefrontNav(navConfig).items;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMagnets(true);
      setMagnetError("");
      try {
        const { data, error } = await supabase
          .from("lead_magnets")
          .select("id, title, is_active, public_slug, hide_nav, landing_enabled")
          .eq("expert_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          // Columns may not exist yet — fall back
          const retry = await supabase
            .from("lead_magnets")
            .select("id, title, is_active")
            .eq("expert_id", userId)
            .order("created_at", { ascending: false });
          if (retry.error) throw retry.error;
          if (!cancelled) {
            const list = ((retry.data || []) as Array<{ id: string; title: string; is_active: boolean }>).map(
              (m) => ({
                ...m,
                public_slug: null,
                hide_nav: false,
                landing_enabled: false,
              })
            );
            setMagnets(list);
            setDraftSlugs(
              Object.fromEntries(list.map((m) => [m.id, slugifyLeadMagnet(m.title)]))
            );
          }
        } else if (!cancelled) {
          const list = (data || []) as LeadMagnetRow[];
          setMagnets(list);
          setDraftSlugs(
            Object.fromEntries(
              list.map((m) => [m.id, m.public_slug || slugifyLeadMagnet(m.title)])
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          setMagnetError(err instanceof Error ? err.message : "Failed to load lead magnets");
        }
      } finally {
        if (!cancelled) setLoadingMagnets(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  const updateItem = (id: StorefrontNavItem["id"], patch: Partial<StorefrontNavItem>) => {
    if (!isPro && id !== "home") {
      onUpgradeClick();
      return;
    }
    const nextItems = items.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            enabled: id === "home" ? true : patch.enabled ?? item.enabled,
          }
        : item
    );
    onNavChange({ version: 1, items: nextItems.length ? nextItems : DEFAULT_NAV_ITEMS });
  };

  const saveMagnetLanding = async (
    magnet: LeadMagnetRow,
    patch: Partial<Pick<LeadMagnetRow, "public_slug" | "hide_nav" | "landing_enabled">>
  ) => {
    if (!isPro) {
      onUpgradeClick();
      return;
    }
    setSavingId(magnet.id);
    setMagnetError("");
    try {
      const public_slug =
        patch.public_slug !== undefined
          ? patch.public_slug
          : draftSlugs[magnet.id] || magnet.public_slug || slugifyLeadMagnet(magnet.title);

      if (patch.landing_enabled || magnet.landing_enabled || patch.public_slug !== undefined) {
        if (!isValidLeadSlug(public_slug || "")) {
          throw new Error("Landing URL must be 2–60 characters: lowercase letters, numbers, hyphens.");
        }
      }

      const payload = {
        public_slug: public_slug || null,
        hide_nav: patch.hide_nav ?? magnet.hide_nav,
        landing_enabled: patch.landing_enabled ?? magnet.landing_enabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("lead_magnets").update(payload).eq("id", magnet.id);
      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          throw new Error("That landing URL is already used by another guide. Choose a different slug.");
        }
        if (/column|public_slug|landing_enabled|hide_nav/i.test(error.message)) {
          throw new Error("Run migration 060_storefront_pages_funnels.sql in Supabase, then try again.");
        }
        throw error;
      }

      setMagnets((prev) =>
        prev.map((m) =>
          m.id === magnet.id
            ? {
                ...m,
                public_slug: payload.public_slug,
                hide_nav: payload.hide_nav,
                landing_enabled: payload.landing_enabled,
              }
            : m
        )
      );
      setDraftSlugs((prev) => ({ ...prev, [magnet.id]: payload.public_slug || "" }));
    } catch (err) {
      setMagnetError(err instanceof Error ? err.message : "Failed to save landing page");
    } finally {
      setSavingId(null);
    }
  };

  const copyUrl = async (magnet: LeadMagnetRow) => {
    const slug = magnet.public_slug || draftSlugs[magnet.id];
    if (!customSlug || !slug) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://sito.club"}/s/${customSlug}/l/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(magnet.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Pages & Funnels</h2>
        <p className="mt-1 text-sm text-slate-400">
          Control which sub-pages appear in your public storefront navigation, and publish focused lead
          magnet landing pages.
        </p>
      </div>

      {!isPro && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <p className="text-sm font-medium text-amber-100">
            Upgrade to Pro (${PRO_MONTHLY_PRICE_USD}/mo) to unlock standalone Lead Magnet landing pages and
            custom Shop, Blog, and Free Guides sub-pages.
          </p>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Navigation bar</h3>
          <p className="mt-1 text-xs text-slate-500">
            Shown at the top of your public pages when more than Home is enabled. Save storefront to apply
            nav changes.
          </p>
        </div>
        <ul className="space-y-3">
          {items.map((item) => {
            const path =
              item.id === "home"
                ? `/s/${customSlug || "…"}`
                : item.id === "shop"
                  ? `/s/${customSlug || "…"}/shop`
                  : item.id === "posts"
                    ? `/s/${customSlug || "…"}/posts`
                    : `/s/${customSlug || "…"}/guides`;
            return (
              <li
                key={item.id}
                className={`rounded-xl border border-slate-700 bg-slate-950/60 p-4 ${!isPro && item.id !== "home" ? "opacity-70" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={item.label}
                      disabled={!isPro && item.id !== "home"}
                      onChange={(e) => updateItem(item.id, { label: e.target.value })}
                      className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
                    />
                    <p className="mt-1.5 font-mono text-xs text-slate-500">{path}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300 pt-5">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={item.id === "home" || !isPro}
                      onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-600"
                    />
                    Visible
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        {!isPro && (
          <p className="text-xs text-slate-500">
            Free plan includes your main hub only. Sub-page nav links require Pro.
          </p>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-800 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Lead magnet landings
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Standalone conversion pages at{" "}
              <span className="font-mono text-slate-400">/s/…/l/your-slug</span>. Manage magnets in{" "}
              <Link href="/dashboard/leads" className="text-sky-400 hover:underline">
                Lead Magnets
              </Link>
              .
            </p>
          </div>
        </div>

        {magnetError && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{magnetError}</p>
        )}

        {loadingMagnets ? (
          <p className="text-sm text-slate-500">Loading lead magnets…</p>
        ) : magnets.length === 0 ? (
          <p className="text-sm text-slate-500">
            No lead magnets yet.{" "}
            <Link href="/dashboard/leads" className="text-sky-400 hover:underline">
              Create one
            </Link>{" "}
            to publish a landing page.
          </p>
        ) : (
          <ul className="space-y-3">
            {magnets.map((m) => {
              const slug = draftSlugs[m.id] || "";
              const liveUrl =
                customSlug && m.landing_enabled && m.public_slug
                  ? `/s/${customSlug}/l/${m.public_slug}`
                  : null;
              return (
                <li key={m.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100">{m.title}</p>
                      {!m.is_active && (
                        <span className="text-xs text-amber-400">Inactive — activate in Lead Magnets</span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!m.landing_enabled}
                        disabled={!isPro || savingId === m.id}
                        onChange={(e) =>
                          saveMagnetLanding(m, {
                            landing_enabled: e.target.checked,
                            public_slug: slug || slugifyLeadMagnet(m.title),
                          })
                        }
                        className="h-4 w-4 rounded border-slate-600"
                      />
                      Landing page
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">URL slug</label>
                      <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2">
                        <span className="shrink-0 text-xs text-slate-500 font-mono">/l/</span>
                        <input
                          type="text"
                          value={slug}
                          disabled={!isPro}
                          onChange={(e) =>
                            setDraftSlugs((prev) => ({
                              ...prev,
                              [m.id]: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                            }))
                          }
                          className="min-h-[40px] w-full bg-transparent py-2 text-sm text-slate-100 outline-none disabled:opacity-50"
                          placeholder="ai-guide"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isPro || savingId === m.id}
                      onClick={() => saveMagnetLanding(m, { public_slug: slug })}
                      className="min-h-[40px] rounded-lg border border-slate-600 px-3 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {savingId === m.id ? "Saving…" : "Save slug"}
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!m.hide_nav}
                      disabled={!isPro || !m.landing_enabled || savingId === m.id}
                      onChange={(e) => saveMagnetLanding(m, { hide_nav: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-600"
                    />
                    Hide top navigation (focused funnel)
                  </label>

                  {liveUrl && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-400 hover:underline"
                      >
                        {typeof window !== "undefined" ? window.location.origin : "https://sito.club"}
                        {liveUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyUrl(m)}
                        className="rounded border border-slate-600 px-2 py-1 text-slate-300 hover:bg-slate-800"
                      >
                        {copiedId === m.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
