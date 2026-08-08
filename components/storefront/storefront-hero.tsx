"use client";

import Image from "next/image";
import { VerifiedBadge } from "@/components/storefront/storefront-social-bar";
import type { StorefrontHeroData } from "@/types/storefront";

interface StorefrontHeroProps {
  hero: StorefrontHeroData;
  fallbackImageUrl?: string;
  avatarUrl?: string;
  expertName: string;
  verified?: boolean;
  compact?: boolean;
}

export function StorefrontHero({
  hero,
  fallbackImageUrl,
  avatarUrl,
  expertName,
  verified = false,
  compact = false,
}: StorefrontHeroProps) {
  const imageUrl = hero.imageUrl || fallbackImageUrl;
  const overlayOpacity = Math.min(100, Math.max(0, hero.overlayOpacity ?? 45)) / 100;
  const overlayColor = hero.overlayColor || "#0f172a";
  const avatarPosition = hero.avatarPosition || "left";
  const avatarAlign =
    avatarPosition === "center" ? "justify-center" : "justify-start pl-4 sm:pl-6";

  return (
    <div className={`relative w-full ${compact ? "rounded-t-2xl overflow-hidden" : ""}`}>
      <div className="relative w-full aspect-video bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${overlayColor} 0%, var(--store-btn-bg, #334155) 55%, ${overlayColor} 100%)`,
            }}
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent"
          aria-hidden
        />
      </div>

      <div className={`relative z-10 -mt-10 sm:-mt-14 flex ${avatarAlign}`}>
        <div className="relative">
          {avatarUrl ? (
            <div className="relative h-20 w-20 sm:h-28 sm:w-28 rounded-full overflow-hidden ring-4 ring-[var(--store-bg-ring,#fff)] shadow-xl bg-[var(--store-card-bg)]">
              <Image src={avatarUrl} alt={expertName} fill className="object-cover" sizes="112px" />
            </div>
          ) : (
            <div className="flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-full ring-4 ring-[var(--store-bg-ring,#fff)] shadow-xl bg-[var(--store-card-bg)] border border-[var(--store-card-border)]">
              <svg className="h-10 w-10 sm:h-14 sm:w-14 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {verified && <VerifiedBadge className="absolute -bottom-0.5 -right-0.5 sm:bottom-1 sm:right-1" />}
        </div>
      </div>
    </div>
  );
}
