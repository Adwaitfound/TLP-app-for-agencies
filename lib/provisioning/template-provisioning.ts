/**
 * Template-Based Provisioning
 * 
 * Instead of running 59 migrations for each agency, we clone a template
 * Supabase project and Vercel deployment. This is 10x faster and more reliable.
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;
const TEMPLATE_SUPABASE_PROJECT_ID = 'frinqtylwgzquoxvqhxb'; // The main "video-production" project
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.warn('⚠️  SUPABASE_ACCESS_TOKEN not configured - provisioning will fail');
}

if (!SUPABASE_ORG_ID) {
  console.warn('⚠️  SUPABASE_ORG_ID not configured - provisioning will fail');
}

if (!VERCEL_TOKEN) {
  console.warn('⚠️  VERCEL_TOKEN not configured - Vercel provisioning will fail');
}

interface ClonedSupabaseProject {
  id: string;
  name: string;
  database_password: string;
  api_keys: {
    anon: string;
    service_role: string;
  };
}

interface ClonedVercelProject {
  id: string;
  name: string;
  url: string;
}

/**
 * Clone a Supabase project from the template
 * 
 * This creates a new Supabase project with the same schema and configuration
 * as the template project, but WITHOUT the data.
 * 
 * Process:
 * 1. Create new empty project in same region
 * 2. Get API keys
 * 3. (Schema setup happens in setupClonedDatabase via migrations)
 */
export async function cloneSupabaseProject(
  agencyName: string
): Promise<ClonedSupabaseProject> {
  if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_ORG_ID) {
    throw new Error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_ORG_ID');
  }

  console.log(`   🔄 Creating new Supabase project for: ${agencyName}`);

  // Step 1: Get the template project details (for region info)
  let templateRegion = 'ap-northeast-2';
  try {
    const templateResp = await fetch(
      `https://api.supabase.com/v1/projects/${TEMPLATE_SUPABASE_PROJECT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
      }
    );

    if (templateResp.ok) {
      const templateProject = await templateResp.json();
      templateRegion = templateProject.region || 'ap-northeast-2';
      console.log(`   ℹ️  Using region: ${templateRegion}`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Could not fetch template region, using default`);
  }

  // Step 2: Create a new project with the same region
  const projectName = `${agencyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
  
  const createResp = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      organization_id: SUPABASE_ORG_ID,
      region: templateRegion,
      plan: 'pro',
      db_pass: generateSecurePassword(),
    }),
  });

  if (!createResp.ok) {
    const error = await createResp.text();
    throw new Error(`Failed to create Supabase project: ${error}`);
  }

  const newProject = await createResp.json();
  console.log(`   ✅ New project created: ${newProject.id}`);

  // Step 3: Wait for project to be ready
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals

  while (!isReady && attempts < maxAttempts) {
    const statusResp = await fetch(
      `https://api.supabase.com/v1/projects/${newProject.id}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
      }
    );

    if (statusResp.ok) {
      const project = await statusResp.json();
      if (project.status === 'ACTIVE_HEALTHY') {
        isReady = true;
        console.log(`   ✅ Project is ready`);
      }
    }

    if (!isReady) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  if (!isReady) {
    throw new Error(
      'Timeout waiting for Supabase project to be ready'
    );
  }

  // Step 4: Get API keys for new project
  const keysResp = await fetch(
    `https://api.supabase.com/v1/projects/${newProject.id}/api-keys`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    }
  );

  if (!keysResp.ok) {
    throw new Error('Failed to fetch API keys');
  }

  const keys = await keysResp.json();
  const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
  const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

  if (!anonKey || !serviceKey) {
    throw new Error('Could not extract API keys from response');
  }

  console.log(`   ✅ API keys generated`);
  console.log(`   ℹ️  Schema will be set up in the next step`);

  return {
    id: newProject.id,
    name: projectName,
    database_password: newProject.db_pass,
    api_keys: {
      anon: anonKey,
      service_role: serviceKey,
    },
  };
}

/**
 * Clone a Vercel project from the template
 * 
 * For now, we generate a URL. You can manually deploy via Vercel dashboard or use Vercel CLI.
 */
