# Environment Variables Setup for Agency Provisioning

To enable agency provisioning, you need three tokens. Follow these steps:

## 1. SUPABASE_ACCESS_TOKEN

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name: `tlp-provisioning`
4. Copy the token (it will only show once!)
5. Add to `.env.local`:

```
SUPABASE_ACCESS_TOKEN=your_token_here
```

## 2. SUPABASE_ORG_ID

Already known from your projects! Your org ID is:

```
SUPABASE_ORG_ID=olechtdinstpnlwltkeu
```

This is already in the code, but you can verify at: https://supabase.com/dashboard/orgs

## 3. VERCEL_TOKEN

1. Go to: https://vercel.com/account/tokens
2. Create a new token:
   - Name: `tlp-provisioning`
   - Scope: Select your team/personal account
   - Access: Full Account
3. Copy the token
4. Add to `.env.local`:

```
VERCEL_TOKEN=your_token_here
```

## Update .env.local

Add these lines to `/Users/adwaitparchure/TLP-app for agnecies/.env.local`:

```bash
# Provisioning API Tokens
SUPABASE_ACCESS_TOKEN=your_supabase_token_here
SUPABASE_ORG_ID=olechtdinstpnlwltkeu
VERCEL_TOKEN=your_vercel_token_here
```

## Test Provisioning

Once you have all tokens, restart your dev server:

```bash
npm run dev
```

Then go to: http://localhost:3000/dashboard/agency-onboarding

1. Submit a new agency request
2. Click "Approve & Provision"
3. Watch the provisioning logs in the terminal

You should see:

```
🚀 Starting provisioning for: AgencyName
📦 Step 1/5: Creating new Supabase project...
   ✅ New project created: agency-xxxxx
📊 Step 2/5: Setting up schema and admin user...
   📊 Running migrations to set up schema...
   ✅ All 59 migrations completed
   👤 Creating admin user for admin@agency.com...
   ✅ Admin user created
   ✅ Admin role assigned with full permissions
☁️  Step 3/5: Cloning Vercel project...
   ✅ Vercel project cloned
🚀 Step 4/5: Waiting for deployment...
   ✅ Instance ready at: https://agency-xxxxx.vercel.app
📧 Step 5/5: Sending welcome email...
   ✅ Welcome email sent
✅ Provisioning complete for: AgencyName
```

## What Happens During Provisioning

1. **New Supabase Project** - Creates isolated database
2. **Run Migrations** - Sets up schema (59 migrations, same as template)
3. **Create Admin User** - New agency admin can log in
4. **New Vercel Project** - Separate deployment with custom domain support
5. **Send Email** - Welcome email with credentials

## Troubleshooting

### "SUPABASE_ACCESS_TOKEN not configured"

- Token is missing or empty in `.env.local`
- Make sure to restart `npm run dev` after adding it

### "Invalid API key"

- Token has expired or been revoked
- Generate a new one from https://supabase.com/dashboard/account/tokens

### "Failed to create Supabase project"

- Check if org ID is correct: `olechtdinstpnlwltkeu`
- Verify you have create project permissions in Supabase

### "Timeout waiting for project to be ready"

- Supabase is taking longer than 5 minutes
- Wait a bit and try again, or check project status in Supabase dashboard

## Questions?

The provisioning code is in: `lib/provisioning/template-provisioning.ts`
