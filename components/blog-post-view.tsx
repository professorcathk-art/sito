"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { SubscribeButton } from "@/components/subscribe-button";

interface BlogPost {
  id: string;
  expert_id: string;
  title: string;
  description: string | null;
  content: string;
  featured_image_url: string | null;
  access_level: "public" | "subscriber" | "paid";
  reading_time_minutes: number | null;
  published_at: string;
  created_at: string;
  profiles?: {
    id: string;
    name: string;
    title: string | null;
    avatar_url: string | null;
  };
}

interface BlogPostViewProps {
  blogPost: BlogPost;
}

export function BlogPostView({ blogPost }: BlogPostViewProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [viewTracked, setViewTracked] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (blogPost.access_level === "public") {
        setHasAccess(true);
        setCheckingAccess(false);
        return;
      }

      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      if (blogPost.expert_id === user.id) {
        setHasAccess(true);
        setCheckingAccess(false);
        return;
      }

      if (blogPost.access_level === "subscriber") {
        const { data } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("expert_id", blogPost.expert_id)
          .single();

        setHasAccess(!!data);
      } else if (blogPost.access_level === "paid") {
        // Check if user has enrolled in any paid course from this expert
        // First get paid course IDs from this expert
        const { data: courses } = await supabase
          .from("courses")
          .select("id")
          .eq("expert_id", blogPost.expert_id)
          .eq("is_free", false);

        if (courses && courses.length > 0) {
          const courseIds = courses.map(c => c.id);
          const { data } = await supabase
            .from("course_enrollments")
            .select("id")
            .eq("user_id", user.id)
            .in("course_id", courseIds)
            .limit(1)
            .single();

          setHasAccess(!!data);
        } else {
          setHasAccess(false);
        }
      }

      setCheckingAccess(false);
    }

    checkAccess();
    if (user && blogPost.profiles && user.id !== blogPost.profiles.id) {
      checkConnectionStatus();
    }
    if (user) {
      checkLikeAndSave();
      fetchLikeCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogPost, user, supabase]);

  const checkLikeAndSave = async () => {
    if (!user) return;

    try {
      const [likeRes, saveRes] = await Promise.all([
        supabase
          .from("blog_likes")
          .select("id")
          .eq("blog_post_id", blogPost.id)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("blog_watchlist")
          .select("id")
          .eq("blog_post_id", blogPost.id)
          .eq("user_id", user.id)
          .single(),
      ]);

      setLiked(!!likeRes.data);
      setSaved(!!saveRes.data);
    } catch (err) {
      // Not found is fine
    }
  };

  const fetchLikeCount = async () => {
    try {
      const { data } = await supabase
        .from("blog_posts")
        .select("like_count")
        .eq("id", blogPost.id)
        .single();

      if (data) {
        setLikeCount(data.like_count || 0);
      }
    } catch (err) {
      console.error("Error fetching like count:", err);
    }
  };

  const handleLike = async () => {
    if (!user) {
      window.location.href = `/login?redirect=/blog/${blogPost.id}`;
      return;
    }

    setLiking(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_post_id", blogPost.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("blog_likes")
          .insert({
            blog_post_id: blogPost.id,
            user_id: user.id,
          });
        if (error) throw error;
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      alert("Failed to update like. Please try again.");
    } finally {
      setLiking(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      window.location.href = `/login?redirect=/blog/${blogPost.id}`;
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        const { error } = await supabase
          .from("blog_watchlist")
          .delete()
          .eq("blog_post_id", blogPost.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setSaved(false);
      } else {
        const { error } = await supabase
          .from("blog_watchlist")
          .insert({
            blog_post_id: blogPost.id,
            user_id: user.id,
          });
        if (error) throw error;
        setSaved(true);
      }
    } catch (err) {
      console.error("Error toggling save:", err);
      alert("Failed to update watchlist. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!user || !blogPost.profiles) return;

    try {
      const { data: sentConnection } = await supabase
        .from("connections")
        .select("status")
        .eq("user_id", user.id)
        .eq("expert_id", blogPost.profiles.id)
        .single();

      if (sentConnection) {
        setConnectionStatus(sentConnection.status as "pending" | "accepted" | "rejected");
      } else {
        const { data: receivedConnection } = await supabase
          .from("connections")
          .select("status")
          .eq("user_id", blogPost.profiles.id)
          .eq("expert_id", user.id)
          .single();

        if (receivedConnection) {
          setConnectionStatus(receivedConnection.status === "accepted" ? "accepted" : "none");
        } else {
          setConnectionStatus("none");
        }
      }
    } catch (err) {
      setConnectionStatus("none");
    }
  };

  const handleConnect = async () => {
    if (!user || !blogPost.profiles || user.id === blogPost.profiles.id) {
      return;
    }

    setConnecting(true);
    try {
      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          expert_id: blogPost.profiles.id,
          status: "pending",
        });

      if (error) throw error;

      setConnectionStatus("pending");
      alert("Connection request sent!");

      // Send email notification
      try {
        await fetch("/api/notify-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expert_id: blogPost.profiles.id,
            user_name: user.email || "A user",
          }),
        });
      } catch (err) {
        console.error("Error sending notification:", err);
      }
    } catch (error: any) {
      console.error("Error sending connection request:", error);
      alert("Failed to send connection request. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-green-800/50 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-dark-green-800/50 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-custom-text mb-4">Access Restricted</h2>
          <p className="text-custom-text/80 mb-6">
            {blogPost.access_level === "subscriber"
              ? "This post is available to subscribers only."
              : "This post is available to paid members only."}
          </p>
          {!user ? (
            <Link
              href={`/login?redirect=/blog/${blogPost.id}`}
              className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              Sign In
            </Link>
          ) : blogPost.access_level === "subscriber" ? (
            <Link
              href={`/expert/${blogPost.expert_id}`}
              className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              Subscribe to {blogPost.profiles?.name || "Expert"}
            </Link>
          ) : (
            <Link
              href={`/expert/${blogPost.expert_id}`}
              className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              View Courses
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <article className="flex-1">
        {/* Header */}
        <header className="mb-8">
          {/* Like and Save Buttons - Above Content */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                liked
                  ? "bg-red-900/30 text-red-300 border border-red-500/50"
                  : "bg-dark-green-900/50 text-custom-text border border-cyber-green/30 hover:bg-dark-green-800/50"
              }`}
            >
              <span>{liked ? "❤️" : "🤍"}</span>
              <span>{likeCount}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                saved
                  ? "bg-cyber-green/20 text-cyber-green border border-cyber-green/50"
                  : "bg-dark-green-900/50 text-custom-text border border-cyber-green/30 hover:bg-dark-green-800/50"
              }`}
            >
              <span>{saved ? "✓" : "○"}</span>
              <span>{saved ? "Saved" : "Save"}</span>
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-custom-text mb-4">
            {blogPost.title}
          </h1>
          
          {blogPost.description && (
            <p className="text-xl text-custom-text/80 mb-6">{blogPost.description}</p>
          )}

          <div className="mb-6">
            {blogPost.profiles && (
              <div className="flex items-start gap-4 mb-4">
                <Link
                  href={`/expert/${blogPost.profiles?.id || blogPost.expert_id}`}
                  className="flex items-center gap-2 hover:text-cyber-green transition-colors"
                >
                  {blogPost.profiles.avatar_url ? (
                    <img
                      src={blogPost.profiles.avatar_url}
                      alt={blogPost.profiles.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-dark-green-800 flex items-center justify-center">
                      {blogPost.profiles.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{blogPost.profiles.name}</div>
                    {blogPost.profiles.title && (
                      <div className="text-sm text-custom-text/70">{blogPost.profiles.title}</div>
                    )}
                  </div>
                </Link>
              </div>
            )}
            {user && blogPost.profiles && user.id !== blogPost.profiles.id && (
              <div className="flex flex-wrap gap-2 mb-4">
                <SubscribeButton expertId={blogPost.profiles.id} expertName={blogPost.profiles.name} />
                <Link
                  href={`/messages?expert=${blogPost.profiles.id}`}
                  className="px-4 py-2 bg-dark-green-800/50 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800 hover:border-cyber-green transition-colors text-sm font-medium"
                >
                  Message
                </Link>
                <button
                  onClick={handleConnect}
                  disabled={connecting || connectionStatus !== "none"}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                    connectionStatus === "pending"
                      ? "border-cyber-green/50 text-cyber-green bg-dark-green-900/30 cursor-not-allowed"
                      : connectionStatus === "accepted"
                      ? "border-cyber-green text-cyber-green bg-dark-green-900/30 cursor-not-allowed"
                      : "border-cyber-green/30 text-custom-text hover:bg-dark-green-800/50 hover:border-cyber-green"
                  }`}
                >
                  {connecting
                    ? "Connecting..."
                    : connectionStatus === "pending"
                    ? "Pending"
                    : connectionStatus === "accepted"
                    ? "Connected"
                    : "Connect"}
                </button>
              </div>
            )}
            <div className="flex items-center gap-4 text-custom-text/70 text-sm">
              <time dateTime={blogPost.published_at}>
                {new Date(blogPost.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {blogPost.reading_time_minutes && (
                <>
                  <span>•</span>
                  <span>{blogPost.reading_time_minutes} min read</span>
                </>
              )}
            </div>
          </div>

          {blogPost.featured_image_url && (
            <img
              src={blogPost.featured_image_url}
              alt={blogPost.title}
              className="w-full rounded-lg mb-8"
            />
          )}
        </header>

        {/* Content */}
        <div
          className="prose prose-invert prose-lg max-w-none blog-content"
          dangerouslySetInnerHTML={{ __html: blogPost.content }}
        />
      </article>
    </div>
  );
}