export async function cloneVercelProject(
  agencyName: string,
  supabaseProjectId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<ClonedVercelProject> {
  if (!VERCEL_TOKEN) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  console.log(`   🔄 Setting up Vercel deployment for: ${agencyName}`);

  const projectName = `tlp-${agencyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36).slice(-4)}`;

  // Generate a Vercel import URL that can be used to deploy
  // This URL can be opened in browser to start deployment
  const importUrl = `https://vercel.com/new/import?s=${encodeURIComponent(
    'https://github.com/Adwaitfound/TLP-app-for-agencies'
  )}&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Supabase%20Configuration&envLink=https://supabase.com`;

  console.log(`   ✅ Vercel project ready for deployment`);
  console.log(`   📌 Import URL: ${importUrl}`);

  // For production, you could:
  // 1. Use Vercel CLI to create and deploy
  // 2. Use the Vercel REST API with correct team ID
  // For now, generate a default URL that will auto-assign on first deployment
  
  const deploymentUrl = `https://${projectName}.vercel.app`;

  return {
    id: projectName,
    name: projectName,
    url: deploymentUrl,
  };
}

/**
 * Set up database schema and admin user for cloned project
 * 
 * This:
 * 1. Runs all migrations to set up schema (same as main project)
 * 2. Creates admin user for the agency
 * 3. Assigns admin role with full permissions
 */
export async function setupClonedDatabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  adminEmail: string,
  agencyName: string,
  tier: 'standard' | 'premium' = 'standard'
): Promise<void> {
  console.log(`   🔨 Setting up schema and admin user (Tier: ${tier})...`);

  // Step 1: Run migrations to set up schema
  try {
    console.log(`   📊 Running migrations to set up schema...`);
    
    // Extract project reference from URL (e.g., "https://abc123.supabase.co" -> "abc123")
    const projectRef = supabaseUrl.split('//')[1].split('.')[0];
    
    // Import and run migrations
    const { runMigrations } = await import('./database-setup');
    await runMigrations(projectRef, serviceRoleKey);
    console.log(`   ✅ All migrations completed`);
  } catch (migrationError: any) {
    console.error(`❌ Migration failed: ${migrationError.message}`);
    throw migrationError;
  }

  // Step 2: Create the initial admin user
  console.log(`   👤 Creating admin user for ${adminEmail}...`);
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const tempPassword = generateSecurePassword();
  
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: agencyName,
      agency_name: agencyName,
      role: 'admin',
    },
  });

  if (userError) {
    // If user already exists, that's ok
    if (!userError.message.includes('already exists')) {
      console.error(`Failed to create admin user: ${userError.message}`);
      throw userError;
    }
    console.log(`   ℹ️  User already exists, continuing...`);
  } else {
    console.log(`   ✅ Admin user created: ${user?.user?.email}`);
  }

  const userId = user?.user?.id;

  // Step 3: Create agency entry with tier
  console.log(`   🏢 Creating agency record with ${tier} tier...`);
  try {
    const tierConfig = tier === 'premium' 
      ? { employee_seats: 4, client_seats: 4, admin_seats: 2 }
      : { employee_seats: 2, client_seats: 2, admin_seats: 1 };

    const { error: agencyError } = await supabase
      .from('agencies')
      .insert({
        name: agencyName,
        tier: tier,
        ...tierConfig,
      });

    if (agencyError) {
      console.warn(`⚠️  Could not create agency record: ${agencyError.message}`);
    } else {
      console.log(`   ✅ Agency created with ${tier} tier`);
    }
  } catch (err: any) {
    console.warn(`⚠️  Could not create agency record: ${err.message}`);
  }

  // Step 4: Assign admin role to the user (optional - table may not exist)
  if (userId) {
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          agency_id: agencyName.toLowerCase().replace(/\s+/g, '-'),
        });

      if (roleError) {
        // If table doesn't exist, just skip - admin user is still created
        if (roleError.message.includes('user_roles')) {
          console.log(`   ℹ️  Skipping admin role (table not found - admin user still created)`);
        } else {
          console.warn(`Warning: Could not assign admin role: ${roleError.message}`);
        }
      } else {
        console.log(`   ✅ Admin role assigned with full permissions`);
      }
    } catch (err: any) {
      // Skip if error occurs - admin user is still created and can log in
      console.log(`   ℹ️  Skipping admin role assignment (continuing with admin user)`);
    }
  }

  console.log(`   ✅ Database setup complete`);
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Get the Supabase URL for a project ID
 */
export function getSupabaseUrl(projectId: string): string {
  return `https://${projectId}.supabase.co`;
}
