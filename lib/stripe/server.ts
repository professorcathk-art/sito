/**
 * Stripe Server-Side Client Utility
 * 
 * This module provides a server-side Stripe client instance for all Stripe API operations.
 * The client uses the Stripe secret key from environment variables.
 * 
 * IMPORTANT: This client should ONLY be used in server-side code (API routes, server components).
 * Never expose the secret key to the client-side code.
 */

import Stripe from "stripe";

/**
 * Get the Stripe secret key from environment variables
 * 
 * @throws {Error} If STRIPE_SECRET_KEY is not set in environment variables
 * @returns {string} The Stripe secret key
 */
function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set in environment variables. " +
      "Please add STRIPE_SECRET_KEY=sk_test_... to your .env.local file. " +
      "Get your API key from https://dashboard.stripe.com/apikeys"
    );
  }

  // Validate that it's a valid Stripe key format
  if (!secretKey.startsWith("sk_")) {
    throw new Error(
      "Invalid STRIPE_SECRET_KEY format. Stripe secret keys should start with 'sk_' or 'sk_live_'. " +
      "Please check your .env.local file."
    );
  }

  return secretKey;
}

/**
 * Create and return a Stripe client instance
 * 
 * This function creates a new Stripe client using the secret key from environment variables.
 * The client is configured to use the latest API version automatically.
 * 
 * Usage:
 * ```typescript
 * const stripeClient = getStripeClient();
 * const account = await stripeClient.v2.core.accounts.create({...});
 * ```
 * 
 * @returns {Stripe} A configured Stripe client instance
 * @throws {Error} If STRIPE_SECRET_KEY is not set or invalid
 */
export function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  
  return new Stripe(secretKey, {
    // The API version will be automatically set by the SDK
    // No need to specify apiVersion when using the latest SDK
  });
}

/**
 * Get the Stripe publishable key for client-side use
 * 
 * This key is safe to expose to the client-side code.
 * It's used for Stripe.js initialization in the browser.
 * 
 * @returns {string} The Stripe publishable key
 * @throws {Error} If NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set
 */
export function getStripePublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables. " +
      "Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... to your .env.local file. " +
      "Get your publishable key from https://dashboard.stripe.com/apikeys"
    );
  }

  if (!publishableKey.startsWith("pk_")) {
    throw new Error(
      "Invalid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format. Stripe publishable keys should start with 'pk_'. " +
      "Please check your .env.local file."
    );
  }

  return publishableKey;
}

/**
 * Get the webhook secret(s) for verifying webhook signatures
 * 
 * This function supports multiple webhook secrets (comma-separated) for different endpoints.
 * Stripe gives you a different secret for each webhook endpoint:
 * - Platform events (checkout.session.completed) - one secret
 * - Connected account events (account.updated) - another secret
 * 
 * @returns {string[]} Array of webhook secrets to try
 * @throws {Error} If STRIPE_WEBHOOK_SECRET is not set
 */
export function getStripeWebhookSecrets(): string[] {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set in environment variables. " +
      "Please add STRIPE_WEBHOOK_SECRET=whsec_... to your .env.local file. " +
      "Get your webhook secret from https://dashboard.stripe.com/webhooks"
    );
  }

  // Support multiple secrets (comma-separated) or single secret
  return webhookSecret.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Get a single webhook secret (for backward compatibility)
 * 
 * @returns {string} The first webhook secret
 * @throws {Error} If STRIPE_WEBHOOK_SECRET is not set
 */
export function getStripeWebhookSecret(): string {
  const secrets = getStripeWebhookSecrets();
  return secrets[0];
}

