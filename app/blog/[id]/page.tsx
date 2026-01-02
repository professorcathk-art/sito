import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { BlogPostView } from "@/components/blog-post-view";
import { notFound } from "next/navigation";

interface BlogPostPageProps {
  params: {
    id: string;
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const supabase = await createClient();
  
  const { data: blogPost, error } = await supabase
    .from("blog_posts")
    .select(`
      *,
      profiles:expert_id (
        id,
        name,
        title,
        avatar_url
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !blogPost) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-12">
        <BlogPostView blogPost={blogPost} />
      </div>
    </div>
  );
}

