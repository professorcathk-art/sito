# Guest Checkout Flow – Health Check

Post-checkout flow for guests: **checkout → sign up/sign in → access course or appointment**.

## Journey Map

```
[Guest pays] → Success page → verify-payment
                    ↓
            needsSignUp? → /access-purchase?email=...&type=course|appointment
                    ↓
            ┌───────┴───────┐
            │               │
     [Has account]    [No account]
            │               │
     Sign In link    Create account form
            │               │
     /login → /complete-purchase    signUp → fulfill → redirect
            │               │
     fulfill → redirect     fulfill → redirect
            │               │
            └───────┬───────┘
                    ↓
     /courses/manage  OR  /appointments/manage?tab=my-bookings
```

## Entry Points

| Source | Redirect to |
|--------|-------------|
| Stripe success (guest course) | `/access-purchase?email=...&type=course` |
| Stripe success (guest appointment) | `/access-purchase?email=...&type=appointment` |
| Free course guest enrollment | `/access-purchase?email=...&type=course` |
| Paid course guest (STRIPE_SETUP_INCOMPLETE) | `/access-purchase?email=...&type=course` |

## Verification Checklist

### 1. Success Page (`app/stripe/success/page.tsx`)
- [ ] Calls `verify-payment` with `session_id`
- [ ] On `needsSignUp` + `email`: redirects to `/access-purchase?email=...&type=course|appointment`
- [ ] On logged-in user: redirects to `/courses/manage` or `/appointments/manage`

### 2. Access Purchase Page (`app/access-purchase/page.tsx`)
- [ ] Requires `email` in URL; redirects to `/` if missing
- [ ] Calls `/api/check-email?email=...` to detect existing account
- [ ] **Has account**: shows "Sign In" → `/login?redirect=/complete-purchase?dest=...&email=...`
- [ ] **No account**: shows create account form (name, password, confirm)
- [ ] Create account: `signUp` → profile upsert (handles trigger race) → fulfill → redirect
- [ ] Redirect destination: courses or appointments based on `type`

### 3. Complete Purchase Page (`app/complete-purchase/page.tsx`)
- [ ] Requires auth (fulfill returns 401 if not logged in)
- [ ] Calls `POST /api/fulfill-pending-purchases`
- [ ] On success: redirects to `dest` param
- [ ] On error: shows message + link to dest

### 4. APIs

**`GET /api/check-email?email=...`**
- [ ] Returns `{ exists: boolean }`
- [ ] Uses case-insensitive match (`.ilike`)

**`POST /api/fulfill-pending-purchases`**
- [ ] Requires auth
- [ ] Matches pending by user email (case-insensitive)
- [ ] Creates `course_enrollments` from `pending_course_enrollments`
- [ ] Creates `appointments` from `pending_appointments`
- [ ] Deletes pending rows after fulfillment
- [ ] Returns `{ success, fulfilled: { courses, appointments } }`

### 5. Edge Cases Fixed

| Issue | Fix |
|-------|-----|
| Profile insert fails (trigger already created) | Use `upsert` with `onConflict: "id"` |
| Email case mismatch (User@x.com vs user@x.com) | Use `.ilike()` in check-email and fulfill |
| Google OAuth from register with fromPayment | Redirect to `/complete-purchase` instead of `/onboarding` |

### 6. Login Flow
- [ ] Login page accepts `email` param for prefilling
- [ ] `redirect` param supports `/complete-purchase?dest=...`
- [ ] After login: redirect → complete-purchase → fulfill → final dest

## Manual Test Scenarios

1. **New user, course purchase**
   - Guest pays for course → access-purchase → create account → see course in classroom

2. **Existing user, course purchase (email + password)**
   - Guest pays for course → access-purchase → sign in → see course in classroom

3. **Existing user, course purchase (Google Sign In)**
   - Guest pays for course → access-purchase → Sign In → Google OAuth → complete-purchase → fulfill → see course in classroom

4. **New user, appointment purchase**
   - Guest pays for appointment → access-purchase → create account → see booking in My Bookings

5. **Free course guest**
   - Guest enrolls in free course → access-purchase → create account → see course in classroom

6. **Booking modal – logged-in user**
   - User with account selects slot → Proceed to Payment → should NOT see "create account" (expert without Stripe: confirm dialog)

7. **Booking modal – guest, state preserved**
   - Guest selects slot → Proceed to Payment → redirect to login (not register) → sign in → return with slot/form restored

8. **Register – existing email**
   - User enters email that has account → "Sign in instead" shown → prevented from signing up

9. **Email confirmation**
   - If Supabase requires email confirmation, user may need to confirm before fulfill runs. Consider testing with confirmation disabled for dev.
