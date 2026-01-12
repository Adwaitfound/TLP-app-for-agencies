# 🚀 SETUP IN PROGRESS - Step-by-Step Instructions

## ✅ Step 1: Environment Variables (COMPLETED)

Your `.env.local` file has been updated with:

- ✅ Supabase URL and keys (already configured)
- ✅ Resend API key (already configured)
- ⚠️ **ACTION REQUIRED**: Add your Razorpay keys

### Get Razorpay Keys (Test Mode)

1. **Open Razorpay Dashboard**

   - Go to: https://dashboard.razorpay.com
   - Sign in to your account

2. **Navigate to API Keys** (Updated Path)

   **Option A - If you see the sidebar:**

   - Click **Account & Settings** (gear icon in left sidebar)
   - Click **API Keys** (under Website and app settings)

   **Option B - Direct link:**

   - Go directly to: https://dashboard.razorpay.com/app/keys

   **Option C - Top menu:**

   - Look for **Settings** in the top navigation bar
   - Select **API Keys** from dropdown

3. **Get Your Test Keys**

   - You'll see **Mode: Test** toggle at the top (make sure it's ON/Test mode)
   - Under "API Keys" section, you should see:

     - **Key ID**: Visible (starts with `rzp_test_...`) - Click to copy
     - **Key Secret**: Hidden - Click **Regenerate & Download** to reveal

   - **IMPORTANT**:
     - If you don't see any keys, click **Generate Key** button
     - The secret is shown only ONCE, so save it immediately
     - You can always regenerate if you lose it

4. **Update .env.local**
   - Open `/TLP-app for agnecies/.env.local`
   - Replace `your_razorpay_key_id_here` with your Key ID
   - Replace `your_razorpay_key_secret_here` with your Key Secret
   - Save the file

Example:

```bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_abc123xyz456
RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE_KEEP_PRIVATE
```

---

## 📊 Step 2: Run SQL Migration in Supabase

### Instructions:

1. **Open Supabase SQL Editor**

   - Go to: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql
   - (Already logged in with your project)

2. **Copy SQL Migration**

   - Open file: `/TLP-app for agnecies/saas_core_tables.sql`
   - Select ALL content (Cmd+A on Mac)
   - Copy (Cmd+C)

3. **Execute Migration**

   - Paste into Supabase SQL editor
   - Click **Run** button (bottom right)
   - Wait for "Success. No rows returned" message

4. **Verify Tables Created**
   Run this query to verify:

   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'saas_%'
   ORDER BY table_name;
   ```

   You should see 5 tables:

   - saas_organizations
   - saas_organization_members
   - saas_organization_payments
   - saas_organization_usage
   - saas_magic_links

5. **Check RLS Policies**

   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename LIKE 'saas_%'
   ORDER BY tablename;
   ```

   You should see 10+ RLS policies.

---

## 🧪 Step 3: Test Free Tier Signup

### Instructions:

1. **Start Development Server**

   ```bash
   cd "/Users/adwaitparchure/TLP-app for agnecies"
   npm run dev
   ```

2. **Open Onboarding Page**

   - Navigate to: http://localhost:3001/agency-onboarding
   - (Or use page-v2.tsx if you renamed it)

3. **Fill Form**

   - **Agency Name**: Test Agency
   - **Admin Email**: test@example.com
   - **Admin Name**: Test Admin
   - **Website**: https://testagency.com
   - **Plan**: Select **Free**
   - **Logo**: Optional
   - Click **Submit**

4. **Verify Organization Created**

   - Go to Supabase Dashboard → Table Editor
   - Open `saas_organizations` table
   - You should see your test organization with:
     - name = "Test Agency"
     - plan = "free"
     - status = "active"

5. **Check Magic Link Created**
   - Open `saas_magic_links` table
   - You should see a link with:
     - email = "test@example.com"
     - type = "signup"
     - org_id = (matches organization id)

---

## 💳 Step 4: Test Paid Tier (Optional)

### Test with Razorpay Test Card

1. **Submit Paid Plan**

   - Go to: http://localhost:3001/agency-onboarding
   - Fill form, select **Standard** or **Premium**
   - Choose **Monthly** or **Yearly**
   - Click **Proceed to Payment**

