/**
 * API Route: Stripe Webhook Handler
 * 
 * This endpoint handles webhook events from Stripe, specifically:
 * - v2.core.account[requirements].updated - Account requirements changed
 * - v2.core.account[.recipient].capability_status_updated - Capability status changed
 * 
 * POST /api/stripe/webhooks
 * 
 * IMPORTANT: This endpoint uses "thin" events for V2 accounts.
 * Thin events only contain event IDs - we must fetch full event data.
 * 
 * Webhook Configuration:
 * 1. Go to Stripe Dashboard > Developers > Webhooks
 * 2. Click "+ Add destination"
 * 3. Select "Connected accounts" in "Events from"
 * 4. Select "Thin" payload style
 * 5. Add events: v2.account[requirements].updated, v2.account[configuration.configuration_type].capability_status_updated
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get webhook secret for signature verification
    const webhookSecret = getStripeWebhookSecret();

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    /**
     * Parse thin event from Stripe
     * 
     * Thin events only contain:
     * - Event ID
     * - Event type
     * - Account ID (for connected accounts)
     * 
     * For thin events, we need to:
     * 1. Parse the event to get the event ID
     * 2. Fetch the full event data using the event ID
     * 
     * Note: The Stripe SDK's webhooks.constructEvent() works for both regular and thin events.
     * For thin events, the event object will have minimal data, so we fetch the full event.
     */
    let event: Stripe.Event;
    try {
      // Parse the webhook event (works for both regular and thin events)
      event = stripeClient.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`Received webhook event: ${event.type} for account: ${event.account}`);

    /**
     * Handle different event types
     * 
     * For Express accounts, we handle:
     * 1. account.updated - Account information or status changed
     * 2. account.application.deauthorized - Account disconnected
     */
    const eventType = event.type;
    
    if (eventType === "account.updated") {
      /**
       * Account has been updated
       * 
       * This happens when:
       * - User completes onboarding (details_submitted changes to true)
       * - Account capabilities change
       * - Requirements are updated
       * 
       * We should:
       * 1. Fetch the account to get current status
       * 2. Update our database with the new status
       * 3. Notify the user if action is required
       */
      const accountId = (event.data?.object as any)?.id || (event.account as string);
      if (!accountId) {
        console.error("No account ID in account.updated event");
      } else {
        // Fetch account to get current status
        const account = await stripeClient.accounts.retrieve(accountId as string);

        const onboardingComplete = account.details_submitted === true;
        const readyToReceivePayments = 
          account.charges_enabled === true && account.details_submitted === true;

        // Update database with new status
        const supabase = await createClient();
        await supabase
          .from("profiles")
          .update({
            stripe_connect_onboarding_complete: onboardingComplete,
          })
          .eq("stripe_connect_account_id", accountId);

        console.log(
          `Account ${accountId} updated. Onboarding: ${onboardingComplete}, Ready: ${readyToReceivePayments}`
        );

        // TODO: Send notification to user if action required
        // if (!onboardingComplete) {
        //   await sendNotificationEmail(userId, 'Action required for your Stripe account');
        // }
      }
    } else if (eventType === "account.application.deauthorized") {
      /**
       * Account has been disconnected
       * 
       * This happens when:
       * - User disconnects their Stripe account
       * - Account is deauthorized
       * 
       * We should:
       * 1. Update database to mark account as disconnected
       * 2. Notify the user
       */
      const accountId = event.account as string;
      if (accountId) {
        const supabase = await createClient();
        await supabase
          .from("profiles")
          .update({
            stripe_connect_onboarding_complete: false,
          })
          .eq("stripe_connect_account_id", accountId);

        console.log(`Account ${accountId} deauthorized`);
      }
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("Webhook error:", error);

    if (error.message?.includes("STRIPE_SECRET_KEY") || error.message?.includes("STRIPE_WEBHOOK_SECRET")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

