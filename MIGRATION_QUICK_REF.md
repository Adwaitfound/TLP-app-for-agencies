# Quick Reference: V2 Multi-Tenant Migration

## 🔧 Setup (Run Once)

```bash
# 1. Open Supabase SQL Editor
# 2. Run: saas_business_tables.sql
# 3. Verify:
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'saas_%';
```

## 🔄 Code Migration Cheat Sheet

### Import Pattern

```typescript
import { useOrg } from "@/lib/org-context";

function MyPage() {
  const { organization, member, isAdmin } = useOrg();
  // organization.id is used for ALL queries
}
```

### SELECT Queries

```typescript
// ❌ Original
const { data } = await supabase.from("projects").select("*");

// ✅ V2
const { data } = await supabase
  .from("saas_projects")
  .select("*")
  .eq("org_id", organization.id);
```

### INSERT Queries

```typescript
// ❌ Original
await supabase.from("projects").insert({ name, client_id });

// ✅ V2
await supabase.from("saas_projects").insert({
  org_id: organization.id, // ← ALWAYS ADD THIS
  name,
  client_id,
});
```

### UPDATE Queries

```typescript
// ❌ Original
await supabase
  .from("projects")
  .update({ status: "completed" })
  .eq("id", projectId);

// ✅ V2
await supabase
  .from("saas_projects")
  .update({ status: "completed" })
  .eq("org_id", organization.id) // ← SECURITY
  .eq("id", projectId);
```

### DELETE Queries

```typescript
// ❌ Original
await supabase.from("projects").delete().eq("id", projectId);

// ✅ V2
await supabase
  .from("saas_projects")
  .delete()
  .eq("org_id", organization.id) // ← PREVENT CROSS-TENANT DELETE
  .eq("id", projectId);
```

### JOIN Queries

```typescript
// ❌ Original
.select('*, clients(company_name), users(full_name)')

// ✅ V2
.select('*, saas_clients(company_name), users(full_name)')
// Note: users table stays the same (from auth.users)
```

## 📊 Table Reference

| Original               | V2 Multi-Tenant             |
| ---------------------- | --------------------------- |
| `clients`              | `saas_clients`              |
| `projects`             | `saas_projects`             |
| `project_files`        | `saas_project_files`        |
| `project_comments`     | `saas_project_comments`     |
| `milestones`           | `saas_milestones`           |
| `project_team`         | `saas_project_team`         |
| `sub_projects`         | `saas_sub_projects`         |
| `sub_project_comments` | `saas_sub_project_comments` |
| `sub_project_updates`  | `saas_sub_project_updates`  |
| `invoices`             | `saas_invoices`             |
| `invoice_items`        | `saas_invoice_items`        |
| `client_services`      | `saas_client_services`      |

## 🎯 Find & Replace Strategy

When migrating a page:

1. **Global Replace - Table Names:**

   ```
   Find: .from('projects')
   Replace: .from('saas_projects')

   Find: .from('clients')
   Replace: .from('saas_clients')

   Find: .from('invoices')
   Replace: .from('saas_invoices')

   // Repeat for all tables above
   ```

2. **Add org_id to SELECT:**

   ```typescript
   // After every .from('saas_*')
   .eq('org_id', organization.id)
   ```

3. **Add org_id to INSERT:**

   ```typescript
   // In every .insert({ ... })
   org_id: organization.id,  // ← Add as first field
   ```

4. **Import Context:**

   ```typescript
   // Add at top
   import { useOrg } from "@/lib/org-context";

   // Replace useAuth() with useOrg()
   const { organization, member, isAdmin } = useOrg();
   ```

## 🚦 Testing Checklist

After migrating each page:

```bash
# 1. Create test data as admin
✓ Create new record
✓ Edit existing record
✓ Delete record
✓ View list

# 2. Switch to member role
✓ Can view data
✓ Can edit (if allowed)
✓ Cannot see admin-only features

# 3. Switch to client role
✓ Can only see assigned projects
✓ Cannot create/edit/delete

# 4. Multi-tenant isolation
✓ Login with different org
✓ Verify can't see first org's data
✓ Verify can't access first org's URLs
```

