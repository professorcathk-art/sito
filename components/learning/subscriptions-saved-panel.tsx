"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

type SubTab = "creators" | "saved";

interface Subscription {
  id: string;
  created_at: string;
  expert: {
    id: string;
    name: string;
    title: string | null;
    avatar_url: string | null;
    verified: boolean;
    custom_slug?: string | null;
  };
}

interface SavedPost {
  id: string;
  title: string;
  description: string;
  featured_image_url: string | null;
  reading_time_minutes: number;
  published_at: string;
  expert_name: string;
  expert_avatar_url: string | null;
  view_count: number;
  like_count: number;
}

export function SubscriptionsSavedPanel() {
  const { user } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab: SubTab = tabParam === "saved" ? "saved" : "creators";

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [removingPost, setRemovingPost] = useState<string | null>(null);

  const setTab = (tab: SubTab) => {
    const q = tab === "saved" ? "?tab=saved" : "";
    router.replace(`/dashboard/learning/subscriptions${q}`, { scroll: false });
  };

  useEffect(() => {
    if (!user) return;
    fetchSubscriptions();
    fetchWatchLater();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSubscriptions = async () => {
    if (!user) return;
    setLoadingCreators(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, created_at, expert_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const expertIds = Array.from(new Set((data || []).map((sub) => sub.expert_id)));
      const expertMap: Record<string, Subscription["expert"]> = {};
      if (expertIds.length) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, title, avatar_url, verified, custom_slug")
          .in("id", expertIds);
        profilesData?.forEach((profile) => {
          expertMap[profile.id] = {
            id: profile.id,
            name: profile.name || "Expert",
            title: profile.title,
            avatar_url: profile.avatar_url,
            verified: profile.verified || false,
            custom_slug: profile.custom_slug,
          };
        });
      }

      setSubscriptions(
        (data || []).map((sub) => ({
          id: sub.id,
          created_at: sub.created_at,
          expert: expertMap[sub.expert_id] || {
            id: sub.expert_id,
            name: "Expert",
            title: null,
            avatar_url: null,
            verified: false,
          },
        }))
      );
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setLoadingCreators(false);
    }
  };

  const fetchWatchLater = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const { data: watchlist, error: watchlistError } = await supabase
        .from("blog_watchlist")
        .select("blog_post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (watchlistError) throw watchlistError;

      if (!watchlist?.length) {
        setPosts([]);
        return;
      }

      const postIds = watchlist.map((w) => w.blog_post_id);
      const { data: blogPosts, error: blogError } = await supabase
        .from("blog_posts")
        .select(
          "id, title, description, featured_image_url, reading_time_minutes, published_at, expert_id, view_count, like_count, access_level"
        )
        .in("id", postIds)
        .in("access_level", ["public", "subscriber"]);
      if (blogError) throw blogError;

      const expertIds = Array.from(new Set((blogPosts || []).map((p) => p.expert_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", expertIds);

      setPosts(
        (blogPosts || []).map((post) => {
          const profile = profiles?.find((p) => p.id === post.expert_id);
          return {
            ...post,
            expert_name: profile?.name || "Expert",
            expert_avatar_url: profile?.avatar_url || null,
          };
        })
      );
    } catch (err) {
      console.error("Error fetching watch later:", err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleUnsubscribe = async (expertId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("expert_id", expertId);
      if (error) throw error;
      fetchSubscriptions();
    } catch (err) {
      console.error("Error unsubscribing:", err);
      alert("Failed to unsubscribe. Please try again.");
    }
  };

  const handleRemoveSaved = async (postId: string) => {
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
    } catch (err) {
      console.error("Error removing from watchlist:", err);
      alert("Failed to remove. Please try again.");
    } finally {
      setRemovingPost(null);
    }
  };

  const storefrontHref = (expert: Subscription["expert"]) =>
    expert.custom_slug ? `/s/${expert.custom_slug}` : `/expert/${expert.id}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          My Learning
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">
          Subscriptions & Saved
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Creators you follow and posts you saved for later.
        </p>
      </header>

      <div className="flex gap-2 border-b border-slate-800 pb-1">
        {(
          [
            { id: "creators" as const, label: "Subscribed Creators" },
            { id: "saved" as const, label: "Saved / Watch Later" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-slate-800 text-slate-50"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "creators" && (
        <>
          {loadingCreators ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-900/60" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center">
              <p className="text-slate-400 mb-4">You haven&apos;t subscribed to any creators yet.</p>
              <Link
                href="/directory"
                className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                Browse experts
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
                >
                  <div className="flex items-start gap-3 mb-4">
                    {subscription.expert.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={subscription.expert.avatar_url}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-lg text-sky-300">
                        {subscription.expert.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={storefrontHref(subscription.expert)}
                        className="font-semibold text-slate-50 hover:text-sky-300"
                      >
                        {subscription.expert.name}
                        {subscription.expert.verified ? " ✓" : ""}
                      </Link>
                      {subscription.expert.title && (
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {subscription.expert.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      Since {new Date(subscription.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnsubscribe(subscription.expert.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500/40 hover:text-red-200"
                    >
                      Unsubscribe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "saved" && (
        <>
          {loadingSaved ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-900/60" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center">
              <p className="text-slate-400 mb-4">Nothing saved yet.</p>
              <Link
                href="/blog"
                className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                Browse posts
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50"
                >
                  <div className="flex flex-col sm:flex-row">
                    <Link href={`/blog/${post.id}`} className="relative h-36 w-full sm:h-auto sm:w-48 shrink-0 bg-slate-800">
                      {post.featured_image_url ? (
                        <Image
                          src={post.featured_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="192px"
                        />
                      ) : (
                        <div className="flex h-full min-h-[9rem] items-center justify-center text-3xl text-slate-600">
                          📄
                        </div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <p className="text-xs text-slate-500">{post.expert_name}</p>
                        <Link
                          href={`/blog/${post.id}`}
                          className="mt-1 block text-lg font-semibold text-slate-50 hover:text-sky-300 line-clamp-2"
                        >
                          {post.title}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{post.description}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          {post.reading_time_minutes} min read
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSaved(post.id)}
                          disabled={removingPost === post.id}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500/40 hover:text-red-200 disabled:opacity-50"
                        >
                          {removingPost === post.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
