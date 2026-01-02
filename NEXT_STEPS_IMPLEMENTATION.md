# Multi-Instance Implementation - Next Steps

**Current Phase**: Architecture refactoring complete ✅  
**Next Phase**: Automated provisioning system (Phase 2)

---

## Phase 2: Automated Provisioning System

This document outlines the implementation plan for automatically creating and deploying agency instances.

### Overview

When an admin clicks "Approve" on an agency onboarding request, the system should:

1. Create a new Supabase project for that agency
2. Set up the database schema (run migrations)
3. Create an initial admin user
4. Deploy the Next.js app to Vercel with agency-specific config
5. Send welcome email with setup instructions
6. Return the instance URL to admin

---

## Implementation Timeline

| Phase     | Tasks                        | Effort        | Timeline |
| --------- | ---------------------------- | ------------- | -------- |
| **2.1**   | Approval UI + Basic Flow     | 1-2 days      | Week 1   |
| **2.2**   | Supabase API Integration     | 2-3 days      | Week 2   |
| **2.3**   | Vercel Deployment Automation | 2-3 days      | Week 2-3 |
| **2.4**   | Email & Credentials          | 1 day         | Week 3   |
| **2.5**   | Testing & Documentation      | 2 days        | Week 3   |
| **Total** | Full provisioning system     | **8-10 days** | ~3 weeks |

---

## Detailed Implementation Plan

### 2.1: Admin Approval UI (Priority: HIGH)

**File**: `app/dashboard/agency-onboarding/page.tsx`

#### Current State

- Shows list of onboarding requests
- Button to approve (currently does nothing)

#### Changes Needed

**Step 1**: Add loading state and error handling

```tsx
const [approving, setApproving] = useState<string | null>(null);
const [approvalError, setApprovalError] = useState<Record<string, string>>({});
const [approvalStatus, setApprovalStatus] = useState<Record<string, string>>(
  {}
);
```

**Step 2**: Update approve handler

```tsx
async function handleApprove(requestId: string) {
  setApproving(requestId);
  setApprovalError((prev) => ({ ...prev, [requestId]: "" }));

  try {
    const response = await fetch("/api/admin/agency-onboarding/approve", {
      method: "POST",
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      const error = await response.json();
      setApprovalError((prev) => ({
        ...prev,
        [requestId]: error.message || "Approval failed",
      }));
      return;
    }

    const result = await response.json();
    setApprovalStatus((prev) => ({
      ...prev,
      [requestId]: `Provisioning... (${result.status})`,
    }));

    // Poll for completion
    pollProvisioningStatus(requestId);
  } finally {
    setApproving(null);
  }
}

async function pollProvisioningStatus(requestId: string, attempts = 0) {
  if (attempts > 60) {
    setApprovalStatus((prev) => ({
      ...prev,
      [requestId]: "Provisioning timed out. Check admin logs.",
    }));
    return;
  }

  await new Promise((r) => setTimeout(r, 3000)); // Wait 3s between polls

  const response = await fetch(
    `/api/admin/agency-onboarding/status?requestId=${requestId}`
  );
  const result = await response.json();

  setApprovalStatus((prev) => ({
    ...prev,
    [requestId]: result.status,
  }));

  if (result.status === "deployed" || result.status === "failed") {
    await fetchRequests(); // Refresh list
    return;
  }

  pollProvisioningStatus(requestId, attempts + 1);
}
```

**Step 3**: Update UI to show progress

```tsx
{
  request.status === "pending" && (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => handleApprove(request.id)}
        disabled={approving === request.id}
        size="sm"
      >
        {approving === request.id ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Provisioning...
          </>
        ) : (
          "Approve"
        )}
      </Button>
      {approvalStatus[request.id] && (
        <span className="text-sm text-muted-foreground">
          {approvalStatus[request.id]}
        </span>
      )}
      {approvalError[request.id] && (
        <span className="text-sm text-red-500">
          {approvalError[request.id]}
        </span>
      )}
    </div>
  );
}
```

---

### 2.2: Supabase Project Creation (Priority: HIGH)

**New Files**:

- `lib/provisioning/supabase-mgmt.ts` - Supabase Management API
- `app/api/admin/agency-onboarding/provision/route.ts` - Provisioning orchestrator

#### 2.2.1: Supabase Management Client

