/**
 * Provisioning Orchestrator
 * 
 * This is the main orchestrator that coordinates the entire provisioning process.
 * It handles the workflow of creating a new agency instance from start to finish.
 */

import { createSupabaseProject, getProjectUrl, waitForProjectReady } from './supabase-mgmt';
import { 
  createVercelProject, 
  setEnvironmentVariables, 
  triggerDeployment, 
  waitForDeployment,
  generateVercelProjectName 
} from './vercel-mgmt';
import { setupDatabase } from './database-setup';
import { sendWelcomeEmail, sendProvisioningStatusEmail, generateTempPassword } from './email-service';
import { createClient } from '@supabase/supabase-js';

const MAIN_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const MAIN_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface ProvisioningRequest {
  requestId: string;
  agencyName: string;
  ownerEmail: string;
  ownerName: string;
}

export interface ProvisioningResult {
  success: boolean;
  requestId: string;
  agencyName: string;
  instanceUrl?: string;
  supabaseProjectId?: string;
  vercelProjectId?: string;
  adminEmail?: string;
  error?: string;
  steps: {
    supabaseProject: 'pending' | 'in-progress' | 'completed' | 'failed';
    database: 'pending' | 'in-progress' | 'completed' | 'failed';
    vercelProject: 'pending' | 'in-progress' | 'completed' | 'failed';
    deployment: 'pending' | 'in-progress' | 'completed' | 'failed';
    email: 'pending' | 'in-progress' | 'completed' | 'failed';
  };
}

/**
 * Update provisioning status in the database
 */
