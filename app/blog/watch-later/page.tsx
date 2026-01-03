"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import Image from "next/image";

interface BlogPost {
  id: string;
  title: string;
  description: string;
  featured_image_url: string | null;
  reading_time_minutes: number;
  published_at: string;
  expert_id: string;
  expert_name: string;
  expert_avatar_url: string | null;
  view_count: number;
  like_count: number;
}

export default function WatchLaterPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingPost, setRemovingPost] = useState<string | null>(null);
  
  useEffect(() => {
    if (user) {
      fetchWatchLater();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      fetchWatchLater();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWatchLater = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch user's watchlist
      const { data: watchlist, error: watchlistError } = await supabase
        .from("blog_watchlist")
        .select("blog_post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (watchlistError) throw watchlistError;

      if (!watchlist || watchlist.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = watchlist.map((w: any) => w.blog_post_id);

      // Fetch blog posts - include both public and subscriber-only posts
      const { data: blogPosts, error: blogError } = await supabase
        .from("blog_posts")
        .select("id, title, description, featured_image_url, reading_time_minutes, published_at, expert_id, view_count, like_count, access_level")
        .in("id", postIds)
        .in("access_level", ["public", "subscriber"]);

      if (blogError) throw blogError;

      // Get expert IDs
      const expertIds = Array.from(new Set(blogPosts?.map((p: any) => p.expert_id) || []));

      // Fetch expert profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", expertIds);

      if (profilesError) throw profilesError;

      // Combine data
      const combinedPosts = (blogPosts || []).map((post: any) => {
        const profile = profiles?.find((p: any) => p.id === post.expert_id);
        return {
          ...post,
          expert_name: profile?.name || "Expert",
          expert_avatar_url: profile?.avatar_url || null,
        };
      });

      setPosts(combinedPosts);
    } catch (error) {
      console.error("Error fetching watch later:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (postId: string) => {
    if (!user) return;
    setRemovingPost(postId);
    try {
      const { error } = await supabase
        .from("blog_watchlist")
        .delete()
        .eq("blog_post_id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchWatchLater();
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      alert("Failed to remove from watchlist. Please try again.");
    } finally {
      setRemovingPost(null);
    }
  };

  const formatDate = (dateString: string) => {
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
          <h1 className="text-4xl font-bold text-custom-text mb-8">Watch Later</h1>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-dark-green-800/30 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 text-lg mb-4">Your watchlist is empty.</p>
              <Link
                href="/blog"
                className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Browse Blogs
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg overflow-hidden hover:border-cyber-green transition-colors"
                  style={{ height: "160px" }}
                >
                  <Link
                    href={`/blog/${post.id}`}
                    className="flex h-full"
                  >
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
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {post.expert_avatar_url ? (
                            <Image
                              src={post.expert_avatar_url}
                              alt={post.expert_name}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-dark-green-700 flex items-center justify-center">
                              <span className="text-xs text-cyber-green font-bold">
                                {post.expert_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-semibold text-custom-text truncate">
                            {post.expert_name}
                          </span>
                          <span className="text-xs text-custom-text/60">
                            {formatDate(post.published_at)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-custom-text mb-1 line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-custom-text/70 line-clamp-2 mb-2">
                          {post.description}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-custom-text/60">
                        <div className="flex items-center gap-4">
                          <span>{post.reading_time_minutes} min read</span>
                          <span>{post.view_count} views</span>
                          <span>❤️ {post.like_count}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemove(post.id);
                          }}
                          disabled={removingPost === post.id}
                          className="px-3 py-1.5 bg-red-900/50 text-red-300 rounded hover:bg-red-900/70 transition-colors text-sm disabled:opacity-50"
                        >
                          {removingPost === post.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