**File**: `lib/provisioning/supabase-mgmt.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;

if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_ORG_ID) {
  throw new Error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_ORG_ID");
}

/**
 * Create a new Supabase project for an agency
 * https://supabase.com/docs/reference/api/create-project
 */
export async function createSupabaseProject(agencyName: string) {
  const projectName = `tlp-${agencyName.toLowerCase().replace(/\s+/g, "-")}`;

  const response = await fetch(`https://api.supabase.com/v1/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      org_id: SUPABASE_ORG_ID,
      db_pass: generateSecurePassword(),
      region: "us-east-1", // TODO: Make configurable
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create Supabase project: ${response.statusText}`
    );
  }

  const project = await response.json();

  // Wait for project to be ready
  await waitForProjectReady(project.id);

  return project;
}

/**
 * Get Supabase project status
 */
export async function getProjectStatus(projectId: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectId}`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get project status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Poll until project is ready
 */
export async function waitForProjectReady(
  projectId: string,
  maxWaitMs = 300000 // 5 minutes
) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const project = await getProjectStatus(projectId);

    if (project.status === "active") {
      return project;
    }

    // Wait 10 seconds before checking again
    await new Promise((r) => setTimeout(r, 10000));
  }

  throw new Error(`Supabase project ${projectId} did not become ready in time`);
}

/**
 * Get Supabase project credentials (URL and keys)
 */
export async function getProjectCredentials(projectId: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectId}/api-keys`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get project credentials: ${response.statusText}`
    );
  }

  const keys = await response.json();
  const anonKey = keys.find((k: any) => k.name === "anon")?.api_key;

  return {
    url: `https://${projectId}.supabase.co`,
    anonKey,
  };
}

function generateSecurePassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

#### 2.2.2: Environment Variables Needed

Add to `.env.local`:

```
SUPABASE_ACCESS_TOKEN=<your_supabase_access_token>
SUPABASE_ORG_ID=<your_organization_id>
```

Get these from:

- Token: https://app.supabase.com/account/tokens
- Org ID: https://app.supabase.com/account/organizations

---

### 2.3: Database Schema Migration (Priority: HIGH)

**File**: `lib/provisioning/run-migrations.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";

/**
 * Run Supabase migrations on a new project
 */
export async function runMigrations(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get list of migration files (v0_schema.sql - simplified for new instances)
  const migrations = [
    "v0_schema.sql", // Creates all tables without agency_id columns
  ];

  for (const migration of migrations) {
    console.log(`Running migration: ${migration}`);

    const sqlFile = `supabase/migrations/${migration}`;
    const sql = await readMigrationFile(sqlFile);

    try {
      await supabase.rpc("execute_sql", { sql });
      console.log(`✓ ${migration} completed`);
    } catch (error) {
      console.error(`✗ ${migration} failed:`, error);
      throw new Error(`Migration ${migration} failed`);
    }
  }
}

async function readMigrationFile(filePath: string): Promise<string> {
  // TODO: Read from file system or import SQL content
  return "";
}
```

#### Create v0 Schema Migration

**File**: `supabase/migrations/v0_schema.sql`

This is a NEW migration file specifically for brand new agency instances. It should:

- NOT include `agency_id` columns
- NOT include `agencies` table
- NOT include `user_agencies` table
- Include ALL other core tables

```sql
-- v0_schema.sql: Core schema for new agency instances (no multi-tenancy)

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'project_manager', 'employee', 'client')),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Projects table (NO agency_id)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  service_type TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ... rest of schema (clients, files, invoices, etc. without agency_id)

-- RLS Policies (no agency scoping needed)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ... etc.

-- Auth check function
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.4: Vercel Deployment (Priority: MEDIUM)

**File**: `lib/provisioning/vercel-deploy.ts`

```typescript
/**
 * Deploy app to Vercel with agency-specific environment
 */
export async function deployToVercel(
  agencyName: string,
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string
) {
  const projectName = `tlp-${agencyName.toLowerCase().replace(/\s+/g, "-")}`;

  // Step 1: Create Vercel project
  const project = await createVercelProject(projectName);

  // Step 2: Set environment variables
  await setVercelEnv(project.id, {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
    AGENCY_NAME: agencyName,
    AGENCY_SUPABASE_PROJECT_ID: projectId,
  });

  // Step 3: Connect GitHub repo (if not already connected)
  // Step 4: Deploy
  const deployment = await triggerVercelDeploy(project.id);

  return {
    projectId: project.id,
    deploymentId: deployment.id,
    deploymentUrl: deployment.url,
  };
}

