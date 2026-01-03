/**
 * Supabase Management API Client
 * 
 * This module handles all interactions with the Supabase Management API
 * for creating and managing agency-specific Supabase projects.
 * 
 * API Documentation: https://supabase.com/docs/reference/api
 */

import crypto from 'crypto';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_ORG_ID = process.env.SUPABASE_ORG_ID;

if (!SUPABASE_ACCESS_TOKEN) {
  console.warn('⚠️  SUPABASE_ACCESS_TOKEN not configured - provisioning will fail');
}

if (!SUPABASE_ORG_ID) {
  console.warn('⚠️  SUPABASE_ORG_ID not configured - provisioning will fail');
}

interface SupabaseProject {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  created_at: string;
  database: {
    host: string;
    version: string;
  };
  status: 'ACTIVE_HEALTHY' | 'COMING_UP' | 'UNKNOWN' | 'INACTIVE' | 'GOING_DOWN';
}

interface CreateProjectResponse {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  database_password: string;
  api_keys: {
    anon: string;
    service_role: string;
  };
}

/**
 * Generate a secure random password for database
 */
function generateSecurePassword(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Generate a URL-safe project name from agency name
 */
export function generateProjectName(agencyName: string): string {
  return `tlp-${agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)}`; // Supabase has length limits
}

/**
 * Create a new Supabase project for an agency
 * 
 * @param agencyName - The name of the agency
 * @param region - AWS region (default: us-east-1)
 * @returns Project details including API keys
 */
export async function createSupabaseProject(
  agencyName: string,
  region = 'us-east-1'
): Promise<CreateProjectResponse> {
  if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_ORG_ID) {
    throw new Error('Supabase Management API not configured. Set SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID');
  }

  const projectName = generateProjectName(agencyName);
  const dbPassword = generateSecurePassword();

  console.log(`Creating Supabase project: ${projectName} in ${region}`);

  const response = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      organization_id: SUPABASE_ORG_ID,
      db_pass: dbPassword,
      region: region,
      plan: 'free', // Start with free tier
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Supabase project: ${response.status} ${error}`);
  }

  const project = await response.json();
  console.log(`✅ Supabase project created: ${project.id}`);

  // Wait for project to be fully provisioned
  await waitForProjectReady(project.id);

  // Fetch the API keys from the dedicated keys endpoint
  const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${project.id}/api-keys`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
  });

  if (!keysResponse.ok) {
    const errorText = await keysResponse.text();
    console.warn('⚠️ Could not fetch API keys from management endpoint:', keysResponse.status, errorText);
  }

  let serviceRoleKey = '';
  let anonKey = '';

  if (keysResponse.ok) {
    const keys = await keysResponse.json();
    console.log('📦 Keys response:', JSON.stringify(keys, null, 2));
    
    const serviceRoleKeyObj = keys.find((k: any) => k.name === 'service_role');
    const anonKeyObj = keys.find((k: any) => k.name === 'anon');
    
    serviceRoleKey = serviceRoleKeyObj?.api_key || '';
    anonKey = anonKeyObj?.api_key || '';

    console.log('✅ API keys retrieved from management endpoint');
    console.log('  - Anon key:', anonKey.substring(0, 20) + '...');
    console.log('  - Service role key:', serviceRoleKey.substring(0, 20) + '...');
  } else {
    console.error('❌ Failed to retrieve API keys - returning empty strings');
  }

  return {
    id: project.id,
    name: projectName,
    organization_id: SUPABASE_ORG_ID,
    region: region,
    database_password: dbPassword,
    api_keys: {
      anon: anonKey,
      service_role: serviceRoleKey,
    },
  };
}

/**
 * Get the status of a Supabase project
 */
export async function getProjectStatus(projectId: string): Promise<SupabaseProject> {
  if (!SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN not configured');
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get project status: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Poll until project is ready (status: ACTIVE_HEALTHY)
 * 
 * @param projectId - The Supabase project ID
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 5 minutes)
 */
export async function waitForProjectReady(
  projectId: string,
  maxWaitMs = 300000 // 5 minutes
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds

  console.log(`⏳ Waiting for project ${projectId} to be ready...`);

  while (Date.now() - startTime < maxWaitMs) {
    const project = await getProjectStatus(projectId);

    if (project.status === 'ACTIVE_HEALTHY') {
      console.log(`✅ Project ${projectId} is ready!`);
      return;
    }

    if (project.status === 'INACTIVE' || project.status === 'GOING_DOWN') {
      throw new Error(`Project entered unexpected state: ${project.status}`);
    }

    console.log(`   Status: ${project.status}, waiting ${pollInterval}ms...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Project ${projectId} did not become ready within ${maxWaitMs}ms`);
}

/**
 * Get the API URL for a Supabase project
 */
export function getProjectUrl(projectId: string): string {
  return `https://${projectId}.supabase.co`;
}

/**
 * Delete a Supabase project (use with caution!)
 */
export async function deleteSupabaseProject(projectId: string): Promise<void> {
  if (!SUPABASE_ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN not configured');
  }

  console.warn(`⚠️  Deleting Supabase project: ${projectId}`);

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete project: ${response.status} ${error}`);
  }

  console.log(`✅ Project ${projectId} deleted`);
}
