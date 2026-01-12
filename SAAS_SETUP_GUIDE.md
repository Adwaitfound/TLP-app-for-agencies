# Multi-Tenant SaaS Setup Guide

## Overview

This document covers the implementation of multi-tenant support with payment integration via Razorpay.

## Step 1: Run Database Migrations

Execute the `saas_core_tables.sql` file in your Supabase SQL editor:

```bash
# Copy all SQL from /saas_core_tables.sql
# Paste into: https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql
```

This creates:

- ✅ `saas_organizations` - Tenant container
- ✅ `saas_organization_members` - User → Org mapping + roles
- ✅ `saas_magic_links` - One-time setup links
- ✅ `saas_organization_usage` - Usage tracking
- ✅ `saas_organization_payments` - Payment records
- ✅ All RLS policies for strict tenant isolation
- ✅ Utility functions (get_current_org_id, is_org_admin, etc.)

## Step 2: Environment Configuration

Add these variables to `.env.local`:

```env
# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email Configuration (for magic links)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# App URL (for magic link emails)
NEXT_PUBLIC_APP_URL=http://localhost:3001  # For development
# NEXT_PUBLIC_APP_URL=https://yourdomain.com  # For production
```

## Step 3: Get Razorpay Credentials

1. Go to https://dashboard.razorpay.com
2. Settings → API Keys
3. Copy your Key ID and Key Secret
4. Add to `.env.local`

## Step 4: Create Razorpay Webhook

1. In Razorpay Dashboard: Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/v2/payment/verify-webhook`
3. Select events:
   - `payment.authorized`
   - `payment.captured`
4. Copy webhook secret (if needed for additional verification)

## Step 5: Test Payment Flow (Free Tier First)

The free tier allows testing without payment:

```bash
# Navigate to http://localhost:3001/agency-onboarding
# Fill form with test agency details
# Select "Free" plan
# Submit - should create org immediately
```

## Step 6: Test Paid Payment Flow

Use Razorpay test credentials:

1. **Test Card**: 4111111111111111
2. **Expiry**: Any future date (e.g., 12/25)
3. **CVV**: Any 3 digits (e.g., 123)
4. **OTP**: 123456 (usually auto-fills in test mode)

Flow:

1. Go to `/agency-onboarding`
2. Fill form, select Standard or Premium
3. Click "Proceed to Payment"
4. Razorpay checkout opens
5. Enter test card details
6. Check email for magic link (or check logs if email not configured)
7. Click magic link, set password
8. Auto-redirects to `/app/v2/dashboard`

## File Structure

```
/app/v2/                          # Multi-tenant routes (all new)
  /setup                          # Magic link setup page
    page.tsx
  /dashboard                      # Main tenant dashboard
    page.tsx
  /members                        # Team member management
    page.tsx

/app/api/v2/                      # Multi-tenant APIs (all new)
  /payment/
    create-order/route.ts         # Create Razorpay order
    verify/route.ts               # Verify payment signature
    verify-webhook/route.ts       # Razorpay webhook handler
  /setup/
    verify-token/route.ts         # Verify magic link token
    complete/route.ts             # Complete setup (create user + org member)

/lib/razorpay.ts                  # Razorpay utilities

/saas_core_tables.sql             # Database migrations

