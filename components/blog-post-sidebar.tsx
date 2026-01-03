"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPostId, expertId]);

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


  return (
    <aside className="w-80 flex-shrink-0 ml-8">
      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-custom-text mb-4">Other Posts</h3>
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

