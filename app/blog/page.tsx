"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { useAuth } from "@/contexts/auth-context";
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
  is_liked: boolean;
  is_saved: boolean;
  is_subscribed: boolean;
  access_level: "public" | "subscriber" | "paid";
  has_access: boolean;
}

export default function BlogFeedPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [savingPost, setSavingPost] = useState<string | null>(null);

  useEffect(() => {
    fetchBlogPosts();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlogPosts = async () => {
    setLoading(true);
    try {
      // Fetch all blog posts (public and subscriber-only)
      const { data: blogPosts, error: blogError } = await supabase
        .from("blog_posts")
        .select("id, title, description, featured_image_url, reading_time_minutes, published_at, expert_id, view_count, like_count, access_level")
        .in("access_level", ["public", "subscriber"])
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(100);

      if (blogError) throw blogError;

      // Get expert IDs
      const expertIds = Array.from(new Set(blogPosts?.map((p: any) => p.expert_id) || []));
      
      // Fetch expert profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", expertIds);

      if (profilesError) throw profilesError;

      // Get user's subscriptions if logged in
      let subscribedExpertIds: string[] = [];
      if (user) {
        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("expert_id")
          .eq("user_id", user.id);
        subscribedExpertIds = subscriptions?.map((s: any) => s.expert_id) || [];
      }

      // Check access for each post
      const postsWithAccess = (blogPosts || []).map((post: any) => {
        const hasAccess = post.access_level === "public" || 
          (user && (subscribedExpertIds.includes(post.expert_id) || post.expert_id === user.id));
        return { ...post, has_access: hasAccess };
      });

      // Get user's likes and watchlist if logged in
      let likedPostIds: string[] = [];
      let savedPostIds: string[] = [];
      if (user && postsWithAccess) {
        const postIds = postsWithAccess.map((p: any) => p.id);
        const { data: likes } = await supabase
          .from("blog_likes")
          .select("blog_post_id")
          .eq("user_id", user.id)
          .in("blog_post_id", postIds);
        likedPostIds = likes?.map((l: any) => l.blog_post_id) || [];

        const { data: watchlist } = await supabase
          .from("blog_watchlist")
          .select("blog_post_id")
          .eq("user_id", user.id)
          .in("blog_post_id", postIds);
        savedPostIds = watchlist?.map((w: any) => w.blog_post_id) || [];
      }

      // Combine and sort posts with algorithm
      const combinedPosts = postsWithAccess.map((post: any) => {
        const profile = profiles?.find((p: any) => p.id === post.expert_id);
        const isSubscribed = subscribedExpertIds.includes(post.expert_id);
        const isLiked = likedPostIds.includes(post.id);
        const isSaved = savedPostIds.includes(post.id);

        // Calculate score for sorting (like Instagram/Netflix algorithm)
        const daysSincePublished = Math.max(1, Math.floor((Date.now() - new Date(post.published_at).getTime()) / (1000 * 60 * 60 * 24)));
        const recencyScore = 1 / Math.log(daysSincePublished + 1); // Logarithmic decay
        const engagementScore = (post.like_count * 2 + post.view_count * 0.1) / Math.max(1, daysSincePublished);
        const subscriptionBoost = isSubscribed ? 10 : 0;
        const score = recencyScore * 0.3 + engagementScore * 0.5 + subscriptionBoost;

        return {
          ...post,
          expert_name: profile?.name || "Expert",
          expert_avatar_url: profile?.avatar_url || null,
          is_liked: isLiked,
          is_saved: isSaved,
          is_subscribed: isSubscribed,
          score,
        };
      });

      // Sort by score (subscribed posts first, then trending, then recent)
      combinedPosts.sort((a, b) => {
        if (a.is_subscribed !== b.is_subscribed) {
          return a.is_subscribed ? -1 : 1;
        }
        return b.score - a.score;
      });

      setPosts(combinedPosts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) {
      window.location.href = `/login?redirect=/blog`;
      return;
    }

    setLikingPost(postId);
    try {
      if (currentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("blog_likes")
          .insert({
            blog_post_id: postId,
            user_id: user.id,
          });
        if (error) throw error;
      }
      // Refresh posts to update like count and view count
      await fetchBlogPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
      alert("Failed to update like. Please try again.");
    } finally {
      setLikingPost(null);
    }
  };

  const handleSave = async (postId: string, currentlySaved: boolean) => {
    if (!user) {
      window.location.href = `/login?redirect=/blog`;
      return;
    }

    setSavingPost(postId);
    try {
      if (currentlySaved) {
        // Remove from watchlist
        const { error } = await supabase
          .from("blog_watchlist")
          .delete()
          .eq("blog_post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from("blog_watchlist")
          .insert({
            blog_post_id: postId,
            user_id: user.id,
          });
        if (error) throw error;
      }
      // Refresh posts to update saved status
      await fetchBlogPosts();
    } catch (error) {
      console.error("Error toggling save:", error);
      alert("Failed to update watchlist. Please try again.");
    } finally {
      setSavingPost(null);
    }
  };

  const trackView = async (postId: string) => {
    if (!user) return; // Only track for logged-in users
    
    try {
      const { error } = await supabase
        .from("blog_views")
        .upsert({
          blog_post_id: postId,
          user_id: user.id,
        }, {
          onConflict: "blog_post_id,user_id",
        });
      
      if (!error) {
        // Refresh posts to update view count
        await fetchBlogPosts();
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-custom-text mb-2">Blog Feed</h1>
            <p className="text-base sm:text-lg text-custom-text/80">
              Discover insights from industry experts
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-dark-green-800/30 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 text-lg">No blog posts available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg overflow-hidden hover:border-cyber-green transition-colors"
                  style={{ height: "160px" }} // Fixed height like Twitter/Threads
                >
                  {post.has_access ? (
                    <Link
                      href={`/blog/${post.id}`}
                      onClick={() => trackView(post.id)}
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
                            <span className="text-sm font-semibold text-custom-text truncate">
                              {post.expert_name}
                            </span>
                            {post.is_subscribed && (
                              <span className="text-xs text-cyber-green bg-cyber-green/20 px-2 py-0.5 rounded">
                                Subscribed
                              </span>
                            )}
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
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleLike(post.id, post.is_liked);
                              }}
                              disabled={likingPost === post.id}
                              className={`p-1.5 rounded transition-colors ${
                                post.is_liked
                                  ? "text-red-500 hover:bg-red-900/20"
                                  : "text-custom-text/60 hover:bg-dark-green-800/50"
                              }`}
                            >
                              ❤️ {post.like_count}
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSave(post.id, post.is_saved);
                              }}
                              disabled={savingPost === post.id}
                              className={`p-1.5 rounded transition-colors ${
                                post.is_saved
                                  ? "text-cyber-green hover:bg-cyber-green/20"
                                  : "text-custom-text/60 hover:bg-dark-green-800/50"
                              }`}
                            >
                              {post.is_saved ? "✓ Saved" : "💾 Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div
                      onClick={() => {
                        if (!user) {
                          window.location.href = `/login?redirect=/blog/${post.id}`;
                        } else {
                          window.location.href = `/blog/${post.id}`;
                        }
                      }}
                      className="flex h-full cursor-pointer"
                    >
                      {/* Featured Image - Blurred */}
                      <div className="w-48 sm:w-64 flex-shrink-0 relative">
                        {post.featured_image_url ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={post.featured_image_url}
                              alt={post.title}
                              fill
                              className="object-cover blur-sm opacity-50"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-4xl text-cyber-green">🔒</div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-dark-green-800 to-dark-green-900 flex items-center justify-center opacity-50">
                            <div className="text-4xl text-cyber-green">🔒</div>
                          </div>
                        )}
                      </div>

                      {/* Content - Masked */}
                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0 relative">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-custom-text/60 truncate">
                              {post.expert_name}
                            </span>
                            <span className="text-xs text-custom-text/60">
                              {formatDate(post.published_at)}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-custom-text/80 mb-1 line-clamp-2">
                            {post.title}
                          </h3>
                          <div className="relative">
                            <p className="text-sm text-custom-text/40 line-clamp-2 mb-2 blur-sm select-none">
                              {post.description || "This content is available to subscribers only. Subscribe to unlock this post and access exclusive content from this expert."}
                            </p>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-dark-green-900/80 backdrop-blur-sm border border-cyber-green/30 rounded-lg p-3 flex items-center gap-2">
                                <span className="text-2xl">🔒</span>
                                <span className="text-sm text-custom-text font-semibold">
                                  {!user ? "Sign in to view" : "Subscribe to view"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-custom-text/40">
                          <div className="flex items-center gap-4">
                            <span>{post.reading_time_minutes} min read</span>
                            <span>{post.view_count} views</span>
                          </div>
                          <div className="text-xs text-cyber-green font-semibold">
                            {!user ? "Sign In Required" : "Subscribe to Unlock"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
