import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StorefrontNavBar } from "@/components/storefront/storefront-nav-bar";
import { LeadLandingPageView } from "@/components/storefront/lead-landing-page-view";
import {
  getDesignStateFromProfile,
  THEME_PRESET_VALUES,
  normalizeThemePreset,
} from "@/lib/storefront-theme-config";
import {
  loadPublicStorefrontProfile,
  profilePlanTier,
  shouldHidePoweredBy,
} from "@/lib/storefront-public";
import { canUseStorefrontFunnels } from "@/lib/storefront-pages";
import { getSiteUrl } from "@/lib/site-url";

interface LeadLandingProps {
  params: Promise<{ slug: string; leadSlug: string }>;
}

export async function generateMetadata({ params }: LeadLandingProps): Promise<Metadata> {
  const { slug, leadSlug } = await params;
  const supabase = await createClient();
  const profile = await loadPublicStorefrontProfile(slug);
  if (!profile?.id) return { title: "Free Guide | Sito" };

  const { data: magnet } = await supabase
    .from("lead_magnets")
    .select("title, subtitle")
    .eq("expert_id", profile.id)
    .eq("public_slug", leadSlug.toLowerCase().trim())
    .eq("is_active", true)
    .maybeSingle();

  const title = magnet?.title || "Free Guide";
  return {
    title: `${title} | ${profile.name || "Sito"}`,
    description: (magnet?.subtitle || title).slice(0, 150),
    openGraph: {
      title,
      url: `${getSiteUrl()}/s/${slug.toLowerCase().trim()}/l/${leadSlug.toLowerCase().trim()}`,
    },
  };
}

export default async function LeadMagnetLandingPage({ params }: LeadLandingProps) {
  const { slug, leadSlug } = await params;
  const supabase = await createClient();
  const normalizedSlug = slug.toLowerCase().trim();
  const normalizedLead = leadSlug.toLowerCase().trim();

  const profile = await loadPublicStorefrontProfile(normalizedSlug);
  if (!profile?.id) notFound();

  const tier = profilePlanTier(profile);
  if (!canUseStorefrontFunnels(tier)) {
    redirect(`/s/${normalizedSlug}`);
  }

  let magnetQuery = await supabase
    .from("lead_magnets")
    .select(
      "id, title, subtitle, cta_text, placeholder, success_message, cover_image_url, external_link, material_type, public_slug, hide_nav, landing_enabled, is_active"
    )
    .eq("expert_id", profile.id)
    .eq("public_slug", normalizedLead)
    .eq("is_active", true)
    .maybeSingle();

  if (magnetQuery.error) {
    // Migration not applied — fall back to hub
    redirect(`/s/${normalizedSlug}`);
  }

  const magnet = magnetQuery.data;
  if (!magnet || !magnet.landing_enabled) {
    notFound();
  }

  const designState = getDesignStateFromProfile(profile);
  const themeKey = normalizeThemePreset(profile.storefront_theme_preset as string);
  const glowElement = THEME_PRESET_VALUES[themeKey]?.glowElement;

  const navSlot = magnet.hide_nav ? null : (
    <StorefrontNavBar
      slug={normalizedSlug}
      active="guides"
      navConfig={profile.storefront_nav}
      planTier={profile.plan_tier as string | null}
      isProStore={profile.is_pro_store as boolean | null}
      textColor={designState.textColor}
      accentColor={designState.buttonColor}
    />
  );

  return (
    <LeadLandingPageView
      magnet={magnet}
      expertId={String(profile.id)}
      expertName={String(profile.name || "Expert")}
      designState={{ ...designState, glowElement, themePreset: themeKey }}
      storefrontSlug={normalizedSlug}
      navSlot={navSlot}
      hidePoweredBy={shouldHidePoweredBy(profile)}
    />
  );
}
