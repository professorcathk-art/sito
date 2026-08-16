"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { ConversionFooter } from "@/components/posts/conversion-footer";
import { truncateHtml } from "@/lib/utils/truncate-html";

export interface ArticlePost {
  id: string;
  expert_id: string;
  title: string;
  description: string | null;
  content: string;
  featured_image_url: string | null;
  access_level: "public" | "subscriber" | "paid";
  reading_time_minutes: number | null;
  published_at: string | null;
  profiles?: {
    id: string;
    name: string;
    title: string | null;
    avatar_url: string | null;
    custom_slug?: string | null;
  };
}

interface ArticleReaderProps {
  blogPost: ArticlePost;
}

export function ArticleReader({ blogPost }: ArticleReaderProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [busy, setBusy] = useState<"like" | "save" | null>(null);

  const author = blogPost.profiles || {
    id: blogPost.expert_id,
    name: "Expert",
    title: null,
    avatar_url: null,
    custom_slug: null,
  };

  useEffect(() => {
    async function init() {
      // Public posts are readable without login
      if (blogPost.access_level === "public") {
        setHasAccess(true);
      } else if (!user) {
        setHasAccess(false);
      } else if (user.id === blogPost.expert_id) {
        setHasAccess(true);
      } else if (blogPost.access_level === "subscriber") {
        const { data } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("expert_id", blogPost.expert_id)
          .maybeSingle();
        setHasAccess(!!data);
      } else {
        setHasAccess(false);
      }
      setCheckingAccess(false);

      if (user) {
        const [likeRes, saveRes, countRes] = await Promise.all([
          supabase
            .from("blog_likes")
            .select("id")
            .eq("blog_post_id", blogPost.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("blog_watchlist")
            .select("id")
            .eq("blog_post_id", blogPost.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("blog_posts").select("like_count").eq("id", blogPost.id).maybeSingle(),
        ]);
        setLiked(!!likeRes.data);
        setSaved(!!saveRes.data);
        setLikeCount(countRes.data?.like_count || 0);

        try {
          await supabase.from("blog_views").insert({
            blog_post_id: blogPost.id,
            user_id: user.id,
          });
        } catch {
          /* ignore */
        }
      } else {
        const { data } = await supabase
          .from("blog_posts")
          .select("like_count")
          .eq("id", blogPost.id)
          .maybeSingle();
        setLikeCount(data?.like_count || 0);
      }
    }
    init();
  }, [blogPost, user, supabase]);

  const requireAuth = () => {
    window.location.href = `/login?redirect=/blog/${blogPost.id}`;
  };

  const toggleLike = async () => {
    if (!user) return requireAuth();
    setBusy("like");
    try {
      if (liked) {
        await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_post_id", blogPost.id)
          .eq("user_id", user.id);
        setLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
      } else {
        await supabase.from("blog_likes").insert({
          blog_post_id: blogPost.id,
          user_id: user.id,
        });
        setLiked(true);
        setLikeCount((n) => n + 1);
      }
    } finally {
      setBusy(null);
    }
  };

  const toggleSave = async () => {
    if (!user) return requireAuth();
    setBusy("save");
    try {
      if (saved) {
        await supabase
          .from("blog_watchlist")
          .delete()
          .eq("blog_post_id", blogPost.id)
          .eq("user_id", user.id);
        setSaved(false);
      } else {
        await supabase.from("blog_watchlist").insert({
          blog_post_id: blogPost.id,
          user_id: user.id,
        });
        setSaved(true);
      }
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: blogPost.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  if (checkingAccess) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-4 py-8">
        <div className="h-10 rounded-lg bg-slate-800" />
        <div className="h-4 w-2/3 rounded bg-slate-800" />
        <div className="h-64 rounded-xl bg-slate-900" />
      </div>
    );
  }

  const gated = !!user && !hasAccess && blogPost.access_level !== "public";
  const previewHtml = truncateHtml(blogPost.content, 400);
  const showFull = hasAccess;
  const contentHtml = showFull ? blogPost.content : previewHtml;
  const needsSignInWall = !user && blogPost.access_level !== "public";
  const needsSubscribeWall = gated;

  return (
    <article className="relative">
      {/* Floating engagement */}
      <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-700 bg-slate-950/95 px-2 py-1.5 shadow-2xl backdrop-blur lg:bottom-auto lg:left-auto lg:right-[max(1rem,calc((100vw-80rem)/2+1rem))] lg:top-1/3 lg:translate-x-0 lg:flex-col lg:rounded-2xl lg:px-1.5 lg:py-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy === "like"}
          className={`rounded-full px-3 py-2 text-sm ${liked ? "text-red-300" : "text-slate-300 hover:bg-slate-800"}`}
          title="Like"
        >
          {liked ? "❤️" : "🤍"} {likeCount}
        </button>
        <button
          type="button"
          onClick={toggleSave}
          disabled={busy === "save"}
          className={`rounded-full px-3 py-2 text-sm ${saved ? "text-sky-300" : "text-slate-300 hover:bg-slate-800"}`}
          title="Save"
        >
          {saved ? "★ Saved" : "☆ Save"}
        </button>
        <button
          type="button"
          onClick={share}
          className="rounded-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          title="Share"
        >
          {shareCopied ? "Copied" : "↗ Share"}
        </button>
      </div>

      <div className="mx-auto max-w-2xl">
        {blogPost.featured_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blogPost.featured_image_url}
            alt=""
            className="mb-8 aspect-[21/9] w-full rounded-2xl object-cover"
          />
        )}

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {blogPost.title}
          </h1>
          {blogPost.description && (
            <p className="mt-4 text-lg leading-relaxed text-slate-400">{blogPost.description}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link
              href={author.custom_slug ? `/s/${author.custom_slug}` : `/expert/${author.id}`}
              className="inline-flex items-center gap-2 text-slate-300 hover:text-sky-300"
            >
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sky-300">
                  {author.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="font-medium">{author.name}</span>
            </Link>
            <span>·</span>
            {blogPost.published_at && (
              <time dateTime={blogPost.published_at}>
                {new Date(blogPost.published_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            )}
            <span>·</span>
            <span>{blogPost.reading_time_minutes || 1} min read</span>
          </div>
        </header>

        <div
          className={`article-prose relative ${needsSignInWall || needsSubscribeWall ? "max-h-[28rem] overflow-hidden" : ""}`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {(needsSignInWall || needsSubscribeWall) && (
          <div className="relative -mt-24 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-24">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6 text-center">
              <p className="text-lg font-semibold text-slate-50">
                {needsSubscribeWall ? "Subscribers only" : "Continue reading"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {needsSubscribeWall
                  ? `Follow ${author.name} to unlock this article.`
                  : "Sign in free to read the full article."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                {needsSubscribeWall ? (
                  <Link
                    href={`/expert/${author.id}`}
                    className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
                  >
                    View expert
                  </Link>
                ) : (
                  <Link
                    href={`/login?redirect=/blog/${blogPost.id}`}
                    className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
                  >
                    Sign in to continue
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {showFull && !needsSignInWall && !needsSubscribeWall && (
            <ConversionFooter
              expertId={blogPost.expert_id}
              expertName={author.name}
              expertTitle={author.title}
              expertAvatar={author.avatar_url}
              customSlug={author.custom_slug}
            />
          )}
      </div>
    </article>
  );
}
