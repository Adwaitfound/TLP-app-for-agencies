/**
 * Vercel Deployment API Client
 * 
 * This module handles automatic deployment of agency instances to Vercel.
 * Each agency gets their own Vercel project with environment variables configured.
 * 
 * API Documentation: https://vercel.com/docs/rest-api
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional for teams
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;

if (!VERCEL_TOKEN) {
  console.warn('⚠️  VERCEL_TOKEN not configured - deployment will fail');
}

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  framework: string;
  link?: {
    type: 'github';
    repo: string;
    repoId: number;
    org?: string;
    gitCredentialId?: string;
  };
}

interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyState: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  ready?: number;
}

interface DeploymentConfig {
  projectName: string;
  agencyName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
}

/**
 * Generate a Vercel project name from agency name
 */
export function generateVercelProjectName(agencyName: string): string {
  return `tlp-${agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)}`;
}

/**
 * Create a new Vercel project for an agency
 */
export async function createVercelProject(
  agencyName: string
): Promise<VercelProject> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  const projectName = generateVercelProjectName(agencyName);
  
  console.log(`Creating Vercel project: ${projectName}`);

  const url = VERCEL_TEAM_ID 
    ? `https://api.vercel.com/v9/projects?teamId=${VERCEL_TEAM_ID}`
    : 'https://api.vercel.com/v9/projects';

  const payload: any = {
    name: projectName,
    framework: 'nextjs',
    buildCommand: 'npm run build',
    devCommand: 'npm run dev',
    installCommand: 'npm install',
    outputDirectory: '.next',
  };

  // Link to GitHub repo if configured
  if (GITHUB_REPO_OWNER && GITHUB_REPO_NAME) {
    payload.gitRepository = {
      type: 'github',
      repo: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Vercel project: ${response.status} ${error}`);
  }

  const project = await response.json();
  console.log(`✅ Vercel project created: ${project.id}`);

  return project;
}

/**
 * Set environment variables for a Vercel project
 */
export async function setEnvironmentVariables(
  projectId: string,
  config: DeploymentConfig
): Promise<void> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  console.log(`Setting environment variables for project ${projectId}`);

  const envVars = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: config.supabaseUrl,
      target: ['production', 'preview', 'development'],
      type: 'encrypted',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: config.supabaseAnonKey,
      target: ['production', 'preview', 'development'],
      type: 'encrypted',
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      value: config.supabaseServiceKey,
      target: ['production', 'preview', 'development'],
      type: 'sensitive',
    },
    {
      key: 'AGENCY_NAME',
      value: config.agencyName,
      target: ['production', 'preview', 'development'],
      type: 'encrypted',
    },
  ];

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v10/projects/${projectId}/env`;

  // Create each environment variable
  for (const envVar of envVars) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envVar),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to set ${envVar.key}: ${error}`);
      throw new Error(`Failed to set environment variable ${envVar.key}`);
    }

    console.log(`   ✓ Set ${envVar.key}`);
  }

  console.log(`✅ Environment variables configured`);
}

/**
 * Trigger a new deployment
 */
export async function triggerDeployment(
  projectId: string,
  gitBranch = 'main'
): Promise<VercelDeployment> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  console.log(`Triggering deployment for project ${projectId}`);

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`
    : 'https://api.vercel.com/v13/deployments';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectId,
      gitSource: {
        type: 'github',
        ref: gitBranch,
        repoId: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
      },
      target: 'production',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger deployment: ${response.status} ${error}`);
  }

  const deployment = await response.json();
  console.log(`✅ Deployment triggered: ${deployment.id}`);

  return deployment;
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(deploymentId: string): Promise<VercelDeployment> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v13/deployments/${deploymentId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get deployment status: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Wait for deployment to complete
 */
export async function waitForDeployment(
  deploymentId: string,
  maxWaitMs = 600000 // 10 minutes
): Promise<VercelDeployment> {
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds

  console.log(`⏳ Waiting for deployment ${deploymentId} to complete...`);

  while (Date.now() - startTime < maxWaitMs) {
    const deployment = await getDeploymentStatus(deploymentId);

    if (deployment.readyState === 'READY') {
      console.log(`✅ Deployment ready: https://${deployment.url}`);
      return deployment;
    }

    if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
      throw new Error(`Deployment failed with state: ${deployment.readyState}`);
    }

    console.log(`   Status: ${deployment.readyState}, waiting ${pollInterval}ms...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Deployment ${deploymentId} did not complete within ${maxWaitMs}ms`);
}

/**
 * Delete a Vercel project (use with caution!)
 */
export async function deleteVercelProject(projectId: string): Promise<void> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  console.warn(`⚠️  Deleting Vercel project: ${projectId}`);

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v9/projects/${projectId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete project: ${response.status} ${error}`);
  }

  console.log(`✅ Vercel project ${projectId} deleted`);
}
