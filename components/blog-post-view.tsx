"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

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
  }, [blogPost, user, supabase]);

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
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-custom-text mb-4">
          {blogPost.title}
        </h1>
        
        {blogPost.description && (
          <p className="text-xl text-custom-text/80 mb-6">{blogPost.description}</p>
        )}

        <div className="flex items-center gap-4 text-custom-text/70 mb-6">
          {blogPost.profiles && (
            <Link
              href={`/expert/${blogPost.profiles?.id || blogPost.expert_id}`}
              className="flex items-center gap-2 hover:text-cyber-green transition-colors"
            >
              {blogPost.profiles.avatar_url ? (
                <img
                  src={blogPost.profiles.avatar_url}
                  alt={blogPost.profiles.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-dark-green-800 flex items-center justify-center">
                  {blogPost.profiles.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold">{blogPost.profiles.name}</div>
                {blogPost.profiles.title && (
                  <div className="text-sm">{blogPost.profiles.title}</div>
                )}
              </div>
            </Link>
          )}
          <span>•</span>
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
  );
}

