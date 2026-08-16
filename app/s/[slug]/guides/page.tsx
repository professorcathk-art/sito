import { Suspense } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StorefrontNavBar } from "@/components/storefront/storefront-nav-bar";
import {
  getDesignStateFromProfile,
  FONT_FAMILIES,
  getCardCssVars,
} from "@/lib/storefront-theme-config";
import {
  isPublicSubPageAllowed,
  loadPublicStorefrontProfile,
  shouldHidePoweredBy,
  profilePlanTier,
} from "@/lib/storefront-public";
import { getSiteUrl } from "@/lib/site-url";
import { canUseStorefrontFunnels } from "@/lib/storefront-pages";

interface GuidesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GuidesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublicStorefrontProfile(slug);
  if (!profile) return { title: "Free Guides | Sito" };
  const name = String(profile.name || "Expert");
  return {
    title: `${name} — Free Guides | Sito`,
    description: `Free resources from ${name}`,
    openGraph: {
      url: `${getSiteUrl()}/s/${slug.toLowerCase().trim()}/guides`,
    },
  };
}

export default async function StorefrontGuidesPage({ params }: GuidesPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const normalizedSlug = slug.toLowerCase().trim();

  const profile = await loadPublicStorefrontProfile(normalizedSlug);
  if (!profile?.id) notFound();

  if (!isPublicSubPageAllowed(profile, "guides")) {
    redirect(`/s/${normalizedSlug}`);
  }

  const tier = profilePlanTier(profile);
  let magnets: Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    cover_image_url?: string | null;
    public_slug?: string | null;
    landing_enabled?: boolean | null;
    is_active?: boolean | null;
  }> = [];

  {
    const full = await supabase
      .from("lead_magnets")
      .select("id, title, subtitle, cover_image_url, public_slug, landing_enabled, is_active")
      .eq("expert_id", profile.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (full.error) {
      const basic = await supabase
        .from("lead_magnets")
        .select("id, title, subtitle, cover_image_url, is_active")
        .eq("expert_id", profile.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      magnets = (basic.data || []) as typeof magnets;
    } else {
      magnets = (full.data || []) as typeof magnets;
    }
  }

  const designState = getDesignStateFromProfile(profile);
  const fontClass = FONT_FAMILIES.find((f) => f.id === designState.fontFamily)?.class || "font-store-inter";
  const card = getCardCssVars(designState.cardStyle as "flat" | "glass" | "brutalist" | "soft-shadow");
  const pageBackground = designState.backgroundColor;

  const list = (magnets || []).filter((m) => m.is_active !== false);

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <div
        className={`min-h-screen ${fontClass}`}
        style={
          {
            background: pageBackground,
            color: designState.textColor,
            "--store-card-bg": card.bg,
            "--store-card-border": card.border,
            "--store-text": designState.textColor,
            "--store-subheadline": designState.subheadlineColor || designState.textColor,
            "--store-btn-bg": designState.buttonColor,
          } as CSSProperties
        }
      >
        <StorefrontNavBar
          slug={normalizedSlug}
          active="guides"
          navConfig={profile.storefront_nav}
          planTier={profile.plan_tier as string | null}
          isProStore={profile.is_pro_store as boolean | null}
          textColor={designState.textColor}
          accentColor={designState.buttonColor}
        />
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Free Guides · {String(profile.name || "Expert")}</h1>
          <p className="mt-2 text-sm opacity-80" style={{ color: designState.subheadlineColor || undefined }}>
            Download free resources from this expert
          </p>

          {list.length === 0 ? (
            <p className="mt-8 text-sm opacity-70">No free guides published yet.</p>
          ) : (
            <ul className="mt-8 space-y-4">
              {list.map((m) => {
                const canLand =
                  canUseStorefrontFunnels(tier) && m.landing_enabled && m.public_slug;
                const href = canLand
                  ? `/s/${normalizedSlug}/l/${m.public_slug}`
                  : `/s/${normalizedSlug}?lead=${m.id}`;
                return (
                  <li key={m.id}>
                    <Link
                      href={href}
                      className="flex gap-4 rounded-2xl border p-4 transition hover:opacity-95"
                      style={{
                        background: "var(--store-card-bg)",
                        borderColor: "var(--store-card-border)",
                      }}
                    >
                      {m.cover_image_url && (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          <Image src={m.cover_image_url} alt="" fill className="object-cover" sizes="80px" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="font-semibold">{m.title}</h2>
                        {m.subtitle && (
                          <p className="mt-1 line-clamp-2 text-sm opacity-75">{m.subtitle}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {!shouldHidePoweredBy(profile) && (
            <a
              href="https://www.sito.club"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-12 block text-center text-sm opacity-60 hover:opacity-100"
            >
              Powered by Sito
            </a>
          )}
        </div>
      </div>
    </Suspense>
  );
}
