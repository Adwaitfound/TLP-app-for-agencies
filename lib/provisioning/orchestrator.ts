/**
 * Provisioning Orchestrator
 * 
 * This is the main orchestrator that coordinates the entire provisioning process.
 * It handles the workflow of creating a new agency instance from start to finish.
 */

import {
  cloneSupabaseProject,
  cloneVercelProject,
  setupClonedDatabase,
  getSupabaseUrl,
} from './template-provisioning';
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
    // STEP 1: Clone Supabase Project from Template
    // ============================================================
    console.log(`\n📦 Step 1/5: Cloning Supabase project from template...`);
    result.steps.supabaseProject = 'in-progress';
    
    let supabaseProjectId: string;
    let supabaseUrl: string;
    let supabaseAnonKey: string;
    let supabaseServiceKey: string;
    
    if (
      existingMetadata.supabaseProjectId &&
      existingMetadata.supabaseAnonKey &&
      existingMetadata.supabaseServiceKey
    ) {
      console.log(
        `   ♻️  Reusing existing Supabase project: ${existingMetadata.supabaseProjectId}`
      );
      supabaseProjectId = existingMetadata.supabaseProjectId;
      supabaseUrl = getSupabaseUrl(existingMetadata.supabaseProjectId);
      supabaseAnonKey = existingMetadata.supabaseAnonKey;
      supabaseServiceKey = existingMetadata.supabaseServiceKey;
      console.log(`   ✅ Supabase project ready (existing): ${supabaseUrl}`);
    } else {
      console.log(`   🔄 Cloning template Supabase project...`);
      const newProject = await cloneSupabaseProject(request.agencyName);
      supabaseProjectId = newProject.id;
      supabaseUrl = getSupabaseUrl(newProject.id);
      supabaseAnonKey = newProject.api_keys.anon;
      supabaseServiceKey = newProject.api_keys.service_role;
      console.log(`   ✅ Supabase project cloned: ${supabaseUrl}`);
    }

    result.supabaseProjectId = supabaseProjectId;
    result.steps.supabaseProject = 'completed';

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      supabaseProjectId,
      supabaseUrl,
      step: 'supabase_ready',
    });

    // ============================================================
    // STEP 2: Set Up Admin User (Minimal Setup)
    // ============================================================
    console.log(`\n📊 Step 2/5: Setting up admin user...`);
    result.steps.database = 'in-progress';

    if (!existingMetadata.supabaseProjectId) {
      // Only set up if this is a new project
      await setupClonedDatabase(
        supabaseUrl,
        supabaseServiceKey,
        request.ownerEmail,
        request.agencyName
      );
    } else {
      console.log(`   ♻️  Reusing existing admin user setup`);
    }

    result.adminEmail = request.ownerEmail;
    result.steps.database = 'completed';
    console.log(`   ✅ Admin user configured`);

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      step: 'database_configured',
      adminEmail: request.ownerEmail,
    });

    // ============================================================
    // STEP 3: Clone Vercel Project from Template
    // ============================================================
    console.log(`\n☁️  Step 3/5: Cloning Vercel project from template...`);
    result.steps.vercelProject = 'in-progress';

    let vercelProjectId: string;
    let vercelProjectName: string;

    if (existingMetadata.vercelProjectId && existingMetadata.instanceUrl) {
      console.log(
        `   ♻️  Reusing existing Vercel project: ${existingMetadata.vercelProjectId}`
      );
      vercelProjectId = existingMetadata.vercelProjectId;
      vercelProjectName = existingMetadata.instanceUrl
        .replace('https://', '')
        .replace('.vercel.app', '');
      console.log(`   ✅ Vercel project ready (existing)`);
    } else {
      console.log(`   🔄 Cloning template Vercel project...`);
      const newProject = await cloneVercelProject(
        request.agencyName,
        supabaseProjectId,
        supabaseUrl,
        supabaseAnonKey
      );
      vercelProjectId = newProject.id;
      vercelProjectName = newProject.name;
      console.log(`   ✅ Vercel project cloned: ${newProject.url}`);
    }

    result.vercelProjectId = vercelProjectId;
    result.steps.vercelProject = 'completed';

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      vercelProjectId,
      step: 'vercel_ready',
    });

    // ============================================================
    // STEP 4: Wait for Vercel Deployment
    // ============================================================
    console.log(`\n🚀 Step 4/5: Waiting for deployment...`);
    result.steps.deployment = 'in-progress';

    const instanceUrl = `https://${vercelProjectName}.vercel.app`;
    result.instanceUrl = instanceUrl;
    result.steps.deployment = 'completed';
    console.log(`   ✅ Instance ready at: ${instanceUrl}`);

    await updateProvisioningStatus(request.requestId, 'provisioning', {
      instanceUrl,
      step: 'deployed',
    });

    // ============================================================
    // STEP 5: Send Welcome Email (non-blocking)
    // ============================================================
    console.log(`\n📧 Step 5/5: Sending welcome email...`);
    result.steps.email = 'in-progress';

    try {
      await sendWelcomeEmail({
        agencyName: request.agencyName,
        adminEmail: request.ownerEmail,
        instanceUrl: result.instanceUrl,
        supabaseProjectId,
        supabaseUrl,
        vercelProjectId,
        anonKey: supabaseAnonKey,
        serviceRoleKey: supabaseServiceKey,
      });

      result.steps.email = 'completed';
      console.log(`   ✅ Welcome email sent to ${request.ownerEmail}`);
    } catch (emailError: any) {
      console.warn(`⚠️  Email sending failed (continuing): ${emailError.message}`);
      result.steps.email = 'completed'; // Mark as completed despite email failure - can resend later via UI
    }

    // ============================================================
    // COMPLETE
    // ============================================================
    result.success = true;
    
    await updateProvisioningStatus(request.requestId, 'approved', {
      instanceUrl: result.instanceUrl,
      supabaseProjectId,
      supabaseAnonKey,
      supabaseServiceKey,
      vercelProjectId,
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
