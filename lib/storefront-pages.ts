import type { PlanTier } from "@/lib/billing";

export type StorefrontNavId = "home" | "shop" | "posts" | "guides";

export interface StorefrontNavItem {
  id: StorefrontNavId;
  label: string;
  enabled: boolean;
}

export interface StorefrontNavConfig {
  version: 1;
  items: StorefrontNavItem[];
}

export const DEFAULT_NAV_ITEMS: StorefrontNavItem[] = [
  { id: "home", label: "Home", enabled: true },
  { id: "shop", label: "Shop", enabled: true },
  { id: "guides", label: "Free Guides", enabled: false },
  { id: "posts", label: "Blog", enabled: false },
];

/** Sub-pages / landing funnels beyond the main hub */
export function canUseStorefrontFunnels(tier: PlanTier): boolean {
  return tier === "pro";
}

export function parseStorefrontNav(raw: unknown): StorefrontNavConfig {
  const defaults = DEFAULT_NAV_ITEMS.map((i) => ({ ...i }));
  if (!raw || typeof raw !== "object") {
    return { version: 1, items: defaults };
  }
  const obj = raw as { items?: unknown };
  if (!Array.isArray(obj.items)) {
    return { version: 1, items: defaults };
  }

  const byId = new Map<string, StorefrontNavItem>();
  for (const item of obj.items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id || "") as StorefrontNavId;
    if (!["home", "shop", "posts", "guides"].includes(id)) continue;
    byId.set(id, {
      id,
      label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : defaults.find((d) => d.id === id)!.label,
      enabled: row.enabled !== false,
    });
  }

  const items = defaults.map((d) => byId.get(d.id) || { ...d });
  // Home is always enabled
  const home = items.find((i) => i.id === "home");
  if (home) home.enabled = true;

  return { version: 1, items };
}

/** For free plans, only Home is publicly navigable via the bar */
export function effectiveNavItems(
  config: StorefrontNavConfig,
  tier: PlanTier
): StorefrontNavItem[] {
  const parsed = parseStorefrontNav(config);
  if (canUseStorefrontFunnels(tier)) {
    return parsed.items.filter((i) => i.enabled);
  }
  return parsed.items.filter((i) => i.id === "home");
}

export function navHref(slug: string, id: StorefrontNavId): string {
  const base = `/s/${slug}`;
  switch (id) {
    case "shop":
      return `${base}/shop`;
    case "posts":
      return `${base}/posts`;
    case "guides":
      return `${base}/guides`;
    case "home":
    default:
      return base;
  }
}

export function slugifyLeadMagnet(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "guide";
}

export function isValidLeadSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 60;
}
