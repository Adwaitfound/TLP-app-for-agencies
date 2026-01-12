# Projects Page Migration Plan

## Overview

The projects page is the most complex migration with **5,385 lines** of code including:

- Projects CRUD
- Sub-projects management
- File manager integration
- Milestones tracking
- Team assignments
- Comments system

## Phased Migration Approach

### Phase 1: Core Projects CRUD ✅ (Current Phase)

- [ ] Basic project listing
- [ ] Create new project
- [ ] Edit project
- [ ] Delete project
- [ ] Status/service filtering
- [ ] Search functionality
- [ ] Client association

**Tables:** `saas_projects`, `saas_clients`

### Phase 2: Team Management

- [ ] Assign team members
- [ ] Remove team members
- [ ] View team assignments
- [ ] Role-based assignments

**Tables:** `saas_project_team`

### Phase 3: File Manager

- [ ] Upload files
- [ ] View files
- [ ] Delete files
- [ ] File categories
- [ ] Drive integration

**Tables:** `saas_project_files`

### Phase 4: Milestones

- [ ] Create milestones
- [ ] Update milestone status
- [ ] Delete milestones
- [ ] Track progress

**Tables:** `saas_milestones`

### Phase 5: Sub-Projects

- [ ] Create sub-projects
- [ ] Edit sub-projects
- [ ] Delete sub-projects
- [ ] Sub-project comments
- [ ] Sub-project updates

**Tables:** `saas_sub_projects`, `saas_sub_project_comments`, `saas_sub_project_updates`

### Phase 6: Comments & Advanced

- [ ] File comments
- [ ] Comment replies
- [ ] Video timestamps
- [ ] Comment resolution

**Tables:** `saas_project_comments`

## Key Transformations

### Database Tables

```typescript
// Original → V2
projects → saas_projects
clients → saas_clients
project_files → saas_project_files
project_team → saas_project_team
milestones → saas_milestones
sub_projects → saas_sub_projects
sub_project_comments → saas_sub_project_comments
sub_project_updates → saas_sub_project_updates
project_comments → saas_project_comments
```

### Context Hook

```typescript
// Original
const { user } = useAuth();

// V2
const { organization, member } = useOrg();
```

### Role Checks

```typescript
// Original
user?.role === "admin";

// V2
member?.role === "admin";
```

### All Queries Pattern

```typescript
// Original
.from("projects").select("*")

// V2
.from("saas_projects")
  .select("*")
  .eq("org_id", organization.id)
```

## Current Status

Starting with **Phase 1** - creating basic projects page with CRUD operations.

## Files to Create

1. `/app/v2/projects/page.tsx` - Main projects page (Phase 1)
2. Future phases will add components as needed

## Testing Plan

Each phase should be tested before moving to next:

- Create project
- Edit project
- Delete project
- Filter by status
- Filter by service type
- Search projects
- Role-based access
- Tenant isolation (can't see other org's projects)
