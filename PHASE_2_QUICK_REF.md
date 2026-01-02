# Phase 2 Quick Reference Card

## 🚀 TL;DR

Phase 2 adds **automatic provisioning**: Click "Approve & Provision" → 8-18 minutes → Agency gets their own instance.

---

## 📁 File Structure

```
lib/provisioning/
├── orchestrator.ts        # Main coordinator
├── supabase-mgmt.ts      # Create Supabase projects
├── vercel-mgmt.ts        # Deploy to Vercel
├── database-setup.ts     # Run migrations
└── email-service.ts      # Send welcome emails

app/api/admin/agency-onboarding/
├── approve/route.ts      # Trigger provisioning
└── status/route.ts       # Poll progress

app/dashboard/
└── agency-onboarding/page.tsx  # UI with real-time progress
```

---

## ⚙️ Environment Variables

```bash
# Get these tokens first:
SUPABASE_ACCESS_TOKEN=sbp_xxx       # app.supabase.com/account/tokens
SUPABASE_ORG_ID=xxx                 # org settings
VERCEL_TOKEN=vercel_xxx             # vercel.com/account/tokens
VERCEL_TEAM_ID=team_xxx             # optional
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=tlp-app
```

---

## 🎯 Provisioning Flow

```
Click "Approve & Provision"
  ↓
1. Create Supabase project (2-5 min)
  ↓
2. Run migrations & create admin user (30-60 sec)
  ↓
3. Create Vercel project (1-2 min)
  ↓
4. Deploy app (5-10 min)
  ↓
5. Send welcome email (5 sec)
  ↓
✅ Done! (8-18 min total)
```

---

## 🔧 Quick Test

```bash
# 1. Add tokens to .env.local
# 2. Start dev server
npm run dev

# 3. Create test request via onboarding form
# 4. Go to /dashboard/agency-onboarding
# 5. Click "Approve & Provision"
# 6. Watch real-time progress
```

---

## 📊 What Each Service Does

| Service             | Purpose                           | Time      |
| ------------------- | --------------------------------- | --------- |
| `supabase-mgmt.ts`  | Creates new Supabase project      | 2-5 min   |
| `database-setup.ts` | Runs migrations, creates admin    | 30-60 sec |
| `vercel-mgmt.ts`    | Creates Vercel project + env vars | 1-2 min   |
| `vercel-mgmt.ts`    | Deploys app from GitHub           | 5-10 min  |
| `email-service.ts`  | Sends welcome email               | 5 sec     |
| `orchestrator.ts`   | Coordinates everything above      | N/A       |

---

## ✅ Success Checklist

After provisioning:

- [ ] New Supabase project in dashboard
- [ ] New Vercel deployment in dashboard
- [ ] Welcome email received
- [ ] Instance URL accessible
- [ ] Can log in with credentials
- [ ] Dashboard works without errors

---

## ❌ Common Errors

| Error                                  | Fix                                |
| -------------------------------------- | ---------------------------------- |
| "SUPABASE_ACCESS_TOKEN not configured" | Add token to `.env.local`          |
| "Failed to create project: 401"        | Token expired, generate new one    |
| "Failed to create project: 403"        | Token needs full permissions       |
| Deployment stuck                       | Check Vercel logs for build errors |
| Email not sent                         | Check RESEND_API_KEY               |

---

## 📖 Full Documentation

- **Setup Guide**: `PHASE_2_SETUP_GUIDE.md` (380 lines)
- **Complete Summary**: `PHASE_2_COMPLETE.md` (this file)
- **Implementation Plan**: `NEXT_STEPS_IMPLEMENTATION.md`
- **Environment Template**: `.env.example`

---

## 🎨 UI States

```
Pending    → [Approve & Provision] button
Provisioning → ⏳ Provisioning... (step details)
Approved   → ✅ Deployed (instance URL)
Failed     → ❌ Failed (error message)
```

---

## 🔑 Key Functions

```typescript
// Orchestrator - main entry point
provisionAgency(request: ProvisioningRequest): Promise<ProvisioningResult>

// Create Supabase project
createSupabaseProject(agencyName: string): Promise<CreateProjectResponse>

// Setup database
setupDatabase(url, key, email, password, name): Promise<AdminUser>

// Deploy to Vercel
createVercelProject(agencyName): Promise<VercelProject>
setEnvironmentVariables(projectId, config): Promise<void>
triggerDeployment(projectId): Promise<VercelDeployment>

// Send emails
sendWelcomeEmail(data: WelcomeEmailData): Promise<void>
```

---

## 💰 Cost Per Instance

```
Supabase Free Tier:
  ✓ 500 MB database
  ✓ 50,000 monthly active users
  ✓ 2 GB bandwidth
  Cost: $0/month

Vercel Hobby:
  ✓ 100 GB bandwidth
  ✓ 1,000 deployments/month
  Cost: $0/month

Total: $0/month per instance (on free tiers)
```

For production instances:

- Supabase Pro: $25/month
- Vercel Pro: $20/month
- **Total: $45/month per agency**

---

## 📞 Need Help?

1. Check `PHASE_2_SETUP_GUIDE.md` troubleshooting
2. Review console logs during provisioning
3. Check Supabase/Vercel dashboards
4. Verify all env vars are set correctly

---

**Status**: ✅ Ready to configure
**Next**: Follow `PHASE_2_SETUP_GUIDE.md`
