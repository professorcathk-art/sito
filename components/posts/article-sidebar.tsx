"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ArticleSidebarProps {
  expertId: string;
  currentPostId: string;
  expertName: string;
  customSlug?: string | null;
}

export function ArticleSidebar({
  expertId,
  currentPostId,
  expertName,
  customSlug,
}: ArticleSidebarProps) {
  const supabase = createClient();
  const [posts, setPosts] = useState<
    Array<{ id: string; title: string; reading_time_minutes: number | null }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, reading_time_minutes, published_at")
        .eq("expert_id", expertId)
        .neq("id", currentPostId)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(5);
      setPosts(data || []);
      setLoading(false);
    }
    load();
  }, [expertId, currentPostId, supabase]);

  const storeHref = customSlug ? `/s/${customSlug}` : `/expert/${expertId}`;

  return (
    <aside className="space-y-5 lg:sticky lg:top-24">
      <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/50 to-slate-950 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-400">
          Ready to go deeper?
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-50">
          Book a 1-on-1 with {expertName.split(" ")[0]}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Get personalized advice in a live consultation.
        </p>
        <Link
          href={`/appointments/book/${expertId}`}
          className="mt-4 inline-flex w-full justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Book consultation
        </Link>
        <Link
          href={storeHref}
          className="mt-2 inline-flex w-full justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-900"
        >
          View storefront
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">More from this expert</h3>
        {loading ? (
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">More articles coming soon.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/blog/${p.id}`}
                  className="block rounded-xl border border-transparent px-2 py-2 hover:border-slate-700 hover:bg-slate-900/60"
                >
                  <p className="text-sm font-medium text-slate-100 line-clamp-2">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.reading_time_minutes || 1} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
