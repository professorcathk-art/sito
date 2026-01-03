/**
 * Storefront Page
 * 
 * This page displays all products from all connected accounts.
 * Customers can browse and purchase products.
 */

"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  description: string;
  price: {
    id: string;
    amount: number;
    currency: string;
    formatted: string;
  } | null;
  connectedAccountId: string;
  created: number;
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  /**
   * Fetch all products from Stripe
   */
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/products/list?limit=50");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle product purchase
   */
  const handlePurchase = async (product: Product) => {
    if (!product.price || !product.connectedAccountId) {
      alert("Product is not available for purchase");
      return;
    }

    setPurchasing(product.id);

    try {
      const response = await fetch("/api/stripe/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: product.price.id,
          quantity: 1,
          connectedAccountId: product.connectedAccountId,
          applicationFeePercent: 20, // 20% platform fee
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      alert(err.message || "Failed to start checkout");
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-custom-text mb-8">Storefront</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 animate-pulse"
                >
                  <div className="h-6 bg-dark-green-900/50 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-dark-green-900/50 rounded w-full mb-2"></div>
                  <div className="h-4 bg-dark-green-900/50 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
              <p className="text-custom-text/80 text-lg mb-4">
                No products available yet.
              </p>
              <p className="text-custom-text/60">
                Check back soon or{" "}
                <Link href="/dashboard" className="text-cyber-green hover:text-cyber-green-light">
                  create your own products
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 hover:border-cyber-green/50 transition-colors"
                >
                  <h3 className="text-xl font-bold text-custom-text mb-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-custom-text/80 mb-4 line-clamp-3">
                      {product.description}
                    </p>
                  )}
                  {product.price && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-2xl font-bold text-cyber-green">
                        {product.price.formatted}
                      </span>
                      <button
                        onClick={() => handlePurchase(product)}
                        disabled={purchasing === product.id}
                        className="px-6 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                      >
                        {purchasing === product.id ? "Processing..." : "Buy Now"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

