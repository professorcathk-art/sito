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
import { getStripeClient, getStripeWebhookSecrets } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get webhook secrets for signature verification
    // Support multiple secrets for different webhook endpoints:
    // - Platform events (checkout.session.completed) - one secret
    // - Connected account events (account.updated) - another secret
    const webhookSecrets = getStripeWebhookSecrets();

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
     * Parse webhook event from Stripe
     * 
     * Try each webhook secret until one works (for multiple endpoints)
     * 
     * Thin events only contain:
     * - Event ID
     * - Event type
     * - Account ID (for connected accounts)
     * 
     * Note: The Stripe SDK's webhooks.constructEvent() works for both regular and thin events.
     */
    let event: Stripe.Event | null = null;
    let lastError: Error | null = null;

    // Try each webhook secret (different endpoints have different secrets)
    for (const webhookSecret of webhookSecrets) {
      try {
        event = stripeClient.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );
        // Success - break out of loop
        break;
      } catch (err: any) {
        // Save error and try next secret
        lastError = err;
        continue;
      }
    }

    // If all secrets failed, return error
    if (!event) {
      console.error("Webhook signature verification failed with all secrets:", lastError?.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${lastError?.message || "Unknown error"}` },
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
     * 3. checkout.session.completed - Payment successful, enroll user in course
     */
    const eventType = event.type;
    
    if (eventType === "checkout.session.completed") {
      /**
       * Checkout session completed - payment successful
       * 
       * This happens when:
       * - User completes payment for a course
       * 
       * We should:
       * 1. Extract course_id and user_id from session metadata
       * 2. Create enrollment in course_enrollments table
       * 3. Store payment_intent_id for tracking
       */
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Try to get metadata from session first, then from payment intent
      let courseId = session.metadata?.course_id;
      let userId = session.metadata?.user_id;
      
      // If not in session metadata, try to get from payment intent
      if ((!courseId || !userId || userId === "guest") && session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === "string" 
          ? session.payment_intent 
          : session.payment_intent?.id;
        
        if (paymentIntentId) {
          try {
            const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
            courseId = courseId || paymentIntent.metadata?.course_id;
            userId = userId || paymentIntent.metadata?.user_id;
          } catch (err) {
            console.error("Error retrieving payment intent:", err);
          }
        }
      }
      
      const paymentIntentId = typeof session.payment_intent === "string" 
        ? session.payment_intent 
        : session.payment_intent?.id;

      console.log(`Webhook metadata - courseId: ${courseId}, userId: ${userId}, paymentIntentId: ${paymentIntentId}`);

      if (courseId && userId && userId !== "guest") {
        const supabase = await createClient();
        
        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingEnrollment) {
          // Create enrollment
          const { data: newEnrollment, error: enrollError } = await supabase
            .from("course_enrollments")
            .insert({
              course_id: courseId,
              user_id: userId,
              payment_intent_id: paymentIntentId || null,
            })
            .select()
            .single();

          if (enrollError) {
            console.error("Error creating enrollment from webhook:", enrollError);
            console.error("Enrollment error details:", JSON.stringify(enrollError, null, 2));
          } else {
            console.log(`✅ Enrollment created successfully for user ${userId} in course ${courseId}`);
            console.log(`Enrollment ID: ${newEnrollment?.id}`);
          }
        } else {
          console.log(`ℹ️ Enrollment already exists for user ${userId} in course ${courseId}`);
        }
      } else {
        console.warn("Missing course_id or user_id in checkout session metadata");
      }
    } else if (eventType === "account.updated") {
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

