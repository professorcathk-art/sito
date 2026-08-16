"use client";

import Link from "next/link";
import {
  effectiveNavItems,
  navHref,
  parseStorefrontNav,
  type StorefrontNavConfig,
  type StorefrontNavId,
} from "@/lib/storefront-pages";
import type { PlanTier } from "@/lib/billing";
import { resolvePlanTier } from "@/lib/billing";

interface StorefrontNavBarProps {
  slug: string;
  active: StorefrontNavId;
  navConfig?: unknown;
  planTier?: string | null;
  isProStore?: boolean | null;
  /** Force-hide (lead funnel mode) */
  hidden?: boolean;
  textColor?: string;
  accentColor?: string;
}

export function StorefrontNavBar({
  slug,
  active,
  navConfig,
  planTier,
  isProStore,
  hidden,
  textColor,
  accentColor,
}: StorefrontNavBarProps) {
  if (hidden) return null;

  const tier: PlanTier = resolvePlanTier({ plan_tier: planTier, is_pro_store: isProStore });
  const config: StorefrontNavConfig = parseStorefrontNav(navConfig);
  const items = effectiveNavItems(config, tier);

  // Free / single-home: no bar clutter
  if (items.length <= 1) return null;

  return (
    <nav
      className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-md"
      style={{ background: "rgba(2,6,23,0.55)" }}
      aria-label="Storefront"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-4 py-2.5 hide-scrollbar">
        {items.map((item) => {
          const href = navHref(slug, item.id);
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white/15" : "hover:bg-white/10"
              }`}
              style={{
                color: isActive ? accentColor || "#38bdf8" : textColor || "rgba(248,250,252,0.85)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
