# Phone Number Verification Setup Guide

## Overview

Phone number verification has been added as a required step for completing expert profiles. This uses Supabase Auth's SMS OTP (One-Time Password) functionality.

## Supabase Configuration Required

**IMPORTANT**: Phone verification requires an SMS provider to be configured in Supabase. Supabase does NOT provide SMS service by default - you must set up a third-party SMS provider.

### Supported SMS Providers

Supabase supports multiple SMS providers:
- **Twilio** (Recommended)
- **MessageBird**
- **Textlocal**
- **Vonage**

### Step 1: Choose and Set Up SMS Provider

#### Option A: Twilio (Recommended)

1. **Sign up for Twilio**: https://www.twilio.com
2. **Get your credentials**:
   - Account SID
   - Auth Token
   - Message Service SID (or Phone Number)

3. **Add to Supabase Environment Variables**:
   - Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Add these environment variables:
     ```
     SMS_TWILIO_ACCOUNT_SID=your_account_sid
     SMS_TWILIO_AUTH_TOKEN=your_auth_token
     SMS_TWILIO_MESSAGE_SERVICE_SID=your_message_service_sid
     ```

#### Option B: MessageBird

1. **Sign up for MessageBird**: https://www.messagebird.com
2. **Get your Access Key**
3. **Add to Supabase Environment Variables**:
   ```
   SMS_MESSAGEBIRD_ACCESS_KEY=your_access_key
   SMS_MESSAGEBIRD_ORIGINATOR=your_originator
   ```

### Step 2: Enable Phone Auth in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Phone** provider
3. **Enable** Phone authentication
4. Configure rate limits and OTP expiration (optional)

### Step 3: Run Database Migration

Run the migration file in Supabase SQL Editor:

**File:** `supabase/migrations/036_add_phone_verification.sql`

This adds:
- `phone_number` (TEXT) - Stores verified phone number
- `phone_verified` (BOOLEAN) - Verification status
- `phone_verification_code` (TEXT) - Temporary OTP code
- `phone_verification_expires_at` (TIMESTAMP) - Code expiration

### Step 4: Test Phone Verification

1. Go to Profile Setup page
2. Fill in expert profile details (category, bio, etc.)
3. Enter phone number in E.164 format (e.g., +1234567890)
4. Click "Send Code"
5. Check your phone for SMS code
6. Enter code and verify

## Phone Number Format

Phone numbers must be in **E.164 format**:
- Starts with `+`
- Country code + number
- Example: `+1234567890` (US), `+85212345678` (Hong Kong)

## How It Works

1. **User enters phone number** → Form validates E.164 format
2. **Click "Send Code"** → Supabase Auth sends SMS OTP via configured provider
3. **User receives SMS** → 6-digit code sent to phone
4. **User enters code** → Supabase Auth verifies code
5. **Verification successful** → `phone_verified` set to `true`, phone number saved
6. **Profile can be saved** → Expert profile completion requires phone verification

## Troubleshooting

### "Failed to send verification code"
- **Check**: SMS provider is configured in Supabase
- **Check**: Phone auth is enabled in Supabase Dashboard
- **Check**: Environment variables are set correctly
- **Check**: Phone number is in E.164 format

### "Invalid verification code"
- Code expires after 5 minutes (default)
- Code can only be used once
- Request a new code if expired

### SMS Not Received
- Check phone number format
- Verify SMS provider account has credits/balance
- Check SMS provider logs for delivery status
- Ensure phone number can receive SMS

## Cost Considerations

- **Twilio**: Pay-as-you-go pricing (~$0.0075 per SMS in US)
- **MessageBird**: Pay-as-you-go pricing (varies by country)
- Consider setting up rate limits to prevent abuse

## Alternative: Skip Phone Verification (Development Only)

If you want to test without SMS provider setup, you can temporarily:
1. Comment out phone verification requirement in `profile-setup-form.tsx`
2. Or set `phone_verified: true` manually in database for testing

**Note**: Phone verification is required for production expert profiles.
