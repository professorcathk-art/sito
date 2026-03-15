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
import { createServiceRoleClient } from "@/lib/supabase/server";
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
     * 4. charge.refunded - Refund processed, update enrollment/appointment status
     * 5. customer.subscription.* - SaaS subscription events for Pro storefront features
     */
    const eventType = event.type;
    
    // Handle SaaS subscription events
    if (eventType.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      
      if (!userId) {
        console.error("No user_id in subscription metadata");
        return NextResponse.json({ received: true });
      }
      
      const supabase = createServiceRoleClient();
      
      // Update or create subscription record
      const subscriptionData = {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan_type: subscription.metadata?.plan_type || "pro",
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      };
      
      // Upsert subscription
      const { error: subError } = await supabase
        .from("saas_subscriptions")
        .upsert(subscriptionData, {
          onConflict: "stripe_subscription_id",
        });
      
      if (subError) {
        console.error("Error upserting subscription:", subError);
      } else {
        console.log(`Subscription ${subscription.id} updated for user ${userId}`);
      }
      
      // The trigger will automatically update is_pro_store in profiles table
      return NextResponse.json({ received: true });
    }
    
    if (eventType === "checkout.session.completed") {
      /**
       * Checkout session completed - payment successful
       * 
       * This happens when:
       * - User completes payment for a course
       * - User completes payment for a Pro subscription
       * 
       * We should:
       * 1. Check if it's a subscription (subscription_type in metadata)
       * 2. If subscription, create/update saas_subscriptions record
       * 3. If course, extract course_id and user_id from session metadata
       * 4. Create enrollment in course_enrollments table
       * 5. Store payment_intent_id for tracking
       */
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Handle Pro subscription checkout
      if (session.metadata?.subscription_type === "pro" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string" 
          ? session.subscription 
          : session.subscription.id;
        
        const userId = session.metadata?.user_id || session.client_reference_id;
        
        if (!userId) {
          console.error("No user_id in subscription checkout session metadata");
          return NextResponse.json({ received: true });
        }
        
        // Fetch full subscription object
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        
        const supabase = createServiceRoleClient();
        
        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          plan_type: subscription.metadata?.plan_type || "pro",
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        };
        
        const { error: subError } = await supabase
          .from("saas_subscriptions")
          .upsert(subscriptionData, {
            onConflict: "stripe_subscription_id",
          });
        
        if (subError) {
          console.error("Error creating subscription:", subError);
        } else {
          console.log(`✅ Pro subscription created: ${subscription.id} for user ${userId}`);
        }
        
        // Return early - don't process as course enrollment
        return NextResponse.json({ received: true });
      }
      
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

      // Get payment intent metadata if available
      let paymentIntentMetadata: Record<string, string> = {};
      if (paymentIntentId && typeof paymentIntentId === "string") {
        try {
          const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
          paymentIntentMetadata = paymentIntent.metadata || {};
        } catch (err) {
          console.error("Error retrieving payment intent:", err);
        }
      }

      const appointmentId = session.metadata?.appointment_id || paymentIntentMetadata?.appointment_id;
      const slotStartTime = session.metadata?.slot_start_time || paymentIntentMetadata?.slot_start_time;
      const slotEndTime = session.metadata?.slot_end_time || paymentIntentMetadata?.slot_end_time;
      const questionnaireResponseId = session.metadata?.questionnaire_response_id || paymentIntentMetadata?.questionnaire_response_id || null;
      const productId = session.metadata?.product_id || paymentIntentMetadata?.product_id || null;
      const guestEmail = session.metadata?.guest_email || (session.customer_details as any)?.email;

      // Use service role client for webhook operations
      const supabase = createServiceRoleClient();

      // Resolve guest: lookup user by email
      let resolvedUserId = userId;
      if ((!userId || userId === "guest") && guestEmail) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", guestEmail)
          .maybeSingle();
        if (profile) resolvedUserId = profile.id;
      }

      console.log(`Webhook metadata - courseId: ${courseId}, userId: ${userId}, resolvedUserId: ${resolvedUserId}, appointmentId: ${appointmentId}, paymentIntentId: ${paymentIntentId}, questionnaireResponseId: ${questionnaireResponseId}, productId: ${productId}`);

      // Handle course enrollment (skip if guest with no account - verify-payment will create pending)
      if (courseId && resolvedUserId && resolvedUserId !== "guest") {
        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("user_id", resolvedUserId)
          .maybeSingle();

        if (!existingEnrollment) {
          // Create enrollment
          const { data: newEnrollment, error: enrollError } = await supabase
            .from("course_enrollments")
            .insert({
              course_id: courseId,
              user_id: resolvedUserId,
              payment_intent_id: paymentIntentId || null,
              questionnaire_response_id: questionnaireResponseId || null,
            })
            .select()
            .single();

          if (enrollError) {
            console.error("Error creating enrollment from webhook:", enrollError);
            console.error("Enrollment error details:", JSON.stringify(enrollError, null, 2));
          } else {
            console.log(`✅ Enrollment created successfully for user ${resolvedUserId} in course ${courseId}`);
            console.log(`Enrollment ID: ${newEnrollment?.id}`);
          }
        } else {
          console.log(`ℹ️ Enrollment already exists for user ${resolvedUserId} in course ${courseId}`);
        }
      } else if (courseId && (!resolvedUserId || resolvedUserId === "guest") && guestEmail) {
        // Guest paid for course but has no account - create pending (webhook runs before verify-payment)
        await supabase.from("pending_course_enrollments").insert({
          course_id: courseId,
          email: guestEmail,
          payment_intent_id: paymentIntentId || null,
          questionnaire_response_id: questionnaireResponseId || null,
        });
        console.log(`✅ Pending course enrollment created for guest ${guestEmail}`);
      }

      // Handle appointment booking
      if (appointmentId && slotStartTime && slotEndTime && resolvedUserId && resolvedUserId !== "guest") {
        try {
          // Fetch slot details
          const { data: slotData, error: slotError } = await supabase
            .from("appointment_slots")
            .select("id, expert_id, rate_per_hour, is_available")
            .eq("id", appointmentId)
            .single();

          if (slotError || !slotData) {
            console.error("Error fetching appointment slot:", slotError);
            return;
          }

          if (!slotData.is_available) {
            console.log(`ℹ️ Appointment slot ${appointmentId} is already booked`);
            return;
          }

          // Calculate duration and total amount
          const startDate = new Date(slotStartTime);
          const endDate = new Date(slotEndTime);
          const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
          const totalAmount = (slotData.rate_per_hour / 60) * durationMinutes;

          // Create appointment
          const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .insert({
              expert_id: slotData.expert_id,
              user_id: resolvedUserId,
              appointment_slot_id: appointmentId,
              start_time: slotStartTime,
              end_time: slotEndTime,
              duration_minutes: durationMinutes,
              rate_per_hour: slotData.rate_per_hour,
              total_amount: totalAmount,
              status: "confirmed",
              payment_intent_id: paymentIntentId || null,
              product_id: productId || null,
              questionnaire_response_id: questionnaireResponseId || null,
            })
            .select()
            .single();

          if (appointmentError) {
            console.error("Error creating appointment from webhook:", appointmentError);
            return;
          }

          // Mark slot as unavailable
          await supabase
            .from("appointment_slots")
            .update({ is_available: false })
            .eq("id", appointmentId);

          // Link questionnaire response to appointment
          if (questionnaireResponseId && appointment?.id) {
            await supabase
              .from("questionnaire_responses")
              .update({ appointment_id: appointment.id })
              .eq("id", questionnaireResponseId);
          }

          // Send confirmation email for paid booking
          try {
            const { sendBookingConfirmedEmail } = await import("@/lib/resend-booking-emails");
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("name, email")
              .eq("id", userId)
              .single();
            const { data: expertProfile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", slotData.expert_id)
              .single();
            let whatToExpect: string | null = null;
            if (productId) {
              const { data: product } = await supabase
                .from("products")
                .select("what_to_expect")
                .eq("id", productId)
                .single();
              whatToExpect = product?.what_to_expect || null;
            }
            const dateTime = new Date(slotStartTime).toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            if (userProfile?.email) {
              await sendBookingConfirmedEmail(
                userProfile.email,
                userProfile.name || "there",
                expertProfile?.name || "Expert",
                dateTime,
                "To be provided",
                whatToExpect
              );
            }
          } catch (emailErr) {
            console.warn("Failed to send booking confirmation email:", emailErr);
          }

          console.log(`✅ Appointment created successfully for user ${resolvedUserId}`);
          console.log(`Appointment ID: ${appointment?.id}`);
        } catch (err: any) {
          console.error("Error processing appointment booking:", err);
        }
      } else if (appointmentId && slotStartTime && slotEndTime && (!resolvedUserId || resolvedUserId === "guest") && guestEmail) {
        // Guest paid for appointment but has no account - create pending
        try {
          const { data: slotData } = await supabase
            .from("appointment_slots")
            .select("id, expert_id, rate_per_hour")
            .eq("id", appointmentId)
            .single();
          if (slotData) {
            const startDate = new Date(slotStartTime);
            const endDate = new Date(slotEndTime);
            const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
            const totalAmount = (slotData.rate_per_hour / 60) * durationMinutes;
            await supabase.from("pending_appointments").insert({
              appointment_slot_id: appointmentId,
              expert_id: slotData.expert_id,
              email: guestEmail,
              slot_start_time: slotStartTime,
              slot_end_time: slotEndTime,
              duration_minutes: durationMinutes,
              rate_per_hour: slotData.rate_per_hour,
              total_amount: totalAmount,
              payment_intent_id: paymentIntentId || null,
              questionnaire_response_id: questionnaireResponseId || null,
              product_id: productId || null,
            });
            await supabase.from("appointment_slots").update({ is_available: false }).eq("id", appointmentId);
            console.log(`✅ Pending appointment created for guest ${guestEmail}`);
          }
        } catch (err: any) {
          console.error("Error creating pending appointment:", err);
        }
      }

      if (!courseId && !appointmentId) {
        console.warn("Missing course_id or appointment_id in checkout session metadata");
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

        // Update database with new status - use service role to bypass RLS
        const supabase = createServiceRoleClient();
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
        // Use service role client to bypass RLS for webhook operations
        const supabase = createServiceRoleClient();
        await supabase
          .from("profiles")
          .update({
            stripe_connect_onboarding_complete: false,
          })
          .eq("stripe_connect_account_id", accountId);

        console.log(`Account ${accountId} deauthorized`);
      }
    } else if (eventType === "charge.refunded") {
      /**
       * Charge refunded - refund processed
       * 
       * This happens when:
       * - A refund is processed for a payment
       * 
       * We should:
       * 1. Extract refund metadata to find enrollment/appointment
       * 2. Update refund status in database
       */
      try {
        // For charge.refunded event, the object is a Charge, not a Refund
        const charge = event.data.object as Stripe.Charge;
        const chargeId = charge.id;

        // Get payment intent from charge
        const paymentIntentId = typeof charge.payment_intent === "string" 
          ? charge.payment_intent 
          : charge.payment_intent?.id;

        if (!paymentIntentId) {
          console.error("Refund webhook: No payment intent found for charge");
          return NextResponse.json({ received: true });
        }

        // Retrieve payment intent to get metadata
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
        const metadata = paymentIntent.metadata || {};

        const type = metadata.type; // "course" or "appointment"
        const enrollmentOrAppointmentId = metadata.enrollment_or_appointment_id;

        if (!type || !enrollmentOrAppointmentId) {
          console.error("Refund webhook: Missing metadata", { type, enrollmentOrAppointmentId });
          return NextResponse.json({ received: true });
        }

        // Get the refund details from Stripe
        // List refunds for this charge to get the latest refund
        const refunds = await stripeClient.refunds.list({ charge: chargeId, limit: 1 });
        const latestRefund = refunds.data[0];

        if (!latestRefund) {
          console.error("Refund webhook: No refund found for charge");
          return NextResponse.json({ received: true });
        }

        const supabase = createServiceRoleClient();
        const refundAmount = latestRefund.amount / 100; // Convert from cents to decimal

        if (type === "course") {
          await supabase
            .from("course_enrollments")
            .update({
              refund_status: latestRefund.status === "succeeded" ? "refunded" : "failed",
              refund_id: latestRefund.id,
              refunded_at: latestRefund.status === "succeeded" ? new Date().toISOString() : null,
              refund_amount: latestRefund.status === "succeeded" ? refundAmount : null,
            })
            .eq("id", enrollmentOrAppointmentId);
        } else if (type === "appointment") {
          await supabase
            .from("appointments")
            .update({
              refund_status: latestRefund.status === "succeeded" ? "refunded" : "failed",
              refund_id: latestRefund.id,
              refunded_at: latestRefund.status === "succeeded" ? new Date().toISOString() : null,
              refund_amount: latestRefund.status === "succeeded" ? refundAmount : null,
              status: latestRefund.status === "succeeded" ? "cancelled" : undefined,
            })
            .eq("id", enrollmentOrAppointmentId);
        }

        console.log(`✅ Refund webhook processed: ${latestRefund.id} for ${type} ${enrollmentOrAppointmentId}`);
      } catch (err) {
        console.error("Error processing refund webhook:", err);
      }
    }

    // Log unhandled event types (but don't fail)
    if (eventType !== "checkout.session.completed" && 
        eventType !== "account.updated" && 
        eventType !== "account.application.deauthorized" &&
        eventType !== "charge.refunded" &&
        !eventType.startsWith("customer.subscription.")) {
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

