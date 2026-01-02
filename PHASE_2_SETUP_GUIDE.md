# Phase 2 Setup Guide

## 🎯 Quick Start

Phase 2 provisioning automation is now **ready to configure**. Follow these steps to enable automatic agency instance provisioning.

---

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ Completed Phase 1 (code cleanup)
- ✅ Access to Supabase account (https://app.supabase.com)
- ✅ Access to Vercel account (https://vercel.com)
- ✅ GitHub repository with your codebase
- ✅ Resend account for emails (or SMTP credentials)

---

## 🔑 Step 1: Get API Tokens

### 1.1 Supabase Management Token

1. Go to https://app.supabase.com/account/tokens
2. Click "Generate new token"
3. Name it: "TLP Multi-Instance Provisioning"
4. Copy the token (starts with `sbp_...`)
5. Save it as `SUPABASE_ACCESS_TOKEN`

### 1.2 Supabase Organization ID

1. Go to https://app.supabase.com
2. Click on your organization name
3. Go to "Settings" → "General"
4. Copy the "Organization ID"
5. Save it as `SUPABASE_ORG_ID`

### 1.3 Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: "TLP Multi-Instance Deployment"
4. Scope: Full Account or specific team
5. Copy the token (starts with `vercel_...`)
6. Save it as `VERCEL_TOKEN`

### 1.4 Vercel Team ID (if using team)

1. Go to https://vercel.com/teams/[your-team]/settings
2. Copy the Team ID from the URL or settings page
3. Save it as `VERCEL_TEAM_ID`

---

## ⚙️ Step 2: Configure Environment Variables

Add these to your `.env.local`:

```bash
# Phase 2: Multi-Instance Provisioning
SUPABASE_ACCESS_TOKEN=sbp_your_token_here
SUPABASE_ORG_ID=your_org_id_here
VERCEL_TOKEN=vercel_your_token_here
VERCEL_TEAM_ID=team_your_team_id_here  # Optional

# GitHub Repository (for Vercel deployments)
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=tlp-app

# Existing (keep these from .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@yourdomain.com
```

---

## 🚀 Step 3: Test the System

### 3.1 Local Development Test

```bash
# Start the development server
npm run dev

# In another terminal, test the approval flow
curl -X POST http://localhost:3000/api/admin/agency-onboarding/approve \
  -H "Content-Type: application/json" \
  -H "x-user-email: adwait@thelostproject.in" \
  -d '{"requestId": "test-request-id"}'
```

### 3.2 Create a Test Onboarding Request

1. Go to your onboarding form
2. Submit a test request with a real email
3. Go to `/dashboard/agency-onboarding`
4. Click "Approve & Provision"
5. Watch the real-time progress

### 3.3 Monitor Progress

The UI will show:

- ⏳ **Provisioning...** - Creating Supabase project
- 📊 **Database setup** - Running migrations
- ☁️ **Deploying** - Creating Vercel project
- ✅ **Deployed** - Instance URL shown
- ❌ **Failed** - Error message displayed

---

## 📊 Step 4: What Happens During Provisioning

When you click "Approve & Provision", the system:

### Phase 1: Supabase Project (2-5 minutes)

```
Creating Supabase project: tlp-agency-name
✓ Project created: abc123xyz
✓ Waiting for project to be ready...
✓ Status: ACTIVE_HEALTHY
```

### Phase 2: Database Setup (30-60 seconds)

```
Running database migrations...
  ✓ 20251231120000_agencies_and_memberships.sql
  ✓ 20251231123000_agency_scoping.sql
  (... all migration files)
✓ All migrations completed

Creating initial admin user: admin@agency.com
✓ Admin user created: user-id-here

Seeding initial data...
✓ Initial data seeded
```

### Phase 3: Vercel Project (1-2 minutes)

```
Creating Vercel project: tlp-agency-name
✓ Vercel project created: prj_abc123

Setting environment variables...
  ✓ Set NEXT_PUBLIC_SUPABASE_URL
  ✓ Set NEXT_PUBLIC_SUPABASE_ANON_KEY
  ✓ Set SUPABASE_SERVICE_ROLE_KEY
  ✓ Set AGENCY_NAME
✓ Environment variables configured
```

### Phase 4: Deployment (5-10 minutes)

```
Triggering deployment...
✓ Deployment triggered: dpl_abc123

Waiting for deployment to complete...
  Status: BUILDING, waiting 5000ms...
  Status: BUILDING, waiting 5000ms...
  Status: READY
✓ Deployment ready: https://tlp-agency-name.vercel.app
```

### Phase 5: Welcome Email (5 seconds)

```
Sending welcome email to admin@agency.com
✓ Welcome email sent: email-id-here
```

**Total Time: 8-18 minutes** ⏱️

---

## 🔍 Step 5: Verify Deployment

After provisioning completes:

1. **Check Supabase Dashboard**

   - Go to https://app.supabase.com
   - Find the new project: `tlp-agency-name`
   - Verify tables exist
   - Check that admin user was created

2. **Check Vercel Dashboard**

   - Go to https://vercel.com
   - Find the new project: `tlp-agency-name`
   - Verify deployment status is "Ready"
   - Check environment variables are set

3. **Test the Instance**

   - Open the instance URL (e.g., https://tlp-agency-name.vercel.app)
   - Try logging in with the credentials from the email
   - Verify all dashboard pages work
   - Create a test project

4. **Check Email**
   - Verify welcome email was received
   - Check credentials are correct
   - Test password reset if needed

---

## ❌ Troubleshooting

### Problem: "SUPABASE_ACCESS_TOKEN not configured"

**Solution:**

```bash
# Add to .env.local
SUPABASE_ACCESS_TOKEN=sbp_your_actual_token
```

### Problem: "Failed to create Supabase project: 401"

**Solution:**

- Token might be expired or invalid
- Generate a new token from https://app.supabase.com/account/tokens
- Update `.env.local`

### Problem: "Failed to create Vercel project: 403"

**Solution:**

- Check VERCEL_TOKEN permissions
- If using a team, make sure VERCEL_TEAM_ID is correct
- Regenerate token with full permissions

### Problem: Deployment stuck at "BUILDING"

**Solution:**

- Check Vercel deployment logs
- Verify all environment variables are set
- Check for build errors in the codebase

### Problem: Welcome email not sent

**Solution:**

- Check RESEND_API_KEY is valid
- Verify RESEND_FROM_EMAIL is authorized
- Check Resend dashboard for send logs

### Problem: "Failed to run migrations"

**Solution:**

- Check that migration files exist in `supabase/migrations/`
- Verify SQL syntax is valid
- Check Supabase project logs for errors

---

## 🎛️ Advanced Configuration

### Custom Region for Supabase

Edit `lib/provisioning/supabase-mgmt.ts`:

```typescript
const supabaseProject = await createSupabaseProject(
  request.agencyName,
  "us-west-1" // Change region here
);
```

Available regions: `us-east-1`, `us-west-1`, `eu-west-1`, `ap-southeast-1`

### Custom Vercel Git Branch

Edit `lib/provisioning/vercel-mgmt.ts`:

```typescript
const deployment = await triggerDeployment(
  vercelProject.id,
  "production" // Change branch here
);
```

### Disable Email Notifications

Set in `.env.local`:

```bash
# Leave empty to disable
RESEND_API_KEY=
```

Provisioning will still work, but no welcome email will be sent.

---

## 📈 Next Steps

After Phase 2 is working:

1. **Monitor Usage**

   - Track number of instances created
   - Monitor Supabase/Vercel costs
   - Set up alerts for failures

2. **Instance Management** (Phase 3)

   - Dashboard to list all instances
   - Pause/resume instances
   - Delete instances
   - Update configurations

3. **Custom Domains**

   - Allow agencies to use their own domain
   - Automatic SSL setup
   - DNS configuration guide

4. **Backup & Recovery**
   - Automated backups for each instance
   - Point-in-time recovery
   - Data export tools

---

## 🆘 Support

If you encounter issues:

1. Check console logs: `npm run dev`
2. Check Vercel deployment logs
3. Check Supabase project logs
4. Review this guide's troubleshooting section

---

## ✅ Success Criteria

You'll know Phase 2 is working when:

- ✅ Click "Approve & Provision" button
- ✅ See real-time progress updates in UI
- ✅ New Supabase project appears in dashboard
- ✅ New Vercel project appears in dashboard
- ✅ Instance URL is accessible
- ✅ Can log in with emailed credentials
- ✅ All dashboard features work
- ✅ No cross-agency data visible

**Congratulations! Your multi-instance provisioning is complete! 🎉**
