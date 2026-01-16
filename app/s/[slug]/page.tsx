import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

interface ShortlinkPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ShortlinkPage({ params }: ShortlinkPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
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

    // Use permanent redirect (308) instead of temporary (307) for better SEO
    redirect(`/expert/${profile.id}`);
  } catch (error: any) {
    // Check if it's a redirect error (which is expected)
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      // Re-throw redirect errors - they're expected
      throw error;
    }
    console.error("Error fetching profile by slug:", error);
    notFound();
  }
}
