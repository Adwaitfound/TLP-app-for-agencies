# 🎯 Database Setup Quick Reference Card

**Date**: January 18, 2026  
**Target**: Set up multi-tenant database with adwait as super admin

---

## 📋 Quick Checklist

### Before You Start
- [ ] Have Supabase project URL ready
- [ ] Know adwait@thelostproject.in exists in Supabase Auth
- [ ] Have adwait's user ID copied
- [ ] .env.local ready (will create soon)

### Database Setup (50 minutes)
1. [ ] Get Supabase credentials (5 min)
2. [ ] Get adwait's user ID (5 min)
3. [ ] Run saas_core_tables.sql (10 min)
4. [ ] Create organization record (5 min)
5. [ ] Add adwait as admin (5 min)
6. [ ] Enable RLS policies (10 min)
7. [ ] Verify setup (5 min)

### Testing (30 minutes)
- [ ] Create .env.local with credentials
- [ ] Run: npm run dev
- [ ] Login as adwait → see /dashboard
- [ ] Check analytics has filtered data
- [ ] Check admin dashboard has filtered data

---

## 🔑 Key Values to Save

As you go through setup, save these:

```
ADWAIT_USER_ID = {copy from Supabase Auth}
ORIGINAL_ORG_ID = {returned after creating organization}
SUPABASE_URL = {from Supabase settings}
ANON_KEY = {from Supabase settings}
SERVICE_ROLE_KEY = {from Supabase settings}
```

---

## 📍 File Locations

| File | Purpose |
|------|---------|
| saas_core_tables.sql | Run 1st - creates tables |
| setup_multitenant_db.sql | Run 2nd - sets up data |
| DATABASE_SETUP_STEPS.md | Follow this step-by-step |
| proxy.ts | Already configured |
| .env.local | Create now with credentials |

---

## 🚀 Commands

```bash
# 1. Install dependencies (already done)
npm install

# 2. Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
EOF

# 3. Start dev server
npm run dev

# 4. Open browser
open http://localhost:3000
```

---

## 🎯 What Happens Next

### When adwait Logs In
```
Login as: adwait@thelostproject.in
  ↓
Middleware: Detects original owner
  ↓
Middleware: Route to /dashboard
  ↓
Dashboard loads with their data
  ↓
Only see their projects, clients, invoices
```

### When Tenant Logs In (Future)
```
Login as: tenant@company.com
  ↓
Middleware: Check if SaaS user
  ↓
No org → Redirect to /v2/onboarding
Has org → Redirect to /v2/dashboard
  ↓
Tenant sees only their organization's data
```

---

## 🔒 Security Verification

After setup, you should see:

**In Supabase**:
- ✅ saas_organizations table exists
- ✅ saas_organization_members table exists
- ✅ RLS policies are "ENABLED" (not "DISABLED")
- ✅ Organization record created
- ✅ Admin membership created

**In Browser Console**:
```
[MIDDLEWARE] Original owner accessing /dashboard - allowed
```

**In DevTools Network**:
```
Requests to /supabase include:
.eq("user_id", "adwait's-user-id")
```

---

## ⚠️ If Something Goes Wrong

### "Table doesn't exist"
→ Run saas_core_tables.sql in Supabase

### "Cannot login"
→ Check .env.local credentials

### "Cannot see data"
→ Check user_id filter in queries

### "SaaS user can see /dashboard"
→ Check middleware rule 3 in proxy.ts

---

## 📞 Support

**Stuck?** Check these files in order:
1. DATABASE_SETUP_STEPS.md (detailed walkthrough)
2. DATABASE_SETUP_GUIDE.md (architecture explanation)
3. LOCAL_TESTING_GUIDE.md (testing procedures)

---

## ✨ Success Looks Like

```
✅ adwait@thelostproject.in logs in
✅ Middleware allows /dashboard access
✅ Dashboard loads with their data
✅ Analytics shows filtered data
✅ Admin dashboard shows filtered data
✅ No errors in console
✅ Ready for tenant onboarding
```

---

**Time to complete**: ~80 minutes total (setup + testing)

**Next step**: Read DATABASE_SETUP_STEPS.md and start Phase 1 🚀
