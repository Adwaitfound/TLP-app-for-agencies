# Quick Start Guide - Multi-Tenant SaaS Setup

## ⚡ 5-Minute Setup

### 1. Run SQL Migration (1 minute)

```sql
-- Copy entire saas_core_tables.sql
-- Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT]/sql
-- Paste → Run
```

### 2. Add Environment Variables (1 minute)

```bash
# .env.local
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
RESEND_API_KEY=your_resend_key_here (optional)
RESEND_FROM_EMAIL=onboarding@yourdomain.com (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Get Razorpay Keys (2 minutes)

1. Go to https://dashboard.razorpay.com
2. Settings → API Keys
3. Copy Key ID and Key Secret
4. Add to `.env.local`

### 4. Test It (1 minute)

```bash
# Start dev server
npm run dev

# Navigate to
http://localhost:3001/agency-onboarding

# Select "Free" plan
# Submit form
# Check if org is created in Supabase
```

---

## 🎯 What You Can Do Now

### ✅ Already Working

- [x] **Free tier signup** - Instant org creation
- [x] **Paid tier setup** - Razorpay payment flow (with test cards)
- [x] **Magic links** - Secure password setup
- [x] **Organization isolation** - Each org sees only their data
- [x] **Role-based access** - Admin/Member/Client roles
- [x] **Dashboard** - Multi-tenant dashboard

### 🚀 Free Tier Test (No Payment)

```
1. http://localhost:3001/agency-onboarding
2. Agency Name: "Test Agency"
3. Admin Email: "test@example.com"
4. Select "Free" plan
5. Submit
6. ✅ Org created instantly
7. Go to http://localhost:3001/agency/login
8. Create account with same email
9. Access dashboard
```

### 💳 Paid Tier Test (Razorpay Test Mode)

```
1. http://localhost:3001/agency-onboarding
2. Fill form
3. Select "Standard" or "Premium"
4. Click "Proceed to Payment"
5. Razorpay checkout opens
6. Test Card: 4111111111111111
7. Expiry: 12/25
8. CVV: 123
9. OTP: 123456
10. ✅ Payment successful
11. Check email for magic link (or logs)
12. Click link → Set password → Dashboard
```

---

## 📁 Key Files Created

| File                             | Purpose                        |
| -------------------------------- | ------------------------------ |
| `saas_core_tables.sql`           | Database schema + RLS policies |
| `lib/razorpay.ts`                | Razorpay utilities             |
| `lib/org-context.tsx`            | Multi-tenant context provider  |
| `app/v2/layout.tsx`              | V2 layout with org context     |
| `app/v2/setup/page.tsx`          | Magic link setup page          |
| `app/v2/dashboard/page.tsx`      | Multi-tenant dashboard         |
| `app/api/v2/payment/*`           | Payment APIs                   |
| `app/api/v2/setup/*`             | Setup APIs                     |
| `SAAS_SETUP_GUIDE.md`            | Detailed setup instructions    |
| `SAAS_IMPLEMENTATION_SUMMARY.md` | Architecture overview          |
| `IMPLEMENTATION_CHECKLIST.md`    | Testing & deployment checklist |

---

## 🔑 Environment Variables

Get these from their respective services:

```env
# Razorpay (https://dashboard.razorpay.com/settings/api-keys)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXX
RAZORPAY_KEY_SECRET=your_secret_key

# Email (https://resend.com)
RESEND_API_KEY=re_XXXXX
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Your app
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│  User Agency Onboarding                 │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼────────┐
        │ Free or Paid? │
        └──┬────────┬───┘
    Free   │        │   Paid
           │        │
           ▼        ▼
    [Instant]  [Razorpay]
        │        Checkout
        │        Payment
        │        Webhook
        │        │
        └────┬───┘
             │
      ┌──────▼──────────┐
      │  Create Org     │
      │  + Magic Link   │
      │  + Send Email   │
      └────────┬────────┘
               │
      ┌────────▼──────────┐
      │ Admin Sets        │
      │ Password via      │
      │ Magic Link        │
      └────────┬──────────┘
               │
      ┌────────▼──────────────┐
      │ Dashboard Access      │
      │ with Tenant Data      │
      │ Only!                 │
      └───────────────────────┘
```

---

## 🔒 Security Highlights

- **Database-level isolation** - RLS policies enforce org separation
- **Signature verification** - All payments verified
- **One-time magic links** - 24-hour expiration
- **No exposed secrets** - Keys never sent to frontend
- **Audit trail** - All payments logged

---

## 📊 Pricing Configuration

Edit `/lib/razorpay.ts` to change prices:

```typescript
const PLAN_PRICING = {
  standard: {
    monthlyPrice: 999, // ₹999/month
    yearlyPrice: 9990, // ₹9990/year
    yearlyDiscount: 17,
  },
  premium: {
    monthlyPrice: 2999, // ₹2999/month
    yearlyPrice: 29990, // ₹29990/year
    yearlyDiscount: 17,
  },
};
```

---

## 🐛 Troubleshooting

### Magic link not received?

- Check `RESEND_API_KEY` is set (optional, for email)
- Check browser console for errors
- Check Supabase logs

### Payment not working?

- Verify `RAZORPAY_KEY_ID` is set correctly
- Use test card: `4111111111111111`
- Check Razorpay dashboard for test payments

### Dashboard won't load?

- Make sure you created org member record
- Check RLS policies in Supabase
- Verify user is in `saas_organization_members`

### Org context errors?

- Ensure user is authenticated
- Check org membership status is 'active'
- Review org-context.tsx error messages

---

## ✅ Testing Checklist (5 min)

- [ ] Free tier signup works
- [ ] Dashboard loads after free signup
- [ ] Paid tier shows payment form
- [ ] Magic link setup page loads
- [ ] Login works after setup
- [ ] Logout works
- [ ] Different users see different orgs
- [ ] Admin sees admin features

---

## 📚 Documentation

For more details, see:

- **Setup**: `SAAS_SETUP_GUIDE.md`
- **Architecture**: `SAAS_IMPLEMENTATION_SUMMARY.md`
- **Deployment**: `IMPLEMENTATION_CHECKLIST.md`

---

## 🎉 You're Ready!

Everything is set up for multi-tenant SaaS!

**Next steps:**

1. Run the SQL migration ✅
2. Set environment variables ✅
3. Test free tier ✅
4. Test paid tier (optional) ✅
5. Deploy to production 🚀

Questions? Check the troubleshooting section or review the detailed guides.

Happy building! 🚀
