# V2 SaaS Multi-Tenant Migration Guide

## Overview

This guide outlines the complete migration from the original single-tenant app (`/app/`) to the multi-tenant SaaS version (`/app/v2/`).

## ✅ Completed

### 1. Database Schema (saas_business_tables.sql)

Created complete multi-tenant schema with:

- **saas_clients** - Client organizations within a tenant
- **saas_client_services** - Services each client uses
- **saas_projects** - Projects with org_id isolation
- **saas_project_files** - File uploads and Drive links
- **saas_project_comments** - Comments with video timestamps
- **saas_milestones** - Project milestones
- **saas_project_team** - Team member assignments
- **saas_sub_projects** - Sub-tasks and deliverables
- **saas_sub_project_comments** - Sub-project comments
- **saas_sub_project_updates** - Status updates
- **saas_invoices** - Multi-tenant invoices
- **saas_invoice_items** - Invoice line items

All tables include:

- `org_id UUID NOT NULL` for tenant isolation
- Row Level Security (RLS) policies
- Proper indexes for performance
- Updated_at triggers

**Action Required:**

1. Open Supabase SQL Editor
2. Run `saas_core_tables.sql` (if not already run)
3. Run `saas_business_tables.sql`

### 2. Layout & Components

✅ `/app/v2/layout.tsx` - Matches original dashboard layout exactly
✅ `/components/v2/sidebar.tsx` - Role-based navigation (admin/member/client routes)
✅ `/components/v2/header.tsx` - Search, theme toggle, user menu

## 🔄 Migration Pattern

### Query Transformation Template

**Original (Single-Tenant):**

```typescript
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("client_id", clientId);
```

**V2 (Multi-Tenant):**

```typescript
const { organization } = useOrg();

const { data, error } = await supabase
  .from("saas_projects")
  .select("*")
  .eq("org_id", organization.id)
  .eq("client_id", clientId);
```

### Table Mapping

| Original Table     | V2 Table                | Key Change   |
| ------------------ | ----------------------- | ------------ |
| `clients`          | `saas_clients`          | Add `org_id` |
| `projects`         | `saas_projects`         | Add `org_id` |
| `project_files`    | `saas_project_files`    | Add `org_id` |
| `project_comments` | `saas_project_comments` | Add `org_id` |
| `milestones`       | `saas_milestones`       | Add `org_id` |
| `project_team`     | `saas_project_team`     | Add `org_id` |
| `sub_projects`     | `saas_sub_projects`     | Add `org_id` |
| `invoices`         | `saas_invoices`         | Add `org_id` |
| `invoice_items`    | `saas_invoice_items`    | Add `org_id` |

## 📋 Pending Pages

### Priority 1: Core Business Logic

#### A. Projects Page (`/app/v2/projects/page.tsx`)

**Size:** 5,386 lines (very complex)
**Original:** `/app/dashboard/projects/page.tsx`

**Key Features to Migrate:**

1. Project CRUD operations
2. File manager integration
3. Milestone management
4. Team member assignments
5. Sub-project management
6. Comments and updates
7. Progress tracking
8. Client filtering
9. Service type filtering
10. Status management

**Migration Steps:**

```typescript
// 1. Replace all table names
projects → saas_projects
project_files → saas_project_files
project_comments → saas_project_comments
milestones → saas_milestones
project_team → saas_project_team
sub_projects → saas_sub_projects

// 2. Add org_id to ALL queries
const { organization } = useOrg();

// SELECT
.from('saas_projects')
.eq('org_id', organization.id)

// INSERT
.insert({
  org_id: organization.id,
  name,
  client_id,
  // ... other fields
})

// UPDATE
.update({ name, description })
.eq('org_id', organization.id)
.eq('id', projectId)

// DELETE
.delete()
.eq('org_id', organization.id)
.eq('id', projectId)

// 3. Update client references
clients → saas_clients
.eq('org_id', organization.id)
```

#### B. Invoices Page (`/app/v2/invoices/page.tsx`)

**Original:** `/app/dashboard/invoices/page.tsx`

**Key Features:**

1. Invoice creation (manual & file upload)
2. Client selection
3. Project linking
4. Payment tracking
5. Status management
6. PDF generation
7. Email sending
8. Advance payment tracking

**Migration Pattern:**