/.env.local                       # Environment variables (not in git)
```

## API Endpoints

### 1. Create Payment Order

**POST** `/api/v2/payment/create-order`

Request:

```json
{
  "agencyName": "My Agency",
  "adminEmail": "admin@myagency.com",
  "plan": "standard",
  "billingCycle": "monthly"
}
```

Response:

```json
{
  "success": true,
  "order": {
    "id": "order_ABC123",
    "amount": 99900,
    "amountInRupees": 999,
    "currency": "INR",
    "keyId": "rzp_test_..."
  }
}
```

### 2. Razorpay Webhook

**POST** `/api/v2/payment/verify-webhook`

- Triggered by Razorpay when payment succeeds
- Verifies signature
- Creates organization
- Creates magic link
- Sends setup email

### 3. Verify Magic Link Token

**POST** `/api/v2/setup/verify-token`

Request:

```json
{
  "token": "hex_token_here"
}
```

Response:

```json
{
  "email": "admin@myagency.com",
  "orgName": "My Agency",
  "plan": "standard"
}
```

### 4. Complete Setup

**POST** `/api/v2/setup/complete`

Request:

```json
{
  "token": "hex_token_here",
  "email": "admin@myagency.com",
  "fullName": "John Doe",
  "password": "secure_password_123"
}
```

Response:

```json
{
  "success": true,
  "user_id": "uuid",
  "message": "Setup completed successfully"
}
```

## Database Schema Highlights

### saas_organizations

- `id` - Organization UUID
- `slug` - URL-friendly identifier
- `plan` - free, standard, or premium
- `status` - active, trial, suspended, cancelled
- `payment_status` - pending, completed, failed
- `razorpay_customer_id` - Razorpay customer link
- `razorpay_order_id` - Last order ID
- `subscription_ends_at` - When current subscription ends

### saas_organization_members

- `org_id` - Links to organization
- `user_id` - Links to auth.users
- `role` - admin, member, or client
- `status` - active, invited, suspended
- Unique constraint: One user per org

### saas_magic_links

- `token` - Random hex token
- `type` - signup, password_reset, admin_invite
- `expires_at` - Link expiration time
- `used_at` - When link was used
- `metadata` - Additional context (plan, etc.)

### saas_organization_payments

- `org_id` - Links to organization
- `plan_type` - Plan being paid for
- `amount` - Amount in rupees
- `razorpay_order_id` - Razorpay order ID (idempotency key)
- `razorpay_payment_id` - Razorpay payment ID
- `status` - pending, authorized, captured, failed, refunded

## RLS Policies (Database-Level Security)

All data access is controlled via Supabase RLS:

1. **Admins** can view all data for their organization
2. **Members** can view organization info and members
3. **Clients** can view their own data only
4. **Service role** can manage payments and magic links
5. Every query is automatically filtered by org_id at the DB level

**Key principle**: No data filtering on frontend - the database enforces it!

## Pricing Configuration

Plans are defined in `/lib/razorpay.ts`:

```typescript
const PLAN_PRICING = {
  standard: {
    monthlyPrice: 999, // ₹999/month
    yearlyPrice: 9990, // ₹9990/year (17% discount)
  },
  premium: {
    monthlyPrice: 2999, // ₹2999/month
    yearlyPrice: 29990, // ₹29990/year (17% discount)
  },
};
```

To change prices: Edit `PLAN_PRICING` in `/lib/razorpay.ts`

## Features by Plan

### Free (Forever)

- Dashboard & Projects
- 2 Team Members
- 2 Clients
- 5 GB Storage
- Basic support

### Standard (₹999/month)

- Everything in Free
- 5 Team Members
- 10 Clients
- 50 GB Storage
- Comments & Collaboration
- All project files

### Premium (₹2999/month)

- Everything in Standard
- 20 Team Members
- 100 Clients
- 500 GB Storage
- **Payments Module**
- **Vendors Module**
- **Invoices Module**
- Advanced Analytics

## Usage Tracking

The `saas_organization_usage` table tracks:

- Projects created
- Team members added
- Clients added
- Storage used
- API calls (for future rate limiting)

This data is automatically synced from the org and used for:

- Plan enforcement (blocking features on lower plans)
- Analytics dashboard
- Upgrade prompts

## Next Steps

After setup, you'll need:

1. **Create `/app/v2/dashboard`** - Main tenant dashboard
2. **Add org_id to existing tables** - users, clients, projects, etc.
3. **Create member invite flow** - Allow admins to add team members
4. **Add feature flags** - Restrict features based on plan
5. **Create team management UI** - Manage organization members
6. **Setup usage tracking jobs** - Sync usage metrics periodically

## Troubleshooting

### Magic link not received

- Check RESEND_API_KEY is configured
- Check email logs in Resend dashboard
- Check function logs in Supabase

### Payment not verified

- Verify Razorpay credentials in .env
- Check webhook signature verification in logs
- Ensure webhook is registered in Razorpay dashboard

### RLS policy errors

- Make sure user is in saas_organization_members with active status
- Check org_id is being filtered correctly
- Review RLS policies in saas_core_tables.sql

## Security Checklist

- ✅ All payments verified at backend (not frontend)
- ✅ RLS policies enforce org isolation
- ✅ Magic links are time-limited (24 hours)
- ✅ Webhook signatures verified
- ✅ Service role keys only used server-side
- ✅ Razorpay keys not exposed to frontend (except Key ID)
- ✅ User created in both auth.users and users table
- ✅ Organization member record created immediately after signup

## Rate Limiting & Quotas

Consider adding rate limiting to:

- `/api/v2/payment/create-order` - 10 req/min per IP
- `/api/v2/payment/verify-webhook` - Allow Razorpay IPs only
- `/api/v2/setup/*` - 5 req/min per email

See [Next.js Rate Limiting docs](https://nextjs.org/docs).

---

**Last Updated**: January 12, 2026
**Status**: Ready for Testing
