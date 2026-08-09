import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/directory`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/featured-courses`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/products`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = await createClient();

    const [{ data: storefronts }, { data: courses }] = await Promise.all([
      supabase
        .from("profiles")
        .select("custom_slug, updated_at")
        .eq("listed_on_marketplace", true)
        .not("custom_slug", "is", null)
        .limit(5000),
      supabase
        .from("courses")
        .select("id, updated_at, created_at")
        .limit(5000),
    ]);

    const storefrontEntries: MetadataRoute.Sitemap = (storefronts || [])
      .filter((p) => p.custom_slug)
      .flatMap((p) => [
        {
          url: `${base}/s/${String(p.custom_slug).toLowerCase()}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.85,
        },
        {
          url: `${base}/s/${String(p.custom_slug).toLowerCase()}/shop`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
      ]);

    const courseEntries: MetadataRoute.Sitemap = (courses || []).map((c) => ({
      url: `${base}/courses/${c.id}`,
      lastModified: c.updated_at
        ? new Date(c.updated_at)
        : c.created_at
          ? new Date(c.created_at)
          : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

    return [...staticRoutes, ...storefrontEntries, ...courseEntries];
  } catch (err) {
    console.error("sitemap generation error:", err);
    return staticRoutes;
  }
}
