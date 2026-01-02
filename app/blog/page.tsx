import { Navigation } from "@/components/navigation";
import { BlogPostsList } from "@/components/blog-posts-list";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProtectedRoute } from "@/components/protected-route";

export default async function BlogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-custom-text mb-2">
                Blog Posts
              </h1>
              <p className="text-custom-text/80">
                Discover insights and knowledge from industry experts
              </p>
            </div>
            {user && (
              <Link
                href="/blog/create"
                className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Create Post
              </Link>
            )}
          </div>
          <BlogPostsList />
        </div>
      </div>
    </div>
  );
}