```typescript
// Fetch invoices
const { data: invoices } = await supabase
  .from("saas_invoices")
  .select("*, saas_clients(company_name), saas_projects(name)")
  .eq("org_id", organization.id)
  .order("created_at", { ascending: false });

// Fetch clients for dropdown
const { data: clients } = await supabase
  .from("saas_clients")
  .select("*")
  .eq("org_id", organization.id)
  .order("company_name");

// Fetch projects for dropdown
const { data: projects } = await supabase
  .from("saas_projects")
  .select("*")
  .eq("org_id", organization.id)
  .order("name");

// Create invoice
await supabase.from("saas_invoices").insert({
  org_id: organization.id,
  invoice_number: `INV-${Date.now()}`,
  client_id: selectedClientId,
  project_id: selectedProjectId,
  // ... other fields
});
```

#### C. Clients Page (`/app/v2/clients/page.tsx`)

**Current State:** Basic version exists, needs full logic

**Key Features:**

1. Client CRUD operations
2. Service type tracking
3. Project count aggregation
4. Revenue calculation
5. Contact management
6. Status management

**Migration Pattern:**

```typescript
// Fetch clients with aggregated data
const { data: clients } = await supabase
  .from("saas_clients")
  .select("*")
  .eq("org_id", organization.id)
  .order("company_name");

// Fetch projects for aggregation
const { data: projects } = await supabase
  .from("saas_projects")
  .select("*")
  .eq("org_id", organization.id);

// Fetch invoices for revenue calculation
const { data: invoices } = await supabase
  .from("saas_invoices")
  .select("*")
  .eq("org_id", organization.id)
  .eq("status", "paid");

// Enhance clients with metrics
const enhancedClients = clients.map((client) => {
  const clientProjects = projects.filter((p) => p.client_id === client.id);
  const clientInvoices = invoices.filter((inv) => inv.client_id === client.id);
  const totalRevenue = clientInvoices.reduce(
    (sum, inv) => sum + (inv.total || 0),
    0
  );

  return {
    ...client,
    total_projects: clientProjects.length,
    total_revenue: totalRevenue,
    services: [...new Set(clientProjects.map((p) => p.service_type))],
  };
});
```

### Priority 2: Supporting Pages

#### D. Comments Page (`/app/v2/comments/page.tsx`)

**To Create From:** `/app/dashboard/comments/page.tsx`

```typescript
const { data: comments } = await supabase
  .from("saas_project_comments")
  .select("*, saas_projects(name), saas_project_files(file_name)")
  .eq("org_id", organization.id)
  .order("created_at", { ascending: false });
```

#### E. Files Page (`/app/v2/files/page.tsx`)

**To Create From:** `/app/dashboard/files/page.tsx`

```typescript
const { data: files } = await supabase
  .from("saas_project_files")
  .select("*, saas_projects(name)")
  .eq("org_id", organization.id)
  .order("created_at", { ascending: false });
```

#### F. Analytics Page (`/app/v2/analytics/page.tsx`)

**To Create From:** `/app/dashboard/analytics/page.tsx`

All aggregation queries must filter by `org_id`:

```typescript
// Projects by status
const { data: projectStats } = await supabase
  .from("saas_projects")
  .select("status")
  .eq("org_id", organization.id);

// Revenue over time
const { data: revenueData } = await supabase
  .from("saas_invoices")
  .select("total, created_at")
  .eq("org_id", organization.id)
  .eq("status", "paid");
```

#### G. Team Members Page (`/app/v2/members/page.tsx`)

**Current State:** Basic version exists

**Migration Pattern:**

```typescript
// Use saas_organization_members instead of users table
const { data: members } = await supabase
  .from("saas_organization_members")
  .select("*, user:user_id(*)")
  .eq("org_id", organization.id)
  .eq("status", "active");
```

#### H. Notifications Page (`/app/v2/notifications/page.tsx`)

**To Create:** New feature or adapt existing

#### I. Payments Page (`/app/v2/payments/page.tsx`)

**To Create:** Vendor payments tracking

## 🔒 Critical Security Rules

### Every Query MUST Include org_id

**❌ WRONG (Data Leak):**

```typescript
await supabase.from("saas_projects").select("*");
```

**✅ CORRECT:**

```typescript
const { organization } = useOrg();
await supabase.from("saas_projects").select("*").eq("org_id", organization.id);
```

### INSERT Operations

**Always include org_id:**

