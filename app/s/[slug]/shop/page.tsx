import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront-view";
import { getDesignStateFromProfile, THEME_PRESET_VALUES, normalizeThemePreset } from "@/lib/storefront-theme-config";

interface ShopPageProps {
  params: Promise<{
    slug: string;
  }>;
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

export default async function StorefrontShopPage({ params }: ShopPageProps) {
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

    const profile = result.data as Record<string, unknown> | null;
    if (result.error || !profile?.id) {
      notFound();
    }

    const profileId = profile.id as string;
    let products: Array<Record<string, unknown>> = [];
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
        .limit(48);

      if (productsData) {
        products = productsData.map((p: Record<string, unknown>) => {
          const { courses, ...rest } = p as {
            courses?: { cover_image_url?: string } | { cover_image_url?: string }[] | null;
          } & Record<string, unknown>;
          const cover = Array.isArray(courses) ? courses[0]?.cover_image_url : courses?.cover_image_url;
          return {
            ...rest,
            cover_image_url: cover ?? null,
            duration_label: durationLabelForProduct(rest as {
              product_type?: string | null;
              e_learning_subtype?: string | null;
              pricing_type?: string | null;
            }),
          };
        });
      }
    }

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

    const storefrontBlocks = (profile.storefront_blocks as unknown[]) || [];
    const designState = getDesignStateFromProfile(profile);
    const themeKey = normalizeThemePreset(profile.storefront_theme_preset as string);
    const glowElement = THEME_PRESET_VALUES[themeKey]?.glowElement;

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
            Loading shop…
          </div>
        }
      >
        <StorefrontView
          expertId={String(profile.id)}
          expertName={String(profile.name || "Expert")}
          expertBio={String(profile.bio || "")}
          expertTagline={profile.tagline as string | undefined}
          bioOverride={profile.storefront_bio_override as string | undefined}
          avatarUrl={profile.avatar_url as string | undefined}
          verified={!!profile.verified}
          designState={{ ...designState, glowElement, themePreset: themeKey }}
          customLinks={(profile.storefront_custom_links as Array<{ title: string; url: string; icon?: string; order: number }>) || []}
          website={profile.website as string | undefined}
          linkedin={profile.linkedin as string | undefined}
          instagramUrl={profile.instagram_url as string | undefined}
          tiktokUrl={profile.tiktok_url as string | undefined}
          twitterUrl={profile.twitter_url as string | undefined}
          youtubeUrl={profile.youtube_url as string | undefined}
          storefrontBackgroundImageUrl={profile.storefront_background_image_url as string | undefined}
          storefrontSlug={slug.toLowerCase().trim()}
          products={products as never[]}
          blogPosts={[]}
          hasAppointments={hasAppointments}
          storefrontBlocks={storefrontBlocks as never[]}
          productsOnly
          hidePoweredBy={
            !!profile.hide_powered_by_sito &&
            (profile.plan_tier === "pro" || !!profile.is_pro_store)
          }
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error fetching storefront shop:", error);
    notFound();
  }
}
