"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BlogPost {
  id: string;
  title: string;
  description: string;
  featured_image_url: string | null;
  access_level: string;
  published_at: string | null;
  reading_time_minutes: number;
  view_count: number;
  like_count: number;
}

export default function DashboardBlogPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBlogPosts();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlogPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, description, featured_image_url, access_level, published_at, reading_time_minutes, view_count, like_count")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    if (!user) return;

    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postId)
        .eq("expert_id", user.id);

      if (error) throw error;
      await fetchBlogPosts();
      alert("Blog post deleted successfully!");
    } catch (error) {
      console.error("Error deleting blog post:", error);
      alert("Failed to delete blog post. Please try again.");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Draft";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-custom-text">My Blog Posts</h1>
            <button
              onClick={() => router.push("/blog/create")}
              className="flex items-center gap-2 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              <span className="text-xl">+</span>
              <span>Create Blog Post</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-dark-green-800/30 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-dark-green-800/30 border border-cyber-green/30 rounded-lg">
              <p className="text-custom-text/80 text-lg mb-4">You haven&apos;t created any blog posts yet.</p>
              <button
                onClick={() => router.push("/blog/create")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                <span className="text-xl">+</span>
                <span>Create Your First Blog Post</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg overflow-hidden hover:border-cyber-green transition-colors"
                >
                  <div className="flex">
                    {/* Featured Image */}
                    <div className="w-48 sm:w-64 flex-shrink-0 relative">
                      {post.featured_image_url ? (
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-dark-green-800 to-dark-green-900 flex items-center justify-center">
                          <span className="text-4xl text-cyber-green font-bold">
                            {post.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-custom-text line-clamp-1">
                            {post.title}
                          </h3>
                          {post.published_at ? (
                            <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                              Published
                            </span>
                          ) : (
                            <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-1 rounded">
                              Draft
                            </span>
                          )}
                          <span className="text-xs bg-dark-green-900/50 text-custom-text/70 px-2 py-1 rounded">
                            {post.access_level}
                          </span>
                        </div>
                        <p className="text-sm text-custom-text/70 line-clamp-2 mb-3">
                          {post.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-custom-text/60">
                          <span>{formatDate(post.published_at)}</span>
                          <span>•</span>
                          <span>{post.reading_time_minutes} min read</span>
                          <span>•</span>
                          <span>{post.view_count} views</span>
                          <span>•</span>
                          <span>❤️ {post.like_count} likes</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4">
                        <Link
                          href={`/blog/${post.id}`}
                          className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-900 hover:border-cyber-green transition-colors text-sm"
                        >
                          View
                        </Link>
                        <Link
                          href={`/blog/edit/${post.id}`}
                          className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-900 hover:border-cyber-green transition-colors text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="px-4 py-2 bg-red-900/50 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-900 hover:border-red-500 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

