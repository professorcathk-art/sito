/**
 * Stripe Customer Billing Portal session for Pro subscription management.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;

    // Fallback: look up from saas_subscriptions
    if (!customerId) {
      const { data: sub } = await supabase
        .from("saas_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      customerId = sub?.stripe_customer_id || null;
    }

    if (!customerId) {
      const stripe = getStripeClient();
      const customers = await stripe.customers.list({
        email: profile?.email || user.email || undefined,
        limit: 1,
      });
      customerId = customers.data[0]?.id || null;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Upgrade to Pro first." },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const origin = request.headers.get("origin") || getSiteUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("stripe/portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open billing portal" },
      { status: 500 }
    );
  }
}