## 🔥 Common Errors & Fixes

### Error: "null value in column org_id violates not-null constraint"

```typescript
// ❌ Missing org_id in INSERT
.insert({ name, client_id })

// ✅ Fix: Add org_id
.insert({ org_id: organization.id, name, client_id })
```

### Error: "organization is undefined"

```typescript
// ❌ Not using useOrg hook
function MyPage() {
  const { data } = useQuery(...)
}

// ✅ Fix: Import and use useOrg
import { useOrg } from '@/lib/org-context';

function MyPage() {
  const { organization } = useOrg();
  const { data } = useQuery(...)
}
```

### Error: Seeing data from other organizations

```typescript
// ❌ Missing org_id filter
.from('saas_projects').select('*')

// ✅ Fix: Always filter by org_id
.from('saas_projects')
.select('*')
.eq('org_id', organization.id)
```

### Error: Can't delete/update records

```typescript
// ❌ UPDATE without org_id filter
.update({ status })
.eq('id', projectId)

// ✅ Fix: Add org_id filter
.update({ status })
.eq('org_id', organization.id)
.eq('id', projectId)
```

## 📁 File Structure

```
app/
├── v2/                    ← Multi-tenant SaaS version
│   ├── layout.tsx        ← ✅ Migrated
│   ├── dashboard/        ← ✅ Migrated
│   ├── projects/         ← 🔄 Need to migrate
│   ├── invoices/         ← 🔄 Need to migrate
│   ├── clients/          ← 🔄 Need to enhance
│   ├── members/          ← ✅ Basic version done
│   ├── comments/         ← 🔄 Need to create
│   ├── files/            ← 🔄 Need to create
│   └── analytics/        ← 🔄 Need to create

components/
├── v2/
│   ├── sidebar.tsx       ← ✅ Migrated
│   └── header.tsx        ← ✅ Migrated

Database:
├── saas_core_tables.sql      ← Organizations & members
├── saas_business_tables.sql  ← ✅ Created (run this!)
└── RUN_THIS_CLEAN.sql        ← Original single-tenant schema
```

## 🎨 Brand Customization

Already working with inline styles:

```typescript
const brandColor = organization?.settings?.brand_color || 'blue';
const gradientStyle = getGradientColors(brandColor);

<div style={{
  background: `linear-gradient(to right, ${gradientStyle.from}, ${gradientStyle.to})`
}}>
```

## 🔐 Role-Based Access

```typescript
const { member, isAdmin } = useOrg();

// Check role
if (member?.role === "admin") {
  // Show admin features
}

if (member?.role === "member") {
  // Show limited features
}

if (member?.role === "client") {
  // Show client view only
}

// Or use helper
if (isAdmin) {
  // Admin only
}
```

## 📝 Step-by-Step Migration Process

### For Each Page:

1. **Copy the original page**

   ```bash
   cp app/dashboard/projects/page.tsx app/v2/projects/page.tsx
   ```

2. **Replace imports**

   ```typescript
   // Add:
   import { useOrg } from "@/lib/org-context";

   // Replace:
   const { user } = useAuth();
   // With:
   const { organization, member, isAdmin } = useOrg();
   ```

3. **Replace table names** (using find & replace)

   - `projects` → `saas_projects`
   - `clients` → `saas_clients`
   - etc. (see table reference above)

4. **Add org_id filters**

   - Every SELECT: `.eq('org_id', organization.id)`
   - Every INSERT: `org_id: organization.id,`
   - Every UPDATE: `.eq('org_id', organization.id)`
   - Every DELETE: `.eq('org_id', organization.id)`

5. **Test thoroughly**

   - Create, read, update, delete
   - Switch between roles
   - Verify data isolation

6. **Commit and move to next page**

---

## 🚀 Priority Order

1. ✅ Layout & Components (DONE)
2. 🔄 **Projects** (largest, most important)
3. 🔄 **Invoices** (business critical)
4. 🔄 **Clients** (enhance existing)
5. 🔄 Comments, Files, Analytics (supporting)

**Start here:** Migrate Projects page using this guide!
