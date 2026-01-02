# Multi-Instance Architecture for TLP Agencies

## Overview

The Lost Project (TLP) now operates on a **multi-instance model** where each approved agency gets their own completely separate application instance with:

- **Separate Supabase Project** (isolated database)
- **Separate Vercel Deployment** (own domain URL)
- **Full Data Isolation** (agency can't see other agencies' data)
- **Automated Provisioning** (via admin approval)

## Architecture

### 1. Main Admin App (Current Instance)

This serves as the **central administration hub** for TLP:

- **Purpose**: Manage agency onboarding, approvals, and provisioning
- **URL**: `tlp-app.vercel.app` (or main domain)
- **Users**: Adwait (system admin) + TLP staff
- **Functions**:
  - View pending agency onboarding requests
  - Review agency details (name, website, contact)
  - Approve/reject agencies (triggers provisioning)
  - Monitor deployed instances

### 2. Per-Agency Instance

Each approved agency gets their own **complete app instance**:

- **Database**: Dedicated Supabase project (auto-created on approval)
- **Deployment**: Vercel deployment with own domain
  - Example: `agency-name.tlp.co` or `tlp-agency-name.vercel.app`
- **Users**: Agency owner + their team members
- **Data**: 100% isolated - no access to other agencies' data
- **Schema**: Same as main app (projects, clients, files, payments, etc.)

## Deployment Flow

### For Admins (Adwait)

1. **Login to main app** at `tlp-app.vercel.app`
2. **Navigate to Agency Onboarding Dashboard**
3. **Review pending requests** with agency details
4. **Click "Approve"** → Triggers automated provisioning:
   - ✅ Creates new Supabase project
   - ✅ Creates database schema (migrations run)
   - ✅ Deploys Next.js app to Vercel
   - ✅ Generates temporary admin password
   - ✅ Emails setup instructions to agency owner
5. **Done** - Agency owner receives login credentials

### For Agency Owners (New Instance)

1. **Receive email** with login URL and temporary password
2. **Visit unique instance URL** (e.g., `agency-name-tlp.vercel.app`)
3. **Login with temporary password**
4. **Complete setup**:
   - Create permanent password
   - Upload company logo
   - Invite team members
5. **Full app access** - Projects, clients, files, payments, analytics, chat, etc.

## Technical Architecture

### Environment Variables per Instance

Main admin app:

```
NEXT_PUBLIC_SUPABASE_URL=https://main-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Per-agency instance (auto-set during provisioning):

```
NEXT_PUBLIC_SUPABASE_URL=https://agency-project-12345.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
AGENCY_ID=agency-123  # For identifying which instance this is
AGENCY_NAME=My Agency
```

### Database Schema

All instances use **identical database schema**:

```
- users
- projects
- clients
- project_files
- invoices
- invoice_items
- payments
- vendors
- vendor_payments
- team_chat
- chat_messages
- comments
- project_comments
- notifications
- milestones
- project_team
```

**No agency_id columns** - each instance IS the agency, so no need to filter by agency.

### Code Base

- **Single Next.js codebase** deployed to multiple instances
- **Environment variables** determine which Supabase project to connect to
- **Zero multi-tenant logic** in dashboard (no filtering by agency_id)
- **Same features for all instances** (no Standard/Premium gating)

## Removed Multi-Tenant Code

The following multi-tenant complexity has been **removed**:

- ❌ `agency_id` columns in projects, clients, files, etc.
- ❌ `user_agencies` junction table
- ❌ `agencies` table (each instance is THE agency)
- ❌ `agency_admin` role (just use `admin` in each instance)
- ❌ Feature gating / entitlements system
- ❌ Agency logo/name display (TLP branding only)
- ❌ Agency filtering logic in all dashboard pages

## Kept Features

- ✅ Onboarding form (for agency initial setup)
- ✅ Logo upload capability (each agency adds their own logo per project)
- ✅ Approval workflow (Adwait approves agencies)
- ✅ Email invitations (temp password via Resend)
- ✅ Full feature set per instance (chat, payments, analytics, etc.)

## API Endpoints

### Admin App

- `GET /api/agency/requests` - List pending onboarding requests
- `POST /api/agency/approve` - Approve agency → triggers provisioning
- `POST /api/agency/reject` - Reject agency
- `GET /api/agency/instances` - List deployed instances

### Per-Agency Instance

- Standard app routes (no agency-specific endpoints)

## Provisioning Process (Implementation Plan)

### Trigger

Admin clicks "Approve" on onboarding request

### Step 1: Create Supabase Project

```
- Call Supabase Management API
- Create new project in agency's region (if allowed)
- Wait for project to be ready
```

### Step 2: Run Migrations

```
- Get Supabase credentials
- Connect and run all migrations
- Create schema and RLS policies
```

### Step 3: Create Admin User

```
- Generate 16-char temporary password
- Create user in new Supabase instance
- Set as admin role
```

### Step 4: Deploy to Vercel

```
- Create new Vercel project
- Set environment variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - AGENCY_ID
  - AGENCY_NAME
- Trigger deployment of Next.js codebase
- Wait for deployment to complete
- Generate unique domain (agency-name-tlp.vercel.app)
```

### Step 5: Send Welcome Email

```
- Compose email with:
  - Login URL
  - Admin email
  - Temporary password
  - Setup instructions
- Send via Resend service
- Store credentials in secure way
```

### Step 6: Mark as Deployed

```
- Update onboarding_request status to 'deployed'
- Store instance metadata:
  - Supabase project ID
  - Vercel project ID
  - Instance URL
  - Deployment date
```

## File Structure

```
/app
  /dashboard
    /agency-onboarding  ← For admin to manage requests
    ...other dashboards (no agency filtering)
  /api
    /agency
      /requests         ← GET pending requests
      /approve          ← POST to trigger provisioning
      /reject           ← POST to reject
      /instances        ← GET deployed instances

/lib
  /provisioning         ← NEW: Automation logic
    /supabase-cli.ts   ← Run migrations
    /vercel-api.ts     ← Deploy to Vercel
    /resend.ts         ← Send email
```

## Security Considerations

- ✅ Each instance has separate Supabase project (isolated DB)
- ✅ Each instance has separate Vercel deployment (isolated runtime)
- ✅ RLS policies enforce authentication within each instance
- ✅ No shared secrets between instances
- ✅ Admin credentials stored securely (hashed temp password)
- ✅ Provisioning API requires admin authentication

## Cost Model

- **Main Admin App**: ~$25/month
- **Per-Agency Instance**:
  - Supabase: ~$50-100/month (depending on usage)
  - Vercel: ~$20-50/month
  - **Total per agency**: ~$70-150/month

## Future Enhancements

1. **Custom Domains**: Let agencies use their own domain
2. **White-labeling**: Agency logo as primary brand
3. **Usage Analytics**: Track per-instance resource usage
4. **Backups**: Automated daily backups to agency S3 bucket
5. **Monitoring**: Health checks and uptime monitoring
6. **Scaling**: Read replicas for high-traffic instances
