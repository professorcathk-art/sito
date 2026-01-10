# Phone Number Field Setup Guide

## Overview

Phone number has been added as a **required field** for completing expert profiles. No verification is needed - experts simply provide their phone number when setting up their profile.

### Step 1: Run Database Migration

Run the migration file in Supabase SQL Editor:

**File:** `supabase/migrations/036_add_phone_verification.sql`

This adds:
- `phone_number` (TEXT) - Stores expert phone number (required for expert profiles)

### Step 2: Test Phone Number Field

1. Go to Profile Setup page
2. Fill in expert profile details (category, bio, etc.)
3. Enter phone number in E.164 format (e.g., +85212345678)
4. Save profile - phone number is required to complete expert profile

## Phone Number Format

Phone numbers must be in **E.164 format**:
- Starts with `+`
- Country code + number
- Example: `+1234567890` (US), `+85212345678` (Hong Kong)

## How It Works

1. **User fills expert profile** → Category, bio, location, languages, etc.
2. **Phone number field appears** → Required when category and bio are filled
3. **User enters phone number** → In E.164 format (e.g., +85212345678)
4. **Profile can be saved** → Phone number is validated and saved with profile

## Validation

- Phone number is **required** when completing an expert profile (when category and bio are filled)
- Phone number format: E.164 format recommended (starts with `+` and country code)
- Example formats:
  - Hong Kong: `+85212345678`
  - US: `+1234567890`
  - UK: `+441234567890`

## Troubleshooting

### "Phone number is required"
- Ensure you've filled in Category and Bio fields first
- Phone number field only appears for expert profiles
- Phone number must not be empty

### Phone Number Format
- Recommended: E.164 format (starts with `+`)
- Example: `+85212345678` for Hong Kong
- The field accepts any text, but E.164 format is recommended for consistency
