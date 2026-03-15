import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront-view";
import { getDesignStateFromProfile, THEME_PRESET_VALUES } from "@/lib/storefront-theme-config";

interface StorefrontPageProps {
  params: Promise<{
    slug: string;
  }>;
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
      result = await supabase
        .from("profiles")
        .select(baseSelect)
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
    // Fetch products if enabled (with course cover image for thumbnails)
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
        .limit(20);

      if (productsData) {
        products = productsData
          .filter((p: any) => p.product_type !== "appointment")
          .map((p: any) => {
            const { courses, ...rest } = p;
            return {
              ...rest,
              cover_image_url: courses?.cover_image_url ?? null,
            };
          });
      }
    }

    // Fetch blog posts if enabled
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

    // Check for appointment slots if enabled
    let hasAppointments = false;
    if (profile.storefront_show_appointments !== false) {
      const { count } = await supabase
        .from("appointment_slots")
        .select("*", { count: "exact", head: true })
        .eq("expert_id", profileId)
        .eq("is_available", true)
        .gte("start_time", new Date().toISOString());

      hasAppointments = (count || 0) > 0;
    }

    const storefrontBlocks = (profile.storefront_blocks as any[]) || [];
    const designState = getDesignStateFromProfile(profile);
    const rawTheme = profile.storefront_theme_preset || "default";
    const themeKey = rawTheme === "minimal-light" ? "minimal" : rawTheme === "bold-dark" ? "midnight-glass" : rawTheme;
    const glowElement = THEME_PRESET_VALUES[themeKey as keyof typeof THEME_PRESET_VALUES]?.glowElement;

    const p = profile as Record<string, unknown>;
    return (
      <StorefrontView
        expertId={String(p.id)}
        expertName={String(p.name || "Expert")}
        expertBio={String(p.bio || "")}
        expertTagline={p.tagline as string | undefined}
        bioOverride={p.storefront_bio_override as string | undefined}
        avatarUrl={p.avatar_url as string | undefined}
        verified={!!p.verified}
        designState={{ ...designState, glowElement }}
        customLinks={(p.storefront_custom_links as any) || []}
        website={p.website as string | undefined}
        linkedin={p.linkedin as string | undefined}
        instagramUrl={p.instagram_url as string | undefined}
        tiktokUrl={p.tiktok_url as string | undefined}
        twitterUrl={p.twitter_url as string | undefined}
        youtubeUrl={p.youtube_url as string | undefined}
        storefrontBackgroundImageUrl={p.storefront_background_image_url as string | undefined}
        products={products}
        blogPosts={blogPosts}
        hasAppointments={hasAppointments}
        storefrontBlocks={storefrontBlocks}
      />
    );
  } catch (error: any) {
    console.error("Error fetching storefront:", error);
    notFound();
  }
}
