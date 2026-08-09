import {
  FREE_MONTHLY_EMAIL_LIMIT,
  PRO_MONTHLY_EMAIL_LIMIT,
} from "@/lib/email-broadcast";

export type PlanTier = "free" | "pro";

export const PRO_MONTHLY_PRICE_USD = 9;
export const PRO_YEARLY_PRICE_USD = 84;

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

export const PLAN_FEATURES = {
  free: [
    "1 storefront",
    `${FREE_MONTHLY_EMAIL_LIMIT} email broadcast credits / mo`,
    "Lead magnets & CRM",
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
