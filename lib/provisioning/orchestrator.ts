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
  linkGitHubRepo,
  generateVercelProjectName 
} from './vercel-mgmt';
import { setupDatabase } from './database-setup';
import { sendWelcomeEmail, sendProvisioningStatusEmail } from './email-service';
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
    // Check for existing projects in metadata
    const supabase = createClient(MAIN_SUPABASE_URL, MAIN_SERVICE_KEY);
    const { data: existingRequest } = await supabase
      .from('agency_onboarding_requests')
      .select('metadata')
      .eq('id', request.requestId)
      .single();

    const existingMetadata = existingRequest?.metadata || {};
    
    // Update status to provisioning
    await updateProvisioningStatus(request.requestId, 'provisioning', {
      started_at: new Date().toISOString(),
    });

    // ============================================================
    // STEP 1: Create or Reuse Supabase Project
    // ============================================================
    console.log(`\n📦 Step 1/5: Setting up Supabase project...`);
    result.steps.supabaseProject = 'in-progress';
    
    let supabaseProject;
    let supabaseUrl;
    
    if (existingMetadata.supabaseProjectId && existingMetadata.supabaseAnonKey && existingMetadata.supabaseServiceKey) {
      console.log(`   ♻️  Reusing existing Supabase project: ${existingMetadata.supabaseProjectId}`);
      supabaseProject = {
        id: existingMetadata.supabaseProjectId,
        api_keys: {
          anon: existingMetadata.supabaseAnonKey,
          service_role: existingMetadata.supabaseServiceKey,
        }
      };
      supabaseUrl = getProjectUrl(supabaseProject.id);
      console.log(`   ✅ Supabase project ready (existing): ${supabaseUrl}`);
    } else {
      console.log(`   🆕 Creating new Supabase project...`);
      supabaseProject = await createSupabaseProject(request.agencyName);
      supabaseUrl = getProjectUrl(supabaseProject.id);
      console.log(`   ✅ Supabase project created: ${supabaseUrl}`);
    }
    
    result.supabaseProjectId = supabaseProject.id;
    result.steps.supabaseProject = 'completed';

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      supabaseProjectId: supabaseProject.id,
      supabaseUrl,
      step: 'supabase_ready',
    });

    // ============================================================
    // STEP 2: Set Up Database
    // ============================================================
    console.log(`\n📊 Step 2/5: Setting up database...`);
    result.steps.database = 'in-progress';
    
    await setupDatabase(
      supabaseUrl,
      supabaseProject.api_keys.service_role,
      request.ownerEmail,
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
    // STEP 3: Create or Reuse Vercel Project
    // ============================================================
    console.log(`\n☁️  Step 3/5: Setting up Vercel project...`);
    result.steps.vercelProject = 'in-progress';
    
    let vercelProject;
    
    if (existingMetadata.vercelProjectId && existingMetadata.instanceUrl) {
      console.log(`   ♻️  Reusing existing Vercel project: ${existingMetadata.vercelProjectId}`);
      vercelProject = {
        id: existingMetadata.vercelProjectId,
        name: existingMetadata.instanceUrl.replace('https://', '').replace('.vercel.app', ''),
      };
      console.log(`   ✅ Vercel project ready (existing): ${vercelProject.name}`);
    } else {
      console.log(`   🆕 Creating new Vercel project...`);
      vercelProject = await createVercelProject(request.agencyName);
      console.log(`   ✅ Vercel project created: ${vercelProject.name}`);
    }
    
    result.vercelProjectId = vercelProject.id;
    result.steps.vercelProject = 'completed';

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      vercelProjectId: vercelProject.id,
      step: 'vercel_ready',
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

    // Link GitHub repository
    await linkGitHubRepo(vercelProject.id, vercelProject.name);

    // Try to trigger deployment, but don't fail if it doesn't work
    let deploymentUrl = `https://${vercelProject.name}.vercel.app`;
    try {
      const deployment = await triggerDeployment(vercelProject.id);
      const completedDeployment = await waitForDeployment(deployment.id);
      deploymentUrl = `https://${completedDeployment.url}`;
      console.log(`   ✅ Deployment complete: ${deploymentUrl}`);
    } catch (deploymentError: any) {
      console.warn(`⚠️  Deployment trigger failed (continuing anyway): ${deploymentError.message}`);
      console.log(`   📌 Using default URL: ${deploymentUrl}`);
    }
    
    result.instanceUrl = deploymentUrl;
    result.steps.deployment = 'completed';

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      instanceUrl: result.instanceUrl,
      step: 'deployed',
    });

    // ============================================================
    // STEP 5: Send Welcome Email
    // ============================================================
    console.log(`\n📧 Step 5/5: Sending welcome email...`);
    result.steps.email = 'in-progress';
    
    console.log('📋 Email data being sent:');
    console.log('   - supabaseProjectId:', supabaseProject.id);
    console.log('   - anonKey:', supabaseProject.api_keys.anon?.substring?.(0, 20) || 'EMPTY');
    console.log('   - serviceRoleKey:', supabaseProject.api_keys.service_role?.substring?.(0, 20) || 'EMPTY');
    
    try {
      await sendWelcomeEmail({
        agencyName: request.agencyName,
        adminEmail: request.ownerEmail,
        instanceUrl: result.instanceUrl,
        supabaseProjectId: supabaseProject.id,
        supabaseUrl: supabaseUrl,
        vercelProjectId: vercelProject.id,
        anonKey: supabaseProject.api_keys.anon,
        serviceRoleKey: supabaseProject.api_keys.service_role,
      });
      
      result.steps.email = 'completed';
      console.log(`   ✅ Welcome email sent to ${request.ownerEmail}`);
    } catch (emailError: any) {
      console.warn(`   ⚠️  Email sending failed (non-blocking): ${emailError.message}`);
      console.warn(`   💡 User can access instance directly at: ${result.instanceUrl}`);
      result.steps.email = 'skipped';
      // Don't throw - email failure shouldn't block provisioning
    }

    // ============================================================
    // COMPLETE
    // ============================================================
    result.success = true;
    
    await updateProvisioningStatus(request.requestId, 'approved', {
      instanceUrl: result.instanceUrl,
      supabaseProjectId: supabaseProject.id,
      supabaseAnonKey: supabaseProject.api_keys.anon,
      supabaseServiceKey: supabaseProject.api_keys.service_role,
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