async function createVercelProject(projectName: string) {
  const response = await fetch("https://api.vercel.com/v10/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      gitRepository: {
        type: "github",
        repo: "adwaitparchure/TLP-app", // Your repo
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Vercel project`);
  }

  return await response.json();
}

async function setVercelEnv(projectId: string, env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) {
    await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        target: ["production", "preview", "development"],
      }),
    });
  }
}

async function triggerVercelDeploy(projectId: string) {
  const response = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      source: "github",
    }),
  });

  return await response.json();
}
```

#### Environment Variables Needed

Add to `.env.local`:

```
VERCEL_TOKEN=<your_vercel_api_token>
VERCEL_TEAM_ID=<your_team_id>  # Optional, for team deployments
```

Get from: https://vercel.com/account/tokens

---

### 2.5: Welcome Email & Credentials (Priority: MEDIUM)

**File**: `lib/provisioning/send-welcome-email.ts`

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(
  agencyName: string,
  adminEmail: string,
  instanceUrl: string,
  tempPassword: string
) {
  const html = `
    <h1>Welcome to The Lost Project, ${agencyName}!</h1>
    
    <p>Your dedicated instance is now ready to use.</p>
    
    <h2>Login Details</h2>
    <ul>
      <li><strong>URL:</strong> ${instanceUrl}</li>
      <li><strong>Email:</strong> ${adminEmail}</li>
      <li><strong>Temporary Password:</strong> ${tempPassword}</li>
    </ul>
    
    <h2>Getting Started</h2>
    <ol>
      <li>Visit ${instanceUrl}</li>
      <li>Login with your email and temporary password</li>
      <li>Change your password immediately</li>
      <li>Upload your company logo</li>
      <li>Invite team members</li>
    </ol>
    
    <p>If you have any questions, contact support@thelostproject.in</p>
  `;

  const response = await resend.emails.send({
    from: "noreply@thelostproject.in",
    to: adminEmail,
    subject: `Your ${agencyName} Project Management Instance is Ready`,
    html,
  });

  if (response.error) {
    throw new Error(`Failed to send email: ${response.error.message}`);
  }

  return response.data;
}
```

---

### 2.6: Main Provisioning Orchestrator

**File**: `app/api/admin/agency-onboarding/provision/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createSupabaseProject } from "@/lib/provisioning/supabase-mgmt";
import { deployToVercel } from "@/lib/provisioning/vercel-deploy";
import { runMigrations } from "@/lib/provisioning/run-migrations";
import { sendWelcomeEmail } from "@/lib/provisioning/send-welcome-email";

const ALLOWED_EMAILS = ["adwait@thelostproject.in"];

function isAuthorized(request: Request) {
  const email = request.headers.get("x-user-email")?.toLowerCase();
  return email && ALLOWED_EMAILS.includes(email);
}

/**
 * POST /api/admin/agency-onboarding/provision
 * Orchestrates the full provisioning workflow
 * Background job that can take 5-10 minutes
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId } = await request.json();
  const supabase = createServiceClient();

  try {
    // 1. Get onboarding request
    const { data: req } = await supabase
      .from("agency_onboarding_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    // 2. Create Supabase project
    console.log(`[${requestId}] Creating Supabase project...`);
    const sbProject = await createSupabaseProject(req.agency_name);

    await updateStatus(requestId, "Creating database schema...");

    // 3. Run migrations
    console.log(`[${requestId}] Running migrations...`);
    await runMigrations(sbProject.url, sbProject.keys.anon, sbProject.id);

    await updateStatus(requestId, "Deploying to Vercel...");

    // 4. Deploy to Vercel
    console.log(`[${requestId}] Deploying to Vercel...`);
    const vercelProject = await deployToVercel(
      req.agency_name,
      sbProject.url,
      sbProject.keys.anon,
      sbProject.id
    );

    await updateStatus(requestId, "Setting up admin user...");

    // 5. Create initial admin user in new instance
    const tempPassword = generateTempPassword();
    // TODO: Create user in new Supabase instance

    // 6. Send welcome email
    console.log(`[${requestId}] Sending welcome email...`);
    await sendWelcomeEmail(
      req.agency_name,
      req.admin_email,
      vercelProject.deploymentUrl,
      tempPassword
    );

    // 7. Mark as deployed
    await supabase
      .from("agency_onboarding_requests")
      .update({
        status: "deployed",
        instance_url: vercelProject.deploymentUrl,
        supabase_project_id: sbProject.id,
        vercel_project_id: vercelProject.projectId,
      })
      .eq("id", requestId);

    console.log(`[${requestId}] ✅ Provisioning complete!`);

    return NextResponse.json({
      success: true,
      instanceUrl: vercelProject.deploymentUrl,
      supabaseProjectId: sbProject.id,
    });
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Provisioning failed:`, error.message);

    await supabase
      .from("agency_onboarding_requests")
      .update({
        status: "failed",
        error_message: error.message,
      })
      .eq("id", requestId);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateStatus(requestId: string, status: string) {
  // Store in Redis or DB for frontend polling
  console.log(`[${requestId}] Status: ${status}`);
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

---

## Testing Strategy

### Unit Tests

```bash
npm run test -- lib/provisioning/
```

### Integration Tests

1. **Test Supabase API**: Create fake project
2. **Test Vercel API**: Create fake deployment
3. **Test Email**: Mock Resend service
4. **End-to-End**: Full provisioning flow in staging

### Manual Testing Checklist

- [ ] Click "Approve" on a test request
- [ ] Watch provisioning progress in UI
- [ ] Verify Supabase project created
- [ ] Verify Vercel project created
- [ ] Verify email received with credentials
- [ ] Login to new instance works
- [ ] New instance has clean schema (no agency_id)
- [ ] Dashboard loads without errors

---

## Database Schema Updates

### New Columns in `agency_onboarding_requests`

```sql
ALTER TABLE agency_onboarding_requests ADD COLUMN (
  instance_url TEXT,
  supabase_project_id TEXT,
  vercel_project_id TEXT,
  error_message TEXT,
  provisioning_started_at TIMESTAMP,
  provisioning_completed_at TIMESTAMP
);
```

### New Table for Provisioning Jobs (optional)

```sql
CREATE TABLE provisioning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES agency_onboarding_requests(id),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  current_step TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## Deployment Considerations

### Security

- [ ] All API tokens stored in environment (never in code)
- [ ] Supabase keys scoped to minimal permissions
- [ ] Vercel deployments use separate accounts per environment
- [ ] Temporary passwords sent via email only (never logged)
- [ ] Instance URLs verified before sending

### Monitoring

- [ ] Log all provisioning steps
- [ ] Alert on failures
- [ ] Track provisioning duration
- [ ] Monitor API quota usage (Supabase, Vercel)

### Rollback Plan

If provisioning fails:

1. Mark request as "failed"
2. Log error details
3. Send email to admin with error
4. Manual cleanup needed (delete orphaned projects)

---

## Resources & Documentation

### Supabase Management API

- https://supabase.com/docs/reference/api/
- Project Creation: https://supabase.com/docs/reference/api/create-project
- API Keys: https://supabase.com/docs/reference/api/get-api-keys

### Vercel API

- https://vercel.com/docs/api
- Projects: https://vercel.com/docs/api#endpoints/projects
- Deployments: https://vercel.com/docs/api#endpoints/deployments
- Environment Variables: https://vercel.com/docs/api#endpoints/environment-variables

### Supabase CLI

- For local testing: https://supabase.com/docs/guides/cli
- Migration management: https://supabase.com/docs/guides/cli/managing-migrations

---

## Success Criteria

✅ **Phase 2 Complete When**:

1. Admin can approve agency and see real-time progress
2. New Supabase project created automatically
3. Database schema deployed to new project
4. App deployed to Vercel with correct environment
5. Admin user created in new instance
6. Welcome email sent with login credentials
7. Agency owner can login and use app
8. New instance has zero multi-tenant code (no agency_id references)
9. Two completely isolated instances coexist without interference

---

## Phase 3: Instance Management (Post-Phase 2)

Future enhancements:

- Custom domain mapping
- Instance monitoring dashboard
- Automated backups
- Usage analytics
- Team member invitations
- Instance pause/resume
- Data export/import
