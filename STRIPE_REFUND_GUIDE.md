# Stripe Refund Management Guide

## Overview

This guide explains how refunds work in the Sito marketplace platform. Refunds can be processed for both course enrollments and appointment bookings.

## How Refunds Work

### 1. **Refund Processing Flow**

1. **Expert initiates refund** → Via "View Members" in Products Management
2. **API processes refund** → `/api/stripe/refund` endpoint
3. **Stripe processes refund** → Money returned to customer
4. **Webhook updates database** → `charge.refunded` event updates refund status
5. **Database updated** → Enrollment/appointment marked as refunded

### 2. **Refund Authorization**

- **Experts** can only refund their own courses/appointments
- **Platform admins** can refund any purchase (future feature)
- **Customers** cannot directly refund (must contact expert)

### 3. **Refund Types**

- **Full Refund**: Complete refund of original payment amount
- **Partial Refund**: Refund a portion of the payment (future feature)

## Database Schema

### Course Enrollments

```sql
refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processing', 'refunded', 'failed'))
refund_id TEXT -- Stripe refund ID
refunded_at TIMESTAMP WITH TIME ZONE
refund_amount DECIMAL(10, 2) -- Amount refunded
refund_reason TEXT -- Reason for refund
```

### Appointments

```sql
refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processing', 'refunded', 'failed'))
refund_id TEXT -- Stripe refund ID
refunded_at TIMESTAMP WITH TIME ZONE
refund_amount DECIMAL(10, 2) -- Amount refunded
refund_reason TEXT -- Reason for refund
```

## API Endpoint

### POST `/api/stripe/refund`

**Request Body:**
```json
{
  "type": "course" | "appointment",
  "id": "enrollment_id or appointment_id",
  "amount": 1000, // Optional: partial refund amount in cents
  "reason": "Customer requested refund" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "refund": {
    "id": "re_1234567890",
    "status": "succeeded",
    "amount": 100.00,
    "currency": "hkd"
  },
  "message": "Refund processed successfully"
}
```

## Webhook Events

### `charge.refunded`

When Stripe processes a refund, this webhook event is triggered:

1. Webhook receives refund event
2. Extracts payment intent metadata
3. Updates enrollment/appointment refund status
4. Marks appointment as "cancelled" if refunded

## UI Components

### For Experts: Products Management

1. Navigate to **Dashboard → Products → Products & Services**
2. Find your course product
3. Click **"View Members"**
4. In the members table, click **"Refund"** button next to paid enrollments
5. Confirm refund and optionally provide reason
6. Refund status updates automatically

### Refund Status Indicators

- **Paid** (green): Payment received, no refund
- **Processing** (yellow): Refund in progress
- **✓ Refunded** (green): Refund completed successfully
- **Failed** (red): Refund failed (contact support)

## Important Notes

### Refund Limitations

1. **Stripe Connect**: Refunds affect both platform fee and expert payout
   - Platform fee is automatically reversed
   - Expert payout is automatically reversed
   - Customer receives full refund

2. **Refund Window**: Stripe allows refunds up to 90 days after payment
   - After 90 days, contact Stripe support for manual refunds

3. **Partial Refunds**: Currently only full refunds are supported
   - Partial refunds can be added in future updates

### Best Practices

1. **Always provide a reason** when processing refunds
2. **Verify payment intent exists** before refunding
3. **Check refund status** after processing
4. **Notify customer** after refund is processed (manual step for now)

## Troubleshooting

### Refund Failed

**Possible causes:**
- Payment intent not found
- Refund already processed
- Stripe API error
- Insufficient funds in connected account

**Solution:**
- Check Stripe Dashboard for refund status
- Verify payment intent ID exists
- Contact Stripe support if needed

### Refund Status Not Updating

**Possible causes:**
- Webhook not configured correctly
- Webhook secret mismatch
- Database update failed

**Solution:**
- Check webhook logs in Stripe Dashboard
- Verify webhook endpoint is receiving events
- Check database for refund records

## Future Enhancements

1. **Customer Refund Requests**: Allow customers to request refunds
2. **Partial Refunds**: Support partial refund amounts
3. **Refund Notifications**: Automatic email notifications
4. **Refund Analytics**: Dashboard showing refund statistics
5. **Refund Policies**: Configurable refund policies per expert/product

## Migration

To enable refunds, run the migration:

```bash
supabase migration up 037_add_refund_fields
```

This adds refund status fields to `course_enrollments` and `appointments` tables.
