import {
  FREE_MONTHLY_EMAIL_LIMIT,
  PRO_MONTHLY_EMAIL_LIMIT,
} from "@/lib/email-broadcast";

export type PlanTier = "free" | "pro";

export const PRO_MONTHLY_PRICE_USD = 9;
export const PRO_YEARLY_PRICE_USD = 84;

/** Free plan: max active lead magnets. Pro: unlimited (null). */
export const FREE_LEAD_MAGNET_LIMIT = 2;

export function resolvePlanTier(opts: {
  plan_tier?: string | null;
  is_pro_store?: boolean | null;
}): PlanTier {
  if (opts.plan_tier === "pro" || opts.is_pro_store) return "pro";
  return "free";
}

export function emailLimitForPlan(tier: PlanTier): number {
  return tier === "pro" ? PRO_MONTHLY_EMAIL_LIMIT : FREE_MONTHLY_EMAIL_LIMIT;
}

export function leadMagnetLimitForPlan(tier: PlanTier): number | null {
  return tier === "pro" ? null : FREE_LEAD_MAGNET_LIMIT;
}

/** Canonical feature matrix — keep billing UI + upgrade modals in sync */
export const PLAN_COMPARISON_ROWS: Array<[string, string, string]> = [
  ["Storefront", "1", "1"],
  ["Email broadcasts / mo", String(FREE_MONTHLY_EMAIL_LIMIT), "2,500"],
  ["Lead magnets", String(FREE_LEAD_MAGNET_LIMIT), "Unlimited"],
  ["Hide Powered by Sito", "—", "Yes"],
  ["Priority support", "—", "Yes"],
];

export const PLAN_FEATURES = {
  free: [
    "1 storefront",
    `${FREE_LEAD_MAGNET_LIMIT} lead magnets`,
    `${FREE_MONTHLY_EMAIL_LIMIT} email broadcast credits / mo`,
    '"Powered by Sito" badge on storefront',
  ],
  pro: [
    "Unlimited lead magnets",
    `${PRO_MONTHLY_EMAIL_LIMIT.toLocaleString()} email broadcast credits / mo`,
    "Hide “Powered by Sito” badge",
    "Priority support",
    "Premium storefront themes",
  ],
} as const;
