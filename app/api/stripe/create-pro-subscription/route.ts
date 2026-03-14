import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripeClient();

    // Create or retrieve Stripe customer
    let customerId: string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const customers = await stripe.customers.list({
      email: profile?.email || user.email || undefined,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session for Pro subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get("origin")}/dashboard/storefront?success=true`,
      cancel_url: `${request.headers.get("origin")}/dashboard/storefront?canceled=true`,
      metadata: {
        user_id: user.id,
        subscription_type: "pro",
        plan_type: "pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: "pro",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
