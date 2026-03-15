/**
 * API Route: Create Checkout Session
 * 
 * This endpoint creates a Stripe Checkout session for purchasing a product.
 * Uses Destination Charge with application fee to monetize transactions.
 * 
 * POST /api/stripe/checkout/create-session
 * 
 * Request Body:
 * {
 *   priceId: string,           // Stripe Price ID
 *   quantity: number,           // Quantity to purchase (default: 1)
 *   connectedAccountId: string, // Connected account to transfer funds to
 *   applicationFeePercent: number // Platform fee percentage (default: 10, configurable via STRIPE_PLATFORM_FEE_PERCENT)
 * }
 * 
 * Response:
 * {
 *   sessionId: string,
 *   url: string                // Checkout URL to redirect user to
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get authenticated user (optional - you might allow guest checkout)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();
    
    // Get platform fee from environment variable or default to 10%
    const defaultPlatformFee = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "10");
    
    const {
      priceId,
      priceData, // For dynamic pricing (appointments)
      quantity = 1,
      connectedAccountId,
      applicationFeePercent = defaultPlatformFee, // Default from env var or 10%
      courseId,
      appointmentId, // Can be camelCase from frontend (actually slot id)
      slotStartTime, // Can be camelCase from frontend
      slotEndTime, // Can be camelCase from frontend
      questionnaireResponseId, // Can be camelCase from frontend
      productId, // For appointment - product_id from slot
      customerEmail, // For guest checkout - email from form
    } = body;

    // Validate required fields
    if ((!priceId && !priceData) || !connectedAccountId) {
      return NextResponse.json(
        { error: "Either priceId or priceData, and connectedAccountId are required" },
        { status: 400 }
      );
    }

    // Calculate total amount and build line items
    let totalAmount: number;
    const lineItems: any[] = [];
    
    if (priceData) {
      // Dynamic pricing (for appointments with variable duration)
      totalAmount = (priceData.unit_amount || 0) * quantity;
      lineItems.push({
        price_data: priceData,
        quantity: quantity,
      });
    } else {
      // Fixed pricing (for courses)
      const price = await stripeClient.prices.retrieve(priceId);
      const unitAmount = price.unit_amount || 0;
      totalAmount = unitAmount * quantity;
      
      // Get product to retrieve product name
      const productId = typeof price.product === "string" ? price.product : price.product?.id;
      const product = productId ? await stripeClient.products.retrieve(productId) : null;
      const productName = product?.name || "Course";
      
      // For courses, generate custom description instead of using product description
      // This avoids showing HTML code in Stripe checkout
      let customDescription = "Course enrollment";
      
      if (courseId) {
        // Fetch course and expert information to generate custom description
        const supabaseAdmin = createServiceRoleClient();
        const { data: courseData } = await supabaseAdmin
          .from("courses")
          .select(`
            title,
            expert_id,
            profiles!courses_expert_id_fkey(name)
          `)
          .eq("id", courseId)
          .single();
        
        if (courseData) {
          const expertName = (courseData.profiles as any)?.name || "Expert";
          customDescription = `Course provided by ${expertName}`;
        }
      }
      
      // Use price_data to override product description with custom description
      // This ensures clean text without HTML in Stripe checkout
      lineItems.push({
        price_data: {
          currency: price.currency,
          unit_amount: unitAmount,
          product_data: {
            name: productName, // Use product name from Stripe
            description: customDescription, // Custom description without HTML
          },
        },
        quantity: quantity,
      });
    }

    // Calculate application fee amount (platform's cut)
    // Fee is calculated as a percentage of the total amount
    const applicationFeeAmount = Math.round(
      (totalAmount * applicationFeePercent) / 100
    );

    // Get base URL for success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Log metadata being sent for debugging
    const effectiveUserId = user?.id || "guest";
    const guestEmail = !user && customerEmail ? customerEmail : undefined;
    const sessionMetadata: Record<string, string> = {
      connected_account_id: connectedAccountId,
      application_fee_percent: applicationFeePercent.toString(),
      user_id: effectiveUserId,
      course_id: courseId || "",
      appointment_id: appointmentId || "",
      slot_start_time: slotStartTime || "",
      slot_end_time: slotEndTime || "",
      questionnaire_response_id: questionnaireResponseId || "",
      product_id: productId || "",
    };
    if (guestEmail) sessionMetadata.guest_email = guestEmail;
    
    console.log("Creating checkout session with metadata:", JSON.stringify(sessionMetadata, null, 2));
    console.log("Connected Account ID:", connectedAccountId);
    console.log("User ID:", user?.id);
    console.log("Course ID:", courseId);
    console.log("Appointment ID:", appointmentId);

    const session = await stripeClient.checkout.sessions.create({
      // Line items for the checkout
      line_items: lineItems,

      // Payment intent configuration
      payment_intent_data: {
        // Platform's fee (in cents)
        application_fee_amount: applicationFeeAmount,

        // Transfer configuration
        transfer_data: {
          // Destination: Connected account to receive funds
          destination: connectedAccountId,
        },

        // Store metadata for tracking and enrollment (in payment intent)
        metadata: sessionMetadata,
      },

      // Store metadata at session level too (for webhook access)
      metadata: sessionMetadata,

      // Payment mode (one-time payment)
      mode: "payment",

      // Success URL - redirect here after successful payment
      success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,

      // Cancel URL - redirect here if user cancels
      cancel_url: `${baseUrl}/stripe/cancel`,

      // Customer email (logged-in user or guest from form)
      customer_email: user?.email || customerEmail || undefined,

      // Set locale to English for checkout page and emails
      locale: "en",
    });

    console.log("Checkout session created:", session.id);
    console.log("Checkout URL:", session.url);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error("Error creating checkout session:", error);

    if (error.type === "StripeInvalidRequestError") {
      // Handle region restriction errors
      if (error.message?.includes("restricted outside of your platform's region") || 
          error.message?.includes("can't be sent to accounts located")) {
        return NextResponse.json(
          { 
            error: "Region restriction: Your Stripe platform account and connected account must be in the same region. " +
                   "Please contact support or configure your Stripe account to allow cross-region transfers. " +
                   "Error details: " + error.message
          },
          { status: 400 }
        );
      }
      if (error.message?.includes("stripe_transfers") || error.message?.includes("stripe_balance")) {
        return NextResponse.json(
          { 
            error: "Payment will be settled with the expert after they confirm your booking.",
            code: "STRIPE_SETUP_INCOMPLETE",
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    if (error.message?.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

