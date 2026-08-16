"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { StorefrontLeadMagnet } from "@/components/storefront/storefront-lead-magnet";
import { SubscribeButton } from "@/components/subscribe-button";

interface ConversionFooterProps {
  expertId: string;
  expertName: string;
  expertTitle?: string | null;
  expertAvatar?: string | null;
  customSlug?: string | null;
}

export function ConversionFooter({
  expertId,
  expertName,
  expertTitle,
  expertAvatar,
  customSlug,
}: ConversionFooterProps) {
  const supabase = createClient();
  const [leadMagnetId, setLeadMagnetId] = useState<string | null>(null);
  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      product_type: string;
      course_id?: string | null;
      cover?: string | null;
    }>
  >([]);

  useEffect(() => {
    async function load() {
      const [{ data: magnets }, { data: prods }] = await Promise.all([
        supabase
          .from("lead_magnets")
          .select("id")
          .eq("expert_id", expertId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("products")
          .select("id, name, price, product_type, course_id, courses(cover_image_url)")
          .eq("expert_id", expertId)
          .in("product_type", ["e-learning", "appointment"])
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      setLeadMagnetId(magnets?.[0]?.id || null);

      const featured = (prods || []).slice(0, 2).map((p: any) => {
        const course = Array.isArray(p.courses) ? p.courses[0] : p.courses;
        return {
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          product_type: p.product_type,
          course_id: p.course_id,
          cover: course?.cover_image_url || null,
        };
      });
      setProducts(featured);
    }
    load();
  }, [expertId, supabase]);

  const storeHref = customSlug ? `/s/${customSlug}` : `/expert/${expertId}`;

  return (
    <section className="mt-14 space-y-8 border-t border-slate-800 pt-10">
      {/* Author bio */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {expertAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={expertAvatar} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-xl font-semibold text-sky-300">
              {expertName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-50">{expertName}</p>
            {expertTitle && <p className="text-sm text-slate-400">{expertTitle}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SubscribeButton expertId={expertId} expertName={expertName} />
          <Link
            href={storeHref}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Visit store
          </Link>
        </div>
      </div>

      {/* Lead magnet */}
      {leadMagnetId && (
        <div className="overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-slate-950 p-1">
          <div className="rounded-[0.9rem] bg-slate-950/80 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-400">
              Free for readers
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-50">
              Enjoyed this article? Get my free guide
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Join the list for practical tips — no spam, unsubscribe anytime.
            </p>
            <div className="mt-4">
              <StorefrontLeadMagnet
                expertId={expertId}
                expertName={expertName}
                data={{
                  leadMagnetId,
                  title: "Get the free guide",
                  subtitle: "Delivered to your inbox",
                  ctaText: "Send it to me",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Featured products */}
      {products.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-50">Work with {expertName.split(" ")[0]}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {products.map((p) => {
              const href =
                p.product_type === "appointment"
                  ? `/appointments/book/${expertId}`
                  : p.course_id
                    ? `/courses/${p.course_id}`
                    : storeHref;
              return (
                <Link
                  key={p.id}
                  href={href}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 transition hover:border-slate-600"
                >
                  <div className="relative aspect-video bg-slate-900">
                    {p.cover ? (
                      <Image src={p.cover} alt="" fill className="object-cover" sizes="360px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl text-slate-600">
                        {p.product_type === "appointment" ? "📅" : "📚"}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {p.product_type === "appointment" ? "1-on-1 session" : "e-Learning"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-100 line-clamp-2">{p.name}</p>
                    <p className="mt-2 text-sm text-sky-400">
                      {p.price <= 0 ? "Free" : `$${p.price.toFixed(0)}`} · Learn more →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
