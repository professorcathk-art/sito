# Stripe Connect Integration Guide

This document provides a complete guide to the Stripe Connect integration implemented in this application.

## Overview

This integration implements a Stripe Connect marketplace where:
- **Platform** (you) collects application fees (default 20%)
- **Connected Accounts** (experts) receive payments for their products
- **Customers** purchase products through a storefront

## Architecture

### Flow Diagram

```
Customer → Storefront → Checkout Session → Stripe Payment
                                              ↓
                                    Platform Fee (20%)
                                              ↓
                                    Transfer to Expert
```

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Secret Key (Server-side only - NEVER expose to client)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Publishable Key (Safe for client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secret (For verifying webhook signatures)
STRIPE_WEBHOOK_SECRET=whsec_...

# Site URL (For redirect URLs)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**Get your keys from:** https://dashboard.stripe.com/apikeys

### 2. Webhook Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **"+ Add destination"**
3. Configure:
   - **Events from:** Select "Connected accounts"
   - **Payload style:** Select **"Thin"** (required for V2 accounts)
   - **Events:** Add these events:
     - `v2.core.account[requirements].updated`
     - `v2.core.account[.recipient].capability_status_updated`
4. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhooks`
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Local Webhook Testing

Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Forward thin events to local endpoint
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
  --forward-thin-to http://localhost:3000/api/stripe/webhooks
```

## API Routes

### Connect Account Management

#### `POST /api/stripe/connect/create-account`
Creates a new Stripe Connect account for a user.

**Request:**
```json
{
  "displayName": "John Doe",
  "contactEmail": "john@example.com",
  "country": "us"
}
```

**Response:**
```json
{
  "accountId": "acct_xxx",
  "account": { ... },
  "message": "Account created successfully"
}
```

#### `POST /api/stripe/connect/create-account-link`
Creates an onboarding link for a connected account.

**Request:**
```json
{
  "accountId": "acct_xxx",
  "returnUrl": "https://yourdomain.com/dashboard/stripe-connect"
}
```

**Response:**
```json
{
  "url": "https://connect.stripe.com/...",
  "expiresAt": 1234567890
}
```

#### `GET /api/stripe/connect/account-status?accountId=acct_xxx`
Gets the current status of a connected account.

**Response:**
```json
{
  "accountId": "acct_xxx",
  "readyToReceivePayments": true,
  "onboardingComplete": true,
  "requirementsStatus": "complete"
}
```

### Product Management

#### `POST /api/stripe/products/create`
Creates a product at the platform level.

**Request:**
```json
{
  "name": "Online Course",
  "description": "Learn something new",
  "priceInCents": 10000,
  "currency": "usd",
  "connectedAccountId": "acct_xxx"
}
```

**Response:**
```json
{
  "productId": "prod_xxx",
  "priceId": "price_xxx",
  "product": { ... }
}
```

#### `GET /api/stripe/products/list?accountId=acct_xxx&limit=10`
Lists all products (optionally filtered by account).

**Response:**
```json
{
  "products": [
    {
      "id": "prod_xxx",
      "name": "Online Course",
      "price": {
        "id": "price_xxx",
        "amount": 10000,
        "currency": "usd",
        "formatted": "$100.00 USD"
      },
      "connectedAccountId": "acct_xxx"
    }
  ],
  "hasMore": false
}
```

### Checkout

#### `POST /api/stripe/checkout/create-session`
Creates a checkout session for purchasing a product.

**Request:**
```json
{
  "priceId": "price_xxx",
  "quantity": 1,
  "connectedAccountId": "acct_xxx",
  "applicationFeePercent": 20
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

### Webhooks

#### `POST /api/stripe/webhooks`
Handles webhook events from Stripe.

**Events Handled:**
- `v2.core.account[requirements].updated` - Account requirements changed
- `v2.core.account[.recipient].capability_status_updated` - Capability status changed

## UI Components

### Stripe Connect Onboarding
**Location:** `components/stripe-connect-onboarding.tsx`
**Page:** `/dashboard/stripe-connect`

Allows users to:
- Create a Stripe Connect account
- Start onboarding process
- Check account status

### Product Creation Form
**Location:** `components/product-create-form.tsx`
**Page:** `/dashboard/stripe-products`

Allows experts to create products for sale.

### Storefront
**Location:** `app/stripe/storefront/page.tsx`
**URL:** `/stripe/storefront`

Displays all products and allows customers to purchase.

## User Flows

### Expert Onboarding Flow

1. Expert goes to `/dashboard/stripe-connect`
2. Clicks "Create Stripe Account"
3. Account is created in Stripe
4. Clicks "Onboard to Collect Payments"
5. Redirected to Stripe's onboarding flow
6. Completes bank details, identity verification, etc.
7. Returns to dashboard
8. Status shows "Ready to Receive Payments"

### Product Creation Flow

1. Expert goes to `/dashboard/stripe-products`
2. Fills out product form (name, description, price)
3. Clicks "Create Product"
4. Product is created at platform level
5. Product appears in storefront

### Customer Purchase Flow

1. Customer browses `/stripe/storefront`
2. Clicks "Buy Now" on a product
3. Redirected to Stripe Checkout
4. Enters payment details
5. Payment processed:
   - Platform collects 20% application fee
   - Remaining 80% transferred to expert's account
6. Redirected to success page

## Database Schema

### Profiles Table
- `stripe_connect_account_id` (TEXT) - Stripe Connect account ID
- `stripe_connect_onboarding_complete` (BOOLEAN) - Onboarding status

### Product Mapping
Products are stored in Stripe with metadata:
- `connected_account_id` - Links product to expert
- `created_by_user_id` - Tracks creator

## Key Implementation Details

### Stripe Client Usage
All Stripe API calls use the server-side client from `lib/stripe/server.ts`:
```typescript
import { getStripeClient } from "@/lib/stripe/server";
const stripeClient = getStripeClient();
```

### V2 Accounts API
We use Stripe's V2 Accounts API:
- `stripeClient.v2.core.accounts.create()` - Create account
- `stripeClient.v2.core.accountLinks.create()` - Create onboarding link
- `stripeClient.v2.core.accounts.retrieve()` - Get account status

**Important:** We do NOT use top-level `type` parameter. Configuration is done via:
- `dashboard: "express"`
- `defaults.responsibilities`
- `configuration.recipient`

### Destination Charges
Checkout sessions use destination charges:
```typescript
payment_intent_data: {
  application_fee_amount: feeAmount,
  transfer_data: {
    destination: connectedAccountId,
  },
}
```

### Thin Events
Webhooks use thin events for V2 accounts:
- Thin events only contain event ID and type
- We fetch full event data using `v2.core.events.retrieve()`

## Error Handling

All API routes include:
- Environment variable validation
- Stripe error handling
- User-friendly error messages
- Detailed console logging for debugging

## Security Considerations

1. **API Keys:** Never expose `STRIPE_SECRET_KEY` to client
2. **Webhook Verification:** All webhooks verify signatures
3. **User Authentication:** All routes check for authenticated users
4. **Input Validation:** All inputs are validated before API calls

## Testing

### Test Mode
Use Stripe test mode keys:
- `sk_test_...` for secret key
- `pk_test_...` for publishable key
- Test cards: `4242 4242 4242 4242`

### Test Scenarios
1. Create account → Onboard → Check status
2. Create product → List products → Purchase
3. Verify webhook events are received
4. Check application fees are calculated correctly

## Troubleshooting

### "STRIPE_SECRET_KEY is not set"
- Add `STRIPE_SECRET_KEY=sk_test_...` to `.env.local`
- Restart development server

### Webhook signature verification fails
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Verify webhook endpoint URL matches Stripe Dashboard
- Ensure using "Thin" payload style for V2 events

### Account not ready to receive payments
- Check onboarding is complete
- Verify transfer capability is active
- Check account requirements status

## Next Steps

1. Add product management UI (edit/delete products)
2. Add payout dashboard for experts
3. Add email notifications for payments
4. Add analytics and reporting
5. Implement refund handling

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [V2 Accounts API](https://stripe.com/docs/api/v2/core/accounts)
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Thin Events](https://stripe.com/docs/webhooks/thin-events)

