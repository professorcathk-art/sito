import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StorefrontView } from "@/components/storefront-view";

interface StorefrontPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        id,
        name,
        bio,
        avatar_url,
        verified,
        listed_on_marketplace,
        storefront_theme_preset,
        storefront_custom_brand_color,
        storefront_button_style,
        storefront_custom_links,
        storefront_show_products,
        storefront_show_appointments,
        storefront_show_blog,
        storefront_bio_override,
        website,
        linkedin,
        instagram_url
      `)
      .eq("custom_slug", slug.toLowerCase().trim())
      .eq("listed_on_marketplace", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile by slug:", error);
      notFound();
    }

    if (!profile || !profile.id) {
      notFound();
    }

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
        .eq("expert_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (productsData) {
        products = productsData.map((p: any) => {
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
        .eq("expert_id", profile.id)
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
        .eq("expert_id", profile.id)
        .eq("is_available", true)
        .gte("start_time", new Date().toISOString());

      hasAppointments = (count || 0) > 0;
    }

    return (
      <StorefrontView
        expertId={profile.id}
        expertName={profile.name || "Expert"}
        expertBio={profile.bio || ""}
        bioOverride={profile.storefront_bio_override}
        avatarUrl={profile.avatar_url}
        verified={profile.verified || false}
        themePreset={profile.storefront_theme_preset || "default"}
        customBrandColor={profile.storefront_custom_brand_color || undefined}
        buttonStyle={profile.storefront_button_style || "rounded-md"}
        customLinks={(profile.storefront_custom_links as any) || []}
        website={profile.website}
        linkedin={profile.linkedin}
        instagramUrl={profile.instagram_url}
        products={products}
        blogPosts={blogPosts}
        hasAppointments={hasAppointments}
      />
    );
  } catch (error: any) {
    console.error("Error fetching storefront:", error);
    notFound();
  }
}
