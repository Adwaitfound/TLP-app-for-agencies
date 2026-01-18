# Quick Local Test Setup

## Prerequisites Checked ✅

- ✅ `package.json` exists
- ✅ Node modules installed (717 packages)
- ⚠️ `.env.local` needs to be created with Supabase credentials

## To Start Local Testing

### Step 1: Configure Environment

Create `.env.local` in the project root:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF
```

Replace the values with your actual Supabase credentials from:
https://app.supabase.com/project/[your-project]/settings/api

### Step 2: Start Dev Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

### Step 3: Test the Fixes

See [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) for detailed testing steps.

---

## What You Can Test Without Full Setup

Even without Supabase credentials, you can verify:

1. **Code Fixes** (no environment needed):
```bash
# Check middleware fix
grep 'if (!isOriginalAgencyOwner && pathname.startsWith' proxy.ts | grep -v '!pathname'

# Check analytics filters (should find 3)
grep -c 'eq("user_id", user.id)' app/dashboard/analytics/page.tsx

# Check admin dashboard filters (should find 3)
grep -c 'eq("user_id", userId)' app/dashboard/admin-view.tsx
```

2. **Build the app** (checks for TypeScript errors):
```bash
npm run build
```

---

## Dependencies Status

✅ All 717 packages installed  
⚠️ 2 high severity vulnerabilities (optional to fix)  
⚠️ Node version mismatch (requires 20.x, have 24.1.0) - but app will run

## Next Steps

1. Get Supabase credentials from your project
2. Create `.env.local` with credentials
3. Run `npm run dev`
4. Follow testing guide in [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)
