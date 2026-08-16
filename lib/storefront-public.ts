import { createClient } from "@/lib/supabase/server";
import { resolvePlanTier, type PlanTier } from "@/lib/billing";
import {
  canUseStorefrontFunnels,
  parseStorefrontNav,
  type StorefrontNavId,
} from "@/lib/storefront-pages";

const PROFILE_BASE_SELECT = `
  id,
  name,
  bio,
  tagline,
  avatar_url,
  verified,
  listed_on_marketplace,
  is_pro_store,
  plan_tier,
  hide_powered_by_sito,
  storefront_theme_preset,
  storefront_custom_brand_color,
  storefront_button_style,
  storefront_font_family,
  storefront_background_color,
  storefront_card_style,
  storefront_text_color,
  storefront_button_text_color,
  storefront_button_variant,
  storefront_custom_links,
  storefront_show_products,
  storefront_show_appointments,
  storefront_show_blog,
  storefront_bio_override,
  storefront_blocks,
  storefront_background_image_url,
  website,
  linkedin,
  instagram_url,
  tiktok_url,
  twitter_url,
  youtube_url
`;

export type PublicStorefrontProfile = {
  id: string;
  name?: string | null;
  bio?: string | null;
  tagline?: string | null;
  avatar_url?: string | null;
  verified?: boolean | null;
  listed_on_marketplace?: boolean | null;
  is_pro_store?: boolean | null;
  plan_tier?: string | null;
  hide_powered_by_sito?: boolean | null;
  storefront_theme_preset?: string | null;
  storefront_custom_brand_color?: string | null;
  storefront_button_style?: string | null;
  storefront_font_family?: string | null;
  storefront_background_color?: string | null;
  storefront_card_style?: string | null;
  storefront_text_color?: string | null;
  storefront_button_text_color?: string | null;
  storefront_button_variant?: string | null;
  storefront_custom_links?: unknown;
  storefront_show_products?: boolean | null;
  storefront_show_appointments?: boolean | null;
  storefront_show_blog?: boolean | null;
  storefront_bio_override?: string | null;
  storefront_blocks?: unknown;
  storefront_background_image_url?: string | null;
  storefront_subheadline_color?: string | null;
  storefront_nav?: unknown;
  website?: string | null;
  linkedin?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
};

export async function loadPublicStorefrontProfile(
  slug: string
): Promise<PublicStorefrontProfile | null> {
  const supabase = await createClient();
  const normalized = slug.toLowerCase().trim();

  let result = await supabase
    .from("profiles")
    .select(`${PROFILE_BASE_SELECT}, storefront_subheadline_color, storefront_nav`)
    .eq("custom_slug", normalized)
    .eq("listed_on_marketplace", true)
    .maybeSingle();

  if (result.error) {
    result = await supabase
      .from("profiles")
      .select(`${PROFILE_BASE_SELECT}, storefront_subheadline_color`)
      .eq("custom_slug", normalized)
      .eq("listed_on_marketplace", true)
      .maybeSingle();
  }

  if (result.error || !result.data?.id) {
    // Legacy without newer billing columns
    const legacy = await supabase
      .from("profiles")
      .select(
        PROFILE_BASE_SELECT.replace(/,\s*plan_tier/, "")
          .replace(/,\s*hide_powered_by_sito/, "")
          .replace(/,\s*is_pro_store/, "")
          .replace(/,\s*storefront_show_blog/, "")
      )
      .eq("custom_slug", normalized)
      .eq("listed_on_marketplace", true)
      .maybeSingle();
    if (legacy.error || !legacy.data || !(legacy.data as { id?: string }).id) return null;
    return legacy.data as unknown as PublicStorefrontProfile;
  }

  return result.data as unknown as PublicStorefrontProfile;
}

export function profilePlanTier(profile: {
  plan_tier?: string | null;
  is_pro_store?: boolean | null;
}): PlanTier {
  return resolvePlanTier({
    plan_tier: profile.plan_tier,
    is_pro_store: profile.is_pro_store,
  });
}

/** Whether a public sub-page should be served for this creator */
export function isPublicSubPageAllowed(
  profile: { plan_tier?: string | null; is_pro_store?: boolean | null; storefront_nav?: unknown },
  pageId: Exclude<StorefrontNavId, "home">
): boolean {
  const tier = profilePlanTier(profile);

  // Free: keep /shop reachable for existing “View shop” links; gate other funnels
  if (!canUseStorefrontFunnels(tier)) {
    return pageId === "shop";
  }

  const item = parseStorefrontNav(profile.storefront_nav).items.find((i) => i.id === pageId);
  return item ? item.enabled !== false : pageId === "shop";
}

export function shouldHidePoweredBy(profile: {
  hide_powered_by_sito?: unknown;
  plan_tier?: string | null;
  is_pro_store?: boolean | null;
}): boolean {
  return (
    !!profile.hide_powered_by_sito &&
    (profile.plan_tier === "pro" || !!profile.is_pro_store)
  );
}
