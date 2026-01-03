/**
 * Checkout Cancel Page
 * 
 * This page is shown when a user cancels the checkout process.
 */

"use client";

import Link from "next/link";
import { Navigation } from "@/components/navigation";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-dark-green-800/30 border border-yellow-500/30 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-custom-text mb-4">
              Payment Cancelled
            </h1>
            <p className="text-custom-text/80 mb-6">
              Your payment was cancelled. No charges were made.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/stripe/storefront"
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Return to Storefront
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