2. **Razorpay Checkout**

   - Use test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits (e.g., `123`)
   - Expiry: Any future date (e.g., `12/25`)
   - Name: Any name
   - Click **Pay**

3. **Verify Payment**

   - Check `saas_organization_payments` table
   - Status should be "captured"
   - Organization should be auto-created

4. **Check Webhook**
   - Terminal should show webhook received
   - Magic link should be sent to email

---

## 🔗 Step 5: Test Magic Link Setup

### Setup Password Flow

1. **Get Magic Link**

   - Check your email (if Resend configured)
   - OR check terminal logs for magic link URL
   - Format: `http://localhost:3001/v2/setup?token=...`

2. **Open Setup Page**

   - Click magic link or paste URL in browser
   - You should see "Welcome to [Organization Name]"

3. **Set Password**

   - Enter your full name
   - Create a password
   - Click **Complete Setup**

4. **Verify Redirect**

   - Should auto-redirect to `/v2/dashboard`
   - Should see organization dashboard
   - Should see your name and org details

5. **Test Dashboard**
   - Check navigation menu
   - Verify features based on plan
   - Try logout

---

## ✅ Checklist

### Prerequisites

- [ ] Razorpay keys added to `.env.local`
- [ ] SQL migration executed in Supabase
- [ ] 5 tables created (verified)
- [ ] RLS policies active (verified)

### Free Tier Test

- [ ] Form submission works
- [ ] Organization created in database
- [ ] Magic link generated
- [ ] Email sent (if Resend configured)

### Paid Tier Test (Optional)

- [ ] Payment form appears
- [ ] Razorpay checkout opens
- [ ] Test payment succeeds
- [ ] Webhook processes payment
- [ ] Organization auto-created
- [ ] Magic link sent

### Magic Link Test

- [ ] Token verification works
- [ ] Setup page shows org details
- [ ] Password creation works
- [ ] User account created
- [ ] Auto-login successful
- [ ] Dashboard loads

### Dashboard Test

- [ ] Organization name displays
- [ ] Plan shows correctly
- [ ] Stats show (even if 0)
- [ ] Navigation based on role
- [ ] Feature availability correct
- [ ] Logout works

---

## 🐛 Troubleshooting

### Error: "Table does not exist"

- Run SQL migration in Supabase
- Verify tables exist in Table Editor

### Error: "RLS policy violation"

- Check user is in `saas_organization_members` table
- Verify `status = 'active'`
- Check `org_id` matches organization

### Payment doesn't work

- Verify Razorpay keys in `.env.local`
- Check using TEST keys (start with `rzp_test_`)
- Check browser console for errors
- Verify webhook endpoint accessible

### Magic link doesn't work

- Check `saas_magic_links` table
- Verify token not expired (24 hours)
- Verify token not used (`used_at` is NULL)
- Check token matches URL parameter

### Dashboard won't load

- Check `useOrg()` hook initialization
- Verify user has active membership
- Check browser console for errors
- Verify OrgProvider wraps /v2/layout

---

## 📞 Next Steps After Testing

Once all tests pass:

1. **Update Razorpay Webhook URL**

   - Go to Razorpay Dashboard → Webhooks
   - Add: `https://yourdomain.com/api/v2/payment/verify-webhook`
   - Enable events: `payment.authorized`, `payment.captured`

2. **Configure Production Keys**

   - Switch from TEST keys to LIVE keys
   - Update `.env.local` or deployment environment

3. **Deploy to Production**

   - Follow deployment checklist in `IMPLEMENTATION_CHECKLIST.md`
   - Run SQL migration on production database
   - Set environment variables in hosting platform

4. **Test Production Flow**
   - Real payment with real card
   - Real email delivery
   - Real magic link flow

---

## 🎉 You're Ready!

Once you complete these steps, your multi-tenant SaaS is live!

**Current Status**: Waiting for Razorpay keys + SQL migration

**Time Estimate**: 10-15 minutes total

**Need Help?** Check:

- `QUICK_START.md` for quick reference
- `SAAS_SETUP_GUIDE.md` for detailed docs
- `IMPLEMENTATION_CHECKLIST.md` for testing guide
