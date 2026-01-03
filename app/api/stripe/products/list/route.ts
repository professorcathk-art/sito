/**
 * API Route: List Stripe Products
 * 
 * This endpoint lists all products created at the platform level.
 * Products are filtered by connected account if accountId is provided.
 * 
 * GET /api/stripe/products/list?accountId=acct_xxx&limit=10
 * 
 * Query Parameters:
 * - accountId: string (optional) - Filter products by connected account
 * - limit: number (optional) - Number of products to return (default: 10)
 * 
 * Response:
 * {
 *   products: array,
 *   hasMore: boolean
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";

export async function GET(request: NextRequest) {
  try {
    // Initialize Stripe client
    const stripeClient = getStripeClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    /**
     * List products from Stripe
     * 
     * We list all products at the platform level.
     * If accountId is provided, we filter by metadata.
     */
    const params: any = {
      limit: Math.min(limit, 100), // Stripe max is 100
      expand: ["data.default_price"], // Expand price details
    };

    // If filtering by account, use metadata search
    if (accountId) {
      params.metadata = {
        connected_account_id: accountId,
      };
    }

    const products = await stripeClient.products.list(params);

    // Format products for easier consumption
    const formattedProducts = products.data.map((product) => {
      const price =
        typeof product.default_price === "string"
          ? null
          : product.default_price;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price
          ? {
              id: price.id,
              amount: price.unit_amount,
              currency: price.currency,
              formatted: `${(price.unit_amount || 0) / 100} ${price.currency.toUpperCase()}`,
            }
          : null,
        connectedAccountId: product.metadata?.connected_account_id,
        created: product.created,
      };
    });

    return NextResponse.json({
      products: formattedProducts,
      hasMore: products.has_more,
    });

  } catch (error: any) {
    console.error("Error listing products:", error);

    if (error.message?.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to list products" },
      { status: 500 }
    );
  }
}

