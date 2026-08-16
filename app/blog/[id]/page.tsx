import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ArticleReader } from "@/components/posts/article-reader";
import { ArticleSidebar } from "@/components/posts/article-sidebar";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";

interface BlogPostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("title, description, featured_image_url")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "Post | Sito" };
  const desc = String(data.description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const site = getSiteUrl();
  return {
    title: `${data.title} | Sito`,
    description: desc || "Expert article on Sito",
    openGraph: {
      title: data.title,
      description: desc,
      images: data.featured_image_url ? [{ url: data.featured_image_url }] : undefined,
      url: `${site}/blog/${id}`,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: blogPost, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !blogPost) notFound();

  // Unpublished drafts: only author via client auth later — hide from public SSR if no published_at
  // (author preview still works client-side when logged in as owner via hasAccess)

  let expertProfile: {
    id: string;
    name: string;
    title: string | null;
    avatar_url: string | null;
    custom_slug?: string | null;
  } | null = null;

  if (blogPost.expert_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, title, avatar_url, custom_slug")
      .eq("id", blogPost.expert_id)
      .maybeSingle();
    if (profile) expertProfile = profile;
  }

  const blogPostWithProfile = {
    ...blogPost,
    profiles: expertProfile || {
      id: blogPost.expert_id,
      name: "Expert",
      title: null,
      avatar_url: null,
      custom_slug: null,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navigation />
      <main className="flex-1 px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <ArticleReader blogPost={blogPostWithProfile} />
          <div className="lg:pt-2">
            <ArticleSidebar
              expertId={blogPost.expert_id}
              currentPostId={blogPost.id}
              expertName={blogPostWithProfile.profiles.name}
              customSlug={blogPostWithProfile.profiles.custom_slug}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
