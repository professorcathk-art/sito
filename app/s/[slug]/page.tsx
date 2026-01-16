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
      .eq("custom_slug", slug)
      .eq("listed_on_marketplace", true)
      .single();

    if (error || !profile) {
      notFound();
    }

    redirect(`/expert/${profile.id}`);
  } catch (error) {
    console.error("Error fetching profile by slug:", error);
    notFound();
  }
}
