/**
 * API Route: Create Stripe Product
 * 
 * This endpoint creates a product at the platform level (not on connected account).
 * Products are created at the platform level, and we store the mapping to the connected account.
 * 
 * POST /api/stripe/products/create
 * 
 * Request Body:
 * {
 *   name: string,              // Product name
 *   description: string,        // Product description
 *   priceInCents: number,       // Price in cents (e.g., 1000 = $10.00)
 *   currency: string,           // Currency code (default: 'usd')
 *   connectedAccountId: string  // Stripe Connect account ID (expert who owns this product)
 * }
 * 
 * Response:
 * {
 *   productId: string,
 *   priceId: string,
 *   product: object
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      priceInCents,
      currency = "usd",
      connectedAccountId,
    } = body;

    // Validate required fields
    if (!name || priceInCents === undefined || !connectedAccountId) {
      return NextResponse.json(
        { error: "name, priceInCents, and connectedAccountId are required" },
        { status: 400 }
      );
    }

    // Validate price is positive
    if (priceInCents <= 0) {
      return NextResponse.json(
        { error: "priceInCents must be greater than 0" },
        { status: 400 }
      );
    }

    /**
     * Create a product at the platform level
     * 
     * Key points:
     * - Products are created at the platform level (not on connected account)
     * - We use default_price_data to create a price inline
     * - We store the connectedAccountId in metadata for mapping
     * 
     * The product will be used in checkout sessions where we'll:
     * - Transfer funds to the connected account (destination charge)
     * - Collect application fee for the platform
     */
    const product = await stripeClient.products.create({
      name: name,
      description: description || "",
      
      // Create price inline with the product
      default_price_data: {
        // Amount in cents (e.g., 1000 = $10.00)
        unit_amount: priceInCents,
        // Currency code (ISO 4217)
        currency: currency,
      },
      
      // Store mapping to connected account in metadata
      // This allows us to know which expert owns this product
      metadata: {
        connected_account_id: connectedAccountId,
        created_by_user_id: user.id,
      },
    });

    // Extract the default price ID
    // When using default_price_data, Stripe creates a price and sets it as default
    const priceId =
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id;

    if (!priceId) {
      throw new Error("Failed to create price for product");
    }

    /**
     * Store product mapping in database (optional but recommended)
     * 
     * You might want to create a products table to track:
     * - Product ID
     * - Price ID
     * - Connected Account ID
     * - User ID (who created it)
     * - Created date, etc.
     * 
     * For now, we're storing it in Stripe metadata, but you could also:
     * 
     * await supabase.from('stripe_products').insert({
     *   stripe_product_id: product.id,
     *   stripe_price_id: priceId,
     *   connected_account_id: connectedAccountId,
     *   user_id: user.id,
     * });
     */

    return NextResponse.json({
      productId: product.id,
      priceId: priceId,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        default_price: priceId,
        metadata: product.metadata,
      },
    });

  } catch (error: any) {
    console.error("Error creating product:", error);

    if (error.type === "StripeInvalidRequestError") {
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
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