```typescript
await supabase.from("saas_projects").insert({
  org_id: organization.id, // ✅ REQUIRED
  name: "New Project",
  client_id: clientId,
  // ... other fields
});
```

### UPDATE Operations

**Always filter by org_id:**

```typescript
await supabase
  .from("saas_projects")
  .update({ status: "completed" })
  .eq("org_id", organization.id) // ✅ Security
  .eq("id", projectId);
```

### DELETE Operations

**Always filter by org_id:**

```typescript
await supabase
  .from("saas_projects")
  .delete()
  .eq("org_id", organization.id) // ✅ Prevent cross-tenant deletion
  .eq("id", projectId);
```

## 🎨 UI/UX Consistency

### Brand Colors

Already implemented with inline styles:

```typescript
const brandColor = organization?.settings?.brand_color || 'blue';
const gradientStyle = getGradientColors(brandColor);

<div style={{
  background: `linear-gradient(to right, ${gradientStyle.from}, ${gradientStyle.to})`
}}>
```

### Navigation

- Admin: 13 routes (full access)
- Member: 6 routes (limited access)
- Client: 4 routes (project view only)

### Layout Structure

```
┌─────────────────────────────────────┐
│ Sidebar (fixed)  │  Header (sticky) │
│                  ├──────────────────┤
│  - Logo          │  Content Area    │
│  - Nav Links     │                  │
│                  │  (scrollable)    │
└─────────────────────────────────────┘
```

## 📝 Next Steps

1. **Run SQL Migrations:**

   - Open Supabase SQL Editor
   - Execute `saas_business_tables.sql`
   - Verify all tables created: `SELECT * FROM information_schema.tables WHERE table_name LIKE 'saas_%'`

2. **Migrate Projects Page:**

   - This is the most complex page (5,386 lines)
   - Consider breaking it into smaller components
   - Test each feature incrementally

3. **Migrate Invoices Page:**

   - File upload functionality
   - Payment tracking
   - Client/project dropdowns

4. **Migrate Remaining Pages:**

   - Clients (enhance existing)
   - Comments (create new)
   - Files (create new)
   - Analytics (create new)
   - Team (enhance existing)

5. **Testing Checklist:**
   ```
   □ Create project as admin
   □ View project as member
   □ View project as client
   □ Upload files
   □ Add comments
   □ Create milestone
   □ Assign team member
   □ Create invoice
   □ Link invoice to project
   □ Verify org_id isolation (can't see other org's data)
   ```

## 🚨 Common Pitfalls

1. **Forgetting org_id in INSERT:**

   ```typescript
   // ❌ Will fail with FK constraint
   await supabase.from("saas_projects").insert({ name: "Test" });

   // ✅ Correct
   await supabase.from("saas_projects").insert({
     org_id: organization.id,
     name: "Test",
   });
   ```

2. **Not filtering by org_id in SELECT:**

   ```typescript
   // ❌ Returns data from ALL organizations
   const { data } = await supabase.from("saas_projects").select("*");

   // ✅ Returns only this org's data
   const { data } = await supabase
     .from("saas_projects")
     .select("*")
     .eq("org_id", organization.id);
   ```

3. **Using wrong table names:**

   - Always use `saas_` prefix
   - Check the table mapping above

4. **Missing useOrg context:**

   ```typescript
   // ❌ organization is undefined
   function MyComponent() {
     const { data } = useQuery(...)
   }

   // ✅ Get organization from context
   function MyComponent() {
     const { organization } = useOrg();
     const { data } = useQuery(...)
   }
   ```

## 📚 Resources

- Original App: `/app/dashboard/`
- V2 App: `/app/v2/`
- Database Schema: `saas_business_tables.sql`
- Layout Reference: `/app/dashboard/layout.tsx`
- Sidebar Reference: `/components/dashboard/sidebar.tsx`
- Header Reference: `/components/dashboard/header.tsx`

## ✨ Benefits of This Approach

1. **Data Isolation:** Each organization's data is completely separate
2. **Scalability:** Can support unlimited organizations
3. **Security:** RLS policies enforce tenant isolation at database level
4. **Maintainability:** Clear separation between v1 and v2
5. **Flexibility:** Easy to add new features without affecting original app

---

**Ready to proceed?**

1. Run the SQL migration
2. Start with Projects page (largest file)
3. Test thoroughly with multiple orgs
4. Gradually migrate remaining pages
