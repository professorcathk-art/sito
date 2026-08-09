import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront-view";
import { JsonLd } from "@/components/json-ld";
import { getDesignStateFromProfile, THEME_PRESET_VALUES, normalizeThemePreset } from "@/lib/storefront-theme-config";
import { getSiteUrl } from "@/lib/site-url";

interface StorefrontPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function fetchStorefrontProfile(slug: string) {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, bio, tagline, avatar_url, custom_slug, website, linkedin, listed_on_marketplace, hide_powered_by_sito, plan_tier, is_pro_store"
    )
    .eq("custom_slug", slug.toLowerCase().trim())
    .eq("listed_on_marketplace", true)
    .maybeSingle();
  if (error) {
    const retry = await supabase
      .from("profiles")
      .select("id, name, bio, tagline, avatar_url, custom_slug, website, linkedin, listed_on_marketplace")
      .eq("custom_slug", slug.toLowerCase().trim())
      .eq("listed_on_marketplace", true)
      .maybeSingle();
    data = retry.data as typeof data;
  }
  return data;
}

export async function generateMetadata({ params }: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchStorefrontProfile(slug);
  if (!profile) {
    return { title: "Storefront | Sito" };
  }
  const name = profile.name || "Expert";
  const tagline = profile.tagline || "Expert on Sito";
  const description = (profile.bio || tagline).slice(0, 150);
  const title = `${name} — ${tagline} | Sito`;
  const site = getSiteUrl();
  const ogUrl = `${site}/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(tagline)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${site}/s/${slug.toLowerCase().trim()}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

function durationLabelForProduct(product: {
  product_type?: string | null;
  e_learning_subtype?: string | null;
  pricing_type?: string | null;
}): string | null {
  if (product.product_type === "appointment") {
    return product.pricing_type === "hourly" ? "1-on-1 · Hourly" : "1-on-1 Session";
  }
  const subtype = (product.e_learning_subtype || "").toLowerCase();
  if (subtype.includes("webinar")) return "Live webinar";
  if (subtype.includes("course")) return "Self-paced course";
  if (subtype.includes("ebook")) return "Instant download";
  if (subtype.includes("prompt")) return "AI prompt pack";
  return null;
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  try {
    const baseSelect = `
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
    let profile: Record<string, unknown> | null = null;
    let error: { message: string } | null = null;

    let result = await supabase
      .from("profiles")
      .select(`${baseSelect}, storefront_subheadline_color`)
      .eq("custom_slug", slug.toLowerCase().trim())
      .eq("listed_on_marketplace", true)
      .maybeSingle();

    if (result.error) {
      // Retry without newer columns if migration not applied yet
      const legacySelect = baseSelect
        .replace(/,\s*plan_tier/, "")
        .replace(/,\s*hide_powered_by_sito/, "")
        .replace(/,\s*is_pro_store/, "");
      result = await supabase
        .from("profiles")
        .select(legacySelect)
        .eq("custom_slug", slug.toLowerCase().trim())
        .eq("listed_on_marketplace", true)
        .maybeSingle();
    }

    profile = result.data as Record<string, unknown> | null;
    error = result.error;

    if (error) {
      console.error("Error fetching profile by slug:", error);
      notFound();
    }

    if (!profile || !(profile.id as string)) {
      notFound();
    }

    const profileId = profile.id as string;
    let products: any[] = [];
    if (profile.storefront_show_products !== false) {
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          pricing_type,
          product_type,
          course_id,
          e_learning_subtype,
          courses(cover_image_url)
        `)
        .eq("expert_id", profileId)
        .order("created_at", { ascending: false })
        .limit(24);

      if (productsData) {
        products = productsData.map((p: any) => {
          const { courses, ...rest } = p;
          return {
            ...rest,
            cover_image_url: courses?.cover_image_url ?? null,
            duration_label: durationLabelForProduct(rest),
          };
        });
      }
    }

    let blogPosts: any[] = [];
    if (profile.storefront_show_blog !== false) {
      const { data: blogData } = await supabase
        .from("blog_posts")
        .select("id, title, description, featured_image_url, published_at")
        .eq("expert_id", profileId)
        .eq("access_level", "public")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(5);

      if (blogData) {
        blogPosts = blogData;
      }
    }

    let hasAppointments = false;
    if (profile.storefront_show_appointments !== false) {
      const [{ count }, { count: apptProductCount }] = await Promise.all([
        supabase
          .from("appointment_slots")
          .select("*", { count: "exact", head: true })
          .eq("expert_id", profileId)
          .eq("is_available", true)
          .gte("start_time", new Date().toISOString()),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("expert_id", profileId)
          .eq("product_type", "appointment"),
      ]);

      hasAppointments = (count || 0) > 0 || (apptProductCount || 0) > 0;
    }

    const storefrontBlocks = (profile.storefront_blocks as any[]) || [];
    const designState = getDesignStateFromProfile(profile);
    const themeKey = normalizeThemePreset(profile.storefront_theme_preset as string);
    const glowElement = THEME_PRESET_VALUES[themeKey]?.glowElement;

    const p = profile as Record<string, unknown>;
    const site = getSiteUrl();
    const personLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: String(p.name || "Expert"),
      description: String(p.bio || p.tagline || "").slice(0, 300),
      url: `${site}/s/${slug.toLowerCase().trim()}`,
      image: (p.avatar_url as string) || undefined,
      jobTitle: (p.tagline as string) || undefined,
      sameAs: [p.website, p.linkedin, p.instagram_url, p.twitter_url, p.youtube_url].filter(
        Boolean
      ) as string[],
    };
    const hideBadge =
      (!!p.hide_powered_by_sito && (p.plan_tier === "pro" || !!p.is_pro_store));

    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading storefront…</div>}>
        <JsonLd data={personLd} />
        <StorefrontView
          expertId={String(p.id)}
          expertName={String(p.name || "Expert")}
          expertBio={String(p.bio || "")}
          expertTagline={p.tagline as string | undefined}
          bioOverride={p.storefront_bio_override as string | undefined}
          avatarUrl={p.avatar_url as string | undefined}
          verified={!!p.verified}
          designState={{ ...designState, glowElement, themePreset: themeKey }}
          customLinks={(p.storefront_custom_links as any) || []}
          website={p.website as string | undefined}
          linkedin={p.linkedin as string | undefined}
          instagramUrl={p.instagram_url as string | undefined}
          tiktokUrl={p.tiktok_url as string | undefined}
          twitterUrl={p.twitter_url as string | undefined}
          youtubeUrl={p.youtube_url as string | undefined}
          storefrontBackgroundImageUrl={
            (p.storefront_background_image_url as string | undefined) ||
            ((storefrontBlocks.find((b: { type?: string }) => b.type === "hero") as { data?: { imageUrl?: string } } | undefined)?.data
              ?.imageUrl)
          }
          storefrontSlug={slug.toLowerCase().trim()}
          products={products}
          blogPosts={blogPosts}
          hasAppointments={hasAppointments}
          storefrontBlocks={storefrontBlocks}
          hidePoweredBy={hideBadge}
        />
      </Suspense>
    );
  } catch (error: any) {
    console.error("Error fetching storefront:", error);
    notFound();
  }
}