async function updateProvisioningStatus(
  requestId: string,
  status: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createClient(MAIN_SUPABASE_URL, MAIN_SERVICE_KEY);

  const { error } = await supabase
    .from('agency_onboarding_requests')
    .update({
      status,
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error(`Failed to update status: ${error.message}`);
  }
}

/**
 * Main provisioning orchestrator
 * 
 * This function coordinates all the steps required to provision a new agency instance:
 * 1. Create Supabase project
 * 2. Set up database schema and admin user
 * 3. Create Vercel project
 * 4. Configure environment variables
 * 5. Deploy application
 * 6. Send welcome email
 */
export async function provisionAgency(request: ProvisioningRequest): Promise<ProvisioningResult> {
  const result: ProvisioningResult = {
    success: false,
    requestId: request.requestId,
    agencyName: request.agencyName,
    steps: {
      supabaseProject: 'pending',
      database: 'pending',
      vercelProject: 'pending',
      deployment: 'pending',
      email: 'pending',
    },
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Starting provisioning for: ${request.agencyName}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Update status to provisioning
    await updateProvisioningStatus(request.requestId, 'provisioning', {
      started_at: new Date().toISOString(),
    });

    // ============================================================
    // STEP 1: Create Supabase Project
    // ============================================================
    console.log(`\n📦 Step 1/5: Creating Supabase project...`);
    result.steps.supabaseProject = 'in-progress';
    
    const supabaseProject = await createSupabaseProject(request.agencyName);
    result.supabaseProjectId = supabaseProject.id;
    result.steps.supabaseProject = 'completed';
    
    const supabaseUrl = getProjectUrl(supabaseProject.id);
    console.log(`   ✅ Supabase project ready: ${supabaseUrl}`);

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      supabaseProjectId: supabaseProject.id,
      supabaseUrl,
      step: 'supabase_created',
    });

    // ============================================================
    // STEP 2: Set Up Database
    // ============================================================
    console.log(`\n📊 Step 2/5: Setting up database...`);
    result.steps.database = 'in-progress';
    
    const adminPassword = generateTempPassword();
    
    await setupDatabase(
      supabaseUrl,
      supabaseProject.api_keys.service_role,
      request.ownerEmail,
      adminPassword,
      request.agencyName
    );
    
    result.adminEmail = request.ownerEmail;
    result.steps.database = 'completed';
    console.log(`   ✅ Database configured with admin user`);

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      step: 'database_configured',
      adminEmail: request.ownerEmail,
    });

    // ============================================================
    // STEP 3: Create Vercel Project
    // ============================================================
    console.log(`\n☁️  Step 3/5: Creating Vercel project...`);
    result.steps.vercelProject = 'in-progress';
    
    const vercelProject = await createVercelProject(request.agencyName);
    result.vercelProjectId = vercelProject.id;
    result.steps.vercelProject = 'completed';
    
    console.log(`   ✅ Vercel project created: ${vercelProject.name}`);

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      vercelProjectId: vercelProject.id,
      step: 'vercel_created',
    });

    // ============================================================
    // STEP 4: Configure & Deploy
    // ============================================================
    console.log(`\n🔧 Step 4/5: Configuring environment and deploying...`);
    result.steps.deployment = 'in-progress';
    
    // Set environment variables
    await setEnvironmentVariables(vercelProject.id, {
      projectName: vercelProject.name,
      agencyName: request.agencyName,
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseProject.api_keys.anon,
      supabaseServiceKey: supabaseProject.api_keys.service_role,
    });

    // Trigger deployment
    const deployment = await triggerDeployment(vercelProject.id);
    
    // Wait for deployment to complete
    const completedDeployment = await waitForDeployment(deployment.id);
    result.instanceUrl = `https://${completedDeployment.url}`;
    result.steps.deployment = 'completed';
    
    console.log(`   ✅ Deployment complete: ${result.instanceUrl}`);

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      instanceUrl: result.instanceUrl,
      deploymentId: deployment.id,
      step: 'deployed',
    });

    // ============================================================
    // STEP 5: Send Welcome Email
    // ============================================================
    console.log(`\n📧 Step 5/5: Sending welcome email...`);
    result.steps.email = 'in-progress';
    
    await sendWelcomeEmail({
      agencyName: request.agencyName,
      adminEmail: request.ownerEmail,
      adminPassword: adminPassword,
      instanceUrl: result.instanceUrl,
      supabaseUrl: supabaseUrl,
    });
    
    result.steps.email = 'completed';
    console.log(`   ✅ Welcome email sent to ${request.ownerEmail}`);

    // ============================================================
    // COMPLETE
    // ============================================================
    result.success = true;
    
    await updateProvisioningStatus(request.requestId, 'approved', {
      instanceUrl: result.instanceUrl,
      supabaseProjectId: supabaseProject.id,
      vercelProjectId: vercelProject.id,
      completed_at: new Date().toISOString(),
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Provisioning complete for: ${request.agencyName}`);
    console.log(`   Instance URL: ${result.instanceUrl}`);
    console.log(`${'='.repeat(60)}\n`);

    // Send success notification to admin
    await sendProvisioningStatusEmail({
      adminEmail: request.ownerEmail,
      agencyName: request.agencyName,
      status: 'success',
      instanceUrl: result.instanceUrl,
    });

    return result;

  } catch (error: any) {
    // ============================================================
    // ERROR HANDLING
    // ============================================================
    console.error(`\n❌ Provisioning failed for ${request.agencyName}:`);
    console.error(error);

    result.success = false;
    result.error = error.message || 'Unknown error';

    await updateProvisioningStatus(request.requestId, 'failed', {
      error: error.message,
      failed_at: new Date().toISOString(),
      steps: result.steps,
    });

    // Send failure notification
    await sendProvisioningStatusEmail({
      adminEmail: request.ownerEmail,
      agencyName: request.agencyName,
      status: 'failed',
      errorMessage: error.message,
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`❌ Provisioning failed for: ${request.agencyName}`);
    console.log(`${'='.repeat(60)}\n`);

    return result;
  }
}

/**
 * Get provisioning status for a request
 */
export async function getProvisioningStatus(requestId: string): Promise<any> {
  const supabase = createClient(MAIN_SUPABASE_URL, MAIN_SERVICE_KEY);

  const { data, error } = await supabase
    .from('agency_onboarding_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    throw new Error(`Failed to get provisioning status: ${error.message}`);
  }

  return {
    requestId: data.id,
    status: data.status,
    agencyName: data.agency_name,
    metadata: data.metadata || {},
  };
}
