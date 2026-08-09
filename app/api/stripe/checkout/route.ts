/**
 * Create Stripe Checkout for Sito Pro Creator ($9/mo or $84/yr).
 * POST body: { interval?: "month" | "year" }
 *
 * Prices: STRIPE_PRO_PRICE_ID (monthly), STRIPE_PRO_YEARLY_PRICE_ID (yearly)
 * Product: prod_U95dFl9KKLtEZK (Sito Pro)
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

    const body = await request.json().catch(() => ({}));
    const interval = body.interval === "year" ? "year" : "month";

    const monthlyPrice = process.env.STRIPE_PRO_PRICE_ID;
    const yearlyPrice = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
    const priceId = interval === "year" ? yearlyPrice || monthlyPrice : monthlyPrice;

    if (!priceId) {
      return NextResponse.json(
        { error: "STRIPE_PRO_PRICE_ID is not configured." },
        { status: 503 }
      );
    }

    const stripe = getStripeClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id, name")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;

    if (!customerId) {
      const customers = await stripe.customers.list({
        email: profile?.email || user.email || undefined,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email || profile?.email || undefined,
          name: profile?.name || undefined,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = request.headers.get("origin") || getSiteUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        subscription_type: "pro",
        plan_type: "pro",
        billing_interval: interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: "pro",
          billing_interval: interval,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("stripe/checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout" },
      { status: 500 }
    );
  }
}
