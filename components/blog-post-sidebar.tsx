"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface RelatedPost {
  id: string;
  title: string;
  description: string | null;
  published_at: string;
  expert_id: string;
  expert_name: string;
  view_count: number;
  like_count: number;
}

interface BlogPostSidebarProps {
  currentPostId: string;
  expertId: string;
}

export function BlogPostSidebar({ currentPostId, expertId }: BlogPostSidebarProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRelatedPosts();
    if (user) {
      checkLikeAndSave();
      fetchLikeCount();
    }
  }, [currentPostId, expertId, user]);

  const fetchRelatedPosts = async () => {
    try {
      // Fetch other posts from the same expert
      const { data: posts, error } = await supabase
        .from("blog_posts")
        .select(`
          id,
          title,
          description,
          published_at,
          expert_id,
          view_count,
          like_count,
          profiles!inner(id, name)
        `)
        .eq("expert_id", expertId)
        .neq("id", currentPostId)
        .eq("access_level", "public")
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedPosts = (posts || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        published_at: post.published_at,
        expert_id: post.expert_id,
        expert_name: post.profiles?.name || "Expert",
        view_count: post.view_count || 0,
        like_count: post.like_count || 0,
      }));

      setRelatedPosts(formattedPosts);
    } catch (err) {
      console.error("Error fetching related posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkLikeAndSave = async () => {
    if (!user) return;

    try {
      const [likeRes, saveRes] = await Promise.all([
        supabase
          .from("blog_likes")
          .select("id")
          .eq("blog_post_id", currentPostId)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("blog_watchlist")
          .select("id")
          .eq("blog_post_id", currentPostId)
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
        .eq("id", currentPostId)
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
      window.location.href = `/login?redirect=/blog/${currentPostId}`;
      return;
    }

    setLiking(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_post_id", currentPostId)
          .eq("user_id", user.id);
        if (error) throw error;
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("blog_likes")
          .insert({
            blog_post_id: currentPostId,
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
      window.location.href = `/login?redirect=/blog/${currentPostId}`;
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        const { error } = await supabase
          .from("blog_watchlist")
          .delete()
          .eq("blog_post_id", currentPostId)
          .eq("user_id", user.id);
        if (error) throw error;
        setSaved(false);
      } else {
        const { error } = await supabase
          .from("blog_watchlist")
          .insert({
            blog_post_id: currentPostId,
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

  return (
    <aside className="w-80 flex-shrink-0 ml-8">
      {/* Like and Save Buttons */}
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-4 mb-6">
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
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
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              saved
                ? "bg-cyber-green/20 text-cyber-green border border-cyber-green/50"
                : "bg-dark-green-900/50 text-custom-text border border-cyber-green/30 hover:bg-dark-green-800/50"
            }`}
          >
            <span>{saved ? "✓" : "○"}</span>
            <span>{saved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-custom-text mb-4">Related Posts</h3>
          <div className="space-y-3">
            {relatedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="block p-3 bg-dark-green-900/50 border border-cyber-green/20 rounded-lg hover:border-cyber-green/50 transition-colors"
              >
                <h4 className="text-sm font-semibold text-custom-text mb-1 line-clamp-2">
                  {post.title}
                </h4>
                {post.description && (
                  <p className="text-xs text-custom-text/70 line-clamp-2 mb-2">
                    {post.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-custom-text/60">
                  <span>{post.view_count} views</span>
                  <span>•</span>
                  <span>❤️ {post.like_count}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

