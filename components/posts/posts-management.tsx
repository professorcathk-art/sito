"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface BlogPost {
  id: string;
  title: string;
  description: string | null;
  featured_image_url: string | null;
  access_level: string;
  published_at: string | null;
  reading_time_minutes: number | null;
  view_count: number | null;
  like_count: number | null;
  updated_at?: string;
}

type FilterTab = "all" | "published" | "drafts";

function plainExcerpt(htmlOrText: string | null, max = 140) {
  if (!htmlOrText) return "";
  const text = htmlOrText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function PostsManagement() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, title, description, featured_image_url, access_level, published_at, reading_time_minutes, view_count, like_count, updated_at"
        )
        .eq("expert_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = posts.filter((p) => {
    if (tab === "published") return !!p.published_at;
    if (tab === "drafts") return !p.published_at;
    return true;
  });

  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.published_at).length,
    drafts: posts.filter((p) => !p.published_at).length,
  };

  const unpublish = async (id: string) => {
    if (!user) return;
    setActingId(id);
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({ published_at: null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("expert_id", user.id);
      if (error) throw error;
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unpublish");
    } finally {
      setActingId(null);
      setMenuOpenId(null);
    }
  };

  const remove = async (id: string) => {
    if (!user || !confirm("Delete this post permanently?")) return;
    setActingId(id);
    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", id)
        .eq("expert_id", user.id);
      if (error) throw error;
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActingId(null);
      setMenuOpenId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Content
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-50">Sharing Posts</h1>
          <p className="mt-2 text-sm text-slate-400">
            Publish articles that grow your audience and convert readers into clients.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/posts/new")}
          className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          + New post
        </button>
      </header>

      <div className="flex gap-1 border-b border-slate-800">
        {(
          [
            { id: "all" as const, label: "All Posts" },
            { id: "published" as const, label: "Published" },
            { id: "drafts" as const, label: "Drafts" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? "text-slate-50" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-slate-500">{counts[t.id]}</span>
            {tab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-sky-400" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-900/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-14 text-center">
          <p className="text-lg font-medium text-slate-200">
            {tab === "drafts" ? "No drafts yet" : tab === "published" ? "No published posts" : "No posts yet"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Write something useful — then turn readers into leads and bookings.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/posts/new")}
            className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Write your first post
          </button>
        </div>
      ) : (
        <div className="space-y-3" ref={menuRef}>
          {filtered.map((post) => {
            const published = !!post.published_at;
            return (
              <article
                key={post.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 transition hover:border-slate-600 sm:flex-row"
              >
                <div className="relative aspect-video w-full shrink-0 bg-slate-950 sm:aspect-auto sm:h-auto sm:w-52">
                  {post.featured_image_url ? (
                    <Image
                      src={post.featured_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="208px"
                    />
                  ) : (
                    <div className="flex h-full min-h-[7.5rem] items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-3xl font-bold text-slate-600">
                      {post.title?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-50 line-clamp-1">
                        {post.title || "Untitled"}
                      </h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          published
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                      {plainExcerpt(post.description) || "No excerpt yet"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        {published
                          ? new Date(post.published_at!).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Not published"}
                      </span>
                      <span>·</span>
                      <span>{post.reading_time_minutes || 1} min read</span>
                      <span>·</span>
                      <span>{post.view_count || 0} views</span>
                      <span>·</span>
                      <span>{post.like_count || 0} likes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/posts/edit/${post.id}`}
                      className="rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Edit
                    </Link>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                        aria-label="More actions"
                      >
                        ···
                      </button>
                      {menuOpenId === post.id && (
                        <div className="absolute left-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl sm:left-auto sm:right-0">
                          <Link
                            href={`/blog/${post.id}`}
                            target="_blank"
                            className="block px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
                            onClick={() => setMenuOpenId(null)}
                          >
                            Preview public page
                          </Link>
                          {published ? (
                            <button
                              type="button"
                              disabled={actingId === post.id}
                              onClick={() => unpublish(post.id)}
                              className="block w-full px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                            >
                              Unpublish / move to draft
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={actingId === post.id}
                            onClick={() => remove(post.id)}
                            className="block w-full px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
