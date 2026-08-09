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

/**
 * LinkedIn / Instagram-style cover: wide banner (≈16:9 asset, capped display height)
 * with a centered overlapping avatar.
 */
export function StorefrontHero({
  hero,
  fallbackImageUrl,
  avatarUrl,
  expertName,
  verified = false,
  compact = false,
}: StorefrontHeroProps) {
  const imageUrl = hero.imageUrl || fallbackImageUrl;
  const overlayOpacity = Math.min(100, Math.max(0, hero.overlayOpacity ?? 40)) / 100;
  const overlayColor = hero.overlayColor || "#0f172a";

  return (
    <div className={`relative w-full ${compact ? "rounded-t-2xl overflow-hidden" : ""}`}>
      {/* Cover: recommend 1920×1080 upload; display as a short wide banner */}
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 ${
          compact ? "h-28 sm:h-32" : "h-40 sm:h-48 md:h-56 lg:h-64"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
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
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent"
          aria-hidden
        />
      </div>

      {/* Centered avatar overlapping cover (Instagram / LinkedIn profile pattern) */}
      <div className="relative z-10 -mt-12 sm:-mt-16 flex justify-center px-4">
        <div className="relative">
          {avatarUrl ? (
            <div
              className={`relative overflow-hidden rounded-full ring-4 ring-[var(--store-bg-ring,#fff)] shadow-xl bg-[var(--store-card-bg)] ${
                compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28"
              }`}
            >
              <Image src={avatarUrl} alt={expertName} fill className="object-cover" sizes="112px" />
            </div>
          ) : (
            <div
              className={`flex items-center justify-center rounded-full ring-4 ring-[var(--store-bg-ring,#fff)] shadow-xl bg-[var(--store-card-bg)] border border-[var(--store-card-border)] ${
                compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28"
              }`}
            >
              <svg
                className="h-10 w-10 sm:h-12 sm:w-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: "var(--store-text)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
          {verified && (
            <VerifiedBadge className="absolute -bottom-0.5 -right-0.5 sm:bottom-1 sm:right-1" />
          )}
        </div>
      </div>
    </div>
  );
}
