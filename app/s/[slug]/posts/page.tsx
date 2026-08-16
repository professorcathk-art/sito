import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StorefrontView } from "@/components/storefront-view";
import { StorefrontNavBar } from "@/components/storefront/storefront-nav-bar";
import {
  getDesignStateFromProfile,
  THEME_PRESET_VALUES,
  normalizeThemePreset,
} from "@/lib/storefront-theme-config";
import {
  isPublicSubPageAllowed,
  loadPublicStorefrontProfile,
  shouldHidePoweredBy,
} from "@/lib/storefront-public";
import { getSiteUrl } from "@/lib/site-url";

interface PostsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadPublicStorefrontProfile(slug);
  if (!profile) return { title: "Blog | Sito" };
  const name = String(profile.name || "Expert");
  return {
    title: `${name} — Blog | Sito`,
    description: `Articles by ${name} on Sito`,
    openGraph: {
      title: `${name} — Blog`,
      url: `${getSiteUrl()}/s/${slug.toLowerCase().trim()}/posts`,
    },
  };
}

export default async function StorefrontPostsPage({ params }: PostsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const normalizedSlug = slug.toLowerCase().trim();

  const profile = await loadPublicStorefrontProfile(normalizedSlug);
  if (!profile?.id) notFound();

  if (!isPublicSubPageAllowed(profile, "posts")) {
    redirect(`/s/${normalizedSlug}`);
  }

  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("id, title, description, featured_image_url, published_at")
    .eq("expert_id", profile.id)
    .eq("access_level", "public")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);

  const designState = getDesignStateFromProfile(profile);
  const themeKey = normalizeThemePreset(profile.storefront_theme_preset as string);
  const glowElement = THEME_PRESET_VALUES[themeKey]?.glowElement;

  const navSlot = (
    <StorefrontNavBar
      slug={normalizedSlug}
      active="posts"
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
          Loading posts…
        </div>
      }
    >
      <StorefrontView
        expertId={String(profile.id)}
        expertName={String(profile.name || "Expert")}
        expertBio={String(profile.bio || "")}
        expertTagline={profile.tagline as string | undefined}
        avatarUrl={profile.avatar_url as string | undefined}
        verified={!!profile.verified}
        designState={{ ...designState, glowElement, themePreset: themeKey }}
        customLinks={[]}
        storefrontSlug={normalizedSlug}
        products={[]}
        blogPosts={(blogPosts || []) as never[]}
        hasAppointments={false}
        storefrontBlocks={[]}
        postsOnly
        hidePoweredBy={shouldHidePoweredBy(profile)}
        navSlot={navSlot}
      />
    </Suspense>
  );
}
