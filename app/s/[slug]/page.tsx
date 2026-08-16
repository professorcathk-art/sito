import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StorefrontView } from "@/components/storefront-view";
import { StorefrontNavBar } from "@/components/storefront/storefront-nav-bar";
import { JsonLd } from "@/components/json-ld";
import {
  getDesignStateFromProfile,
  THEME_PRESET_VALUES,
  normalizeThemePreset,
} from "@/lib/storefront-theme-config";
import { getSiteUrl } from "@/lib/site-url";
import {
  loadPublicStorefrontProfile,
  shouldHidePoweredBy,
} from "@/lib/storefront-public";

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
  const normalizedSlug = slug.toLowerCase().trim();

  try {
    const profile = await loadPublicStorefrontProfile(normalizedSlug);
    if (!profile?.id) notFound();

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

    const site = getSiteUrl();
    const personLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: String(profile.name || "Expert"),
      description: String(profile.bio || profile.tagline || "").slice(0, 300),
      url: `${site}/s/${normalizedSlug}`,
      image: (profile.avatar_url as string) || undefined,
      jobTitle: (profile.tagline as string) || undefined,
      sameAs: [
        profile.website,
        profile.linkedin,
        profile.instagram_url,
        profile.twitter_url,
        profile.youtube_url,
      ].filter(Boolean) as string[],
    };

    const navSlot = (
      <StorefrontNavBar
        slug={normalizedSlug}
        active="home"
        navConfig={profile.storefront_nav}
        planTier={profile.plan_tier as string | null}
        isProStore={profile.is_pro_store as boolean | null}
        textColor={designState.textColor}
        accentColor={designState.buttonColor}
      />
    );

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
            Loading storefront…
          </div>
        }
      >
        <JsonLd data={personLd} />
        <StorefrontView
          expertId={String(profile.id)}
          expertName={String(profile.name || "Expert")}
          expertBio={String(profile.bio || "")}
          expertTagline={profile.tagline as string | undefined}
          bioOverride={profile.storefront_bio_override as string | undefined}
          avatarUrl={profile.avatar_url as string | undefined}
          verified={!!profile.verified}
          designState={{ ...designState, glowElement, themePreset: themeKey }}
          customLinks={(profile.storefront_custom_links as any) || []}
          website={profile.website as string | undefined}
          linkedin={profile.linkedin as string | undefined}
          instagramUrl={profile.instagram_url as string | undefined}
          tiktokUrl={profile.tiktok_url as string | undefined}
          twitterUrl={profile.twitter_url as string | undefined}
          youtubeUrl={profile.youtube_url as string | undefined}
          storefrontBackgroundImageUrl={
            (profile.storefront_background_image_url as string | undefined) ||
            (
              storefrontBlocks.find((b: { type?: string }) => b.type === "hero") as
                | { data?: { imageUrl?: string } }
                | undefined
            )?.data?.imageUrl
          }
          storefrontSlug={normalizedSlug}
          products={products}
          blogPosts={blogPosts}
          hasAppointments={hasAppointments}
          storefrontBlocks={storefrontBlocks}
          hidePoweredBy={shouldHidePoweredBy(profile)}
          navSlot={navSlot}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error fetching storefront:", error);
    notFound();
  }
}
