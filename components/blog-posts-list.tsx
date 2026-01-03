"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface BlogPost {
  id: string;
  title: string;
  description: string | null;
  featured_image_url: string | null;
  reading_time_minutes: number | null;
  published_at: string;
  expert_id: string;
  profiles?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface BlogPostsListProps {
  expertId?: string;
  limit?: number;
}

export function BlogPostsList({ expertId, limit = 10 }: BlogPostsListProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPosts() {
      try {
        let query = supabase
          .from("blog_posts")
          .select(`
            id,
            title,
            description,
            featured_image_url,
            reading_time_minutes,
            published_at,
            expert_id
          `)
          .eq("access_level", "public")
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(limit);

        if (expertId) {
          query = query.eq("expert_id", expertId);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch expert profiles separately
        const expertIds = Array.from(new Set((data || []).map((post: any) => post.expert_id)));
        let profileMap: { [key: string]: { id: string; name: string; avatar_url: string | null } } = {};
        
        if (expertIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", expertIds);
          
          if (profilesData) {
            profilesData.forEach((profile: any) => {
              profileMap[profile.id] = {
                id: profile.id,
                name: profile.name || "Expert",
                avatar_url: profile.avatar_url,
              };
            });
          }
        }

        setPosts(
          (data || []).map((post: any) => ({
            ...post,
            profiles: profileMap[post.expert_id] || {
              id: post.expert_id,
              name: "Expert",
              avatar_url: null,
            },
          }))
        );
      } catch (err) {
        console.error("Error fetching blog posts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [expertId, limit, supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-dark-green-800/50 rounded-lg mb-4"></div>
            <div className="h-6 bg-dark-green-800/50 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-dark-green-800/50 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-custom-text/70">No blog posts found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/blog/${post.id}`}
          className="group bg-dark-green-800/30 border border-cyber-green/30 rounded-lg overflow-hidden hover:border-cyber-green transition-colors"
        >
          {post.featured_image_url && (
            <div className="relative w-full h-48 overflow-hidden">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="p-6">
            <h3 className="text-xl font-bold text-custom-text mb-2 group-hover:text-cyber-green transition-colors line-clamp-2">
              {post.title}
            </h3>
            {post.description && (
              <p className="text-custom-text/70 mb-4 line-clamp-3">{post.description}</p>
            )}
            <div className="flex items-center justify-between text-sm text-custom-text/60">
              <div className="flex items-center gap-2">
                {post.profiles?.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt={post.profiles.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-dark-green-800 flex items-center justify-center text-xs">
                    {post.profiles?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <span>{post.profiles?.name || "Expert"}</span>
              </div>
              <div className="flex items-center gap-3">
                {post.reading_time_minutes && (
                  <span>{post.reading_time_minutes} min</span>
                )}
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

