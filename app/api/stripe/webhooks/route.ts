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

    /**
     * For thin events, fetch the full event data
     * 
     * Thin events only contain the event ID and type.
     * We need to retrieve the full event object to get all the details.
     * 
     * Check if this is a thin event by checking if it has minimal data.
     * For V2 account events, we always fetch the full event.
     */
    if (event.type.startsWith("v2.core.account")) {
      // Fetch full event data for V2 account events
      // Using type assertion for V2 API (TypeScript types may not be fully updated)
      const fullEvent = await (stripeClient as any).v2.core.events.retrieve(event.id);
      event = fullEvent as any; // Use the full event data
    }

    console.log(`Received webhook event: ${event.type} for account: ${event.account}`);

    /**
     * Handle different event types
     * 
     * We handle:
     * 1. Account requirements updated - User needs to provide more info
     * 2. Capability status updated - Transfer capability status changed
     * 
     * Note: Using string comparison for V2 event types as TypeScript types may not include them
     */
    const eventType = event.type as string;
    
    if (eventType === "v2.core.account[requirements].updated") {
        /**
         * Account requirements have changed
         * 
         * This happens when:
         * - User needs to provide additional information
         * - Regulatory requirements change
         * - Account verification status changes
         * 
         * We should:
         * 1. Fetch the account to get current requirements
         * 2. Update our database with the new status
         * 3. Notify the user if action is required
         */
        const accountId = event.account;
        if (!accountId) {
          console.error("No account ID in requirements.updated event");
        } else {

        // Fetch account with requirements
        // Using type assertion for V2 API
        const account = await (stripeClient as any).v2.core.accounts.retrieve(
          accountId as string,
          {
            include: ["requirements"],
          }
        );

        const requirementsStatus =
          account.requirements?.summary?.minimum_deadline?.status;

        // Update database with new status
        const supabase = await createClient();
        await supabase
          .from("profiles")
          .update({
            stripe_connect_onboarding_complete:
              requirementsStatus !== "currently_due" &&
              requirementsStatus !== "past_due",
          })
          .eq("stripe_connect_account_id", accountId);

        console.log(
          `Account ${accountId} requirements updated. Status: ${requirementsStatus}`
        );

          // TODO: Send notification to user if action required
          // if (requirementsStatus === 'currently_due' || requirementsStatus === 'past_due') {
          //   await sendNotificationEmail(userId, 'Action required for your Stripe account');
          // }
        }
    } else if (eventType === "v2.core.account[.recipient].capability_status_updated") {
        /**
         * Capability status has been updated
         * 
         * This happens when:
         * - Transfer capability becomes active (ready to receive payments)
         * - Transfer capability is restricted or disabled
         * 
         * We should:
         * 1. Check if transfers are now active
         * 2. Update our database
         * 3. Notify the user
         */
        const accountId = event.account;
        if (!accountId) {
          console.error("No account ID in capability_status_updated event");
        } else {

        // Fetch account with capabilities
        // Using type assertion for V2 API
        const account = await (stripeClient as any).v2.core.accounts.retrieve(
          accountId as string,
          {
            include: ["configuration.recipient"],
          }
        );

        const transferStatus =
          account.configuration?.recipient?.capabilities?.stripe_balance
            ?.stripe_transfers?.status;

        const readyToReceivePayments = transferStatus === "active";

        console.log(
          `Account ${accountId} transfer capability updated. Status: ${transferStatus}, Ready: ${readyToReceivePayments}`
        );

          // TODO: Update database and notify user
          // if (readyToReceivePayments) {
          //   await sendNotificationEmail(userId, 'Your account is now ready to receive payments!');
          // }
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

