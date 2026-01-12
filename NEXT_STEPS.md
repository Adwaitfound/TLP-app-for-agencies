# ✅ What's Done & 🎯 What's Next

## ✅ Completed Setup

### 1. Database Schema ✅

All 12 multi-tenant tables created successfully:

- ✅ saas_clients
- ✅ saas_client_services
- ✅ saas_projects
- ✅ saas_project_files
- ✅ saas_project_comments
- ✅ saas_milestones
- ✅ saas_project_team
- ✅ saas_sub_projects
- ✅ saas_sub_project_comments
- ✅ saas_sub_project_updates
- ✅ saas_invoices
- ✅ saas_invoice_items

**Verified:** Run `node verify-saas-tables.js` anytime to check

### 2. Layout & Components ✅

- ✅ `/app/v2/layout.tsx` - Sidebar + Header structure
- ✅ `/components/v2/sidebar.tsx` - Role-based navigation (13 admin routes, 6 member routes, 4 client routes)
- ✅ `/components/v2/header.tsx` - Search, theme toggle, user menu

### 3. Documentation ✅

- ✅ `V2_MIGRATION_GUIDE.md` - Complete migration guide
- ✅ `MIGRATION_QUICK_REF.md` - Quick reference cheat sheet
- ✅ `saas_business_tables.sql` - Database schema

## 🎯 Your Next 3 Tasks

### Task 1: Start with INVOICES (Easier than Projects)

The invoices page is simpler to migrate than projects. Start here to get familiar with the pattern.

**File:** `/app/v2/invoices/page.tsx` (current state: basic version exists)

**Steps:**

1. Open both files side by side:

   - Original: `/app/dashboard/invoices/page.tsx`
   - V2: `/app/v2/invoices/page.tsx`

2. Copy the original file content to v2

3. Make these replacements:

```typescript
// Import change
import { useAuth } from '@/contexts/auth-context';
// TO:
import { useOrg } from '@/lib/org-context';

// Context change
const { user } = useAuth();
// TO:
const { organization, member, isAdmin } = useOrg();

// Table changes (find & replace all):
.from('invoices') → .from('saas_invoices')
.from('clients') → .from('saas_clients')
.from('projects') → .from('saas_projects')
.from('invoice_items') → .from('saas_invoice_items')

// Add org_id to ALL queries:

// SELECT example:
const { data: invoices } = await supabase
  .from('saas_invoices')
  .select('*, saas_clients(company_name), saas_projects(name)')
  .eq('org_id', organization.id)  // ← ADD THIS
  .order('created_at', { ascending: false });

// INSERT example:
await supabase.from('saas_invoices').insert({
  org_id: organization.id,  // ← ADD THIS
  invoice_number,
  client_id,
  project_id,
  // ... rest of fields
});

// UPDATE example:
await supabase
  .from('saas_invoices')
  .update({ status: 'paid' })
  .eq('org_id', organization.id)  // ← ADD THIS
  .eq('id', invoiceId);

// DELETE example:
await supabase
  .from('saas_invoices')
  .delete()
  .eq('org_id', organization.id)  // ← ADD THIS
  .eq('id', invoiceId);
```

4. Test:
   - Create an invoice
   - Edit it
   - Delete it
   - Verify it's isolated to your org

### Task 2: Enhance CLIENTS Page

The clients page already exists but needs the full logic from the original.

**File:** `/app/v2/clients/page.tsx`

**Current state:** Basic version, needs enhancement

**Steps:**

1. Compare with `/app/dashboard/clients/page.tsx`
2. Add missing features:
   - Client services tracking
   - Revenue calculations
   - Project count aggregation
3. Ensure all queries use `org_id` filter

### Task 3: Tackle PROJECTS Page (Most Complex)

This is the biggest file (5,386 lines) but most important.

**File:** `/app/v2/projects/page.tsx`

**Strategy:** Break it into phases

1. **Phase 1:** Basic project CRUD
2. **Phase 2:** File manager
3. **Phase 3:** Milestones
4. **Phase 4:** Team assignments
5. **Phase 5:** Sub-projects

**Start simple:**

```typescript
// Just get the list working first
const { organization } = useOrg();

const { data: projects } = await supabase
  .from("saas_projects")
  .select("*, saas_clients(company_name)")
  .eq("org_id", organization.id)
  .order("created_at", { ascending: false });
```

Then gradually add more features.

## 📝 Quick Reference Pattern

**Every page must follow this pattern:**

```typescript
'use client';

import { useOrg } from '@/lib/org-context';
import { createClient } from '@/lib/supabase/client';

export default function MyPage() {
  const { organization, member, isAdmin } = useOrg();
  const supabase = createClient();

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('saas_TABLE_NAME')
        .select('*')
        .eq('org_id', organization.id);  // ← ALWAYS ADD THIS

      setMyData(data);
    }

    if (organization?.id) {
      fetchData();
    }
  }, [organization?.id]);

  // Create
  const handleCreate = async (formData) => {
    await supabase.from('saas_TABLE_NAME').insert({
      org_id: organization.id,  // ← ALWAYS ADD THIS
      ...formData
    });
  };

  // Update
  const handleUpdate = async (id, updates) => {
    await supabase
      .from('saas_TABLE_NAME')
      .update(updates)
      .eq('org_id', organization.id)  // ← SECURITY
      .eq('id', id);
  };

  // Delete
  const handleDelete = async (id) => {
    await supabase
      .from('saas_TABLE_NAME')
      .delete()
      .eq('org_id', organization.id)  // ← PREVENT CROSS-TENANT DELETE
      .eq('id', id);
  };

  return (
    // Your UI
  );
}
```

## 🚀 Recommended Order

1. **Invoices** (Start here - simpler, fewer dependencies) ⭐
2. **Clients** (Enhance existing page)
3. **Projects** (Most complex - break into phases)
4. **Comments** (Create new - simpler)
5. **Files** (Create new - simpler)
6. **Analytics** (Create new - aggregation queries)
7. **Other pages** (As needed)

## ⚡ Pro Tips

1. **Use VS Code find & replace:**

   - Find: `.from('invoices')`
   - Replace: `.from('saas_invoices')`
   - Do this for all tables at once

2. **Test incrementally:**

   - Don't migrate the entire page at once
   - Get one feature working, then add the next

3. **Check RLS policies:**

   - If you can't read/write, check the RLS policies in SQL
   - They should allow admin/member roles

4. **Use the Quick Ref:**
   - Keep `MIGRATION_QUICK_REF.md` open
   - Copy-paste the query patterns

## 🔍 Verify Your Work

After each page migration:

```bash
# 1. Check for errors
npm run build

# 2. Test in browser
# - Create, read, update, delete
# - Switch between admin/member/client roles
# - Try to access another org's data (should fail)

# 3. Check database
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await supabase.from('saas_invoices').select('*');
  console.log('Total invoices:', data.length);
  console.log('Sample:', data[0]);
})();
"
```

## 📚 Documentation Files

- `V2_MIGRATION_GUIDE.md` - Full guide with examples
- `MIGRATION_QUICK_REF.md` - Quick copy-paste patterns
- `saas_business_tables.sql` - Database schema reference

---

**Start with Invoices page now!** 🚀

The pattern is simple:

1. Copy original page
2. Replace table names (add `saas_` prefix)
3. Replace `useAuth()` with `useOrg()`
4. Add `.eq('org_id', organization.id)` to all queries
5. Test!
