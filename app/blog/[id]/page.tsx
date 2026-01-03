import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { BlogPostView } from "@/components/blog-post-view";
import { BlogPostSidebar } from "@/components/blog-post-sidebar";
import { Footer } from "@/components/footer";
import { notFound } from "next/navigation";

interface BlogPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  try {
    const { data: blogPost, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching blog post:", error);
      notFound();
    }

    if (!blogPost) {
      notFound();
    }

    // Fetch expert profile separately
    let expertProfile = null;
    if (blogPost.expert_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, title, avatar_url")
        .eq("id", blogPost.expert_id)
        .single();
      
      // Don't fail if profile not found, just use defaults
      if (!profileError && profile) {
        expertProfile = profile;
      }
    }

    const blogPostWithProfile = {
      ...blogPost,
      profiles: expertProfile || {
        id: blogPost.expert_id,
        name: "Expert",
        title: null,
        avatar_url: null,
      },
    };

    return (
    <div className="min-h-screen bg-custom-bg flex flex-col">
      <Navigation />
      <div className="pt-24 pb-12 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-3/4">
            <BlogPostView blogPost={blogPostWithProfile} />
          </div>
          <div className="lg:w-1/4">
            <BlogPostSidebar expertId={blogPost.expert_id} currentPostId={blogPost.id} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
    );
  } catch (err) {
    console.error("Error in blog post page:", err);
    notFound();
  }
}

