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
const GITHUB_REPO_OWNER = 'Adwaitfound';
const GITHUB_REPO_NAME = 'TLP-app-for-agencies';

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

  // Note: Repo linking happens after project creation via Vercel dashboard
  // Each project needs manual Git connection or we'd need GitHub App authentication

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // If project already exists (409 conflict), try to retrieve it
  if (response.status === 409) {
    console.log(`Project ${projectName} already exists, retrieving existing project...`);
    const getUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${projectName}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${projectName}`;
    
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (getResponse.ok) {
      const existingProject = await getResponse.json();
      console.log(`✅ Using existing Vercel project: ${existingProject.id}`);
      return existingProject;
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Vercel project: ${response.status} ${error}`);
  }

  const project = await response.json();
  console.log(`✅ Vercel project created: ${project.id}`);

  return project;
}

/**
 * Link GitHub repository to Vercel project
 */
export async function linkGitHubRepo(
  projectId: string,
  projectName: string
): Promise<void> {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured');
  }

  console.log(`Linking GitHub repo to project ${projectName}...`);

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v9/projects/${projectId}/link?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v9/projects/${projectId}/link`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'github',
      repo: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
      gitBranch: 'main',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.warn(`⚠️  Could not link GitHub repo: ${error}`);
    // Don't fail - we can link manually via dashboard
    return;
  }

  console.log(`✅ GitHub repo linked to project`);
  
  // Wait a moment for Vercel to process the link
  await new Promise(resolve => setTimeout(resolve, 2000));
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
      target: ['production', 'preview'], // Sensitive vars can't be in development
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

  // Create or update each environment variable
  for (const envVar of envVars) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envVar),
    });

    // If variable already exists (409 or ENV_CONFLICT), try to update it
    if (!response.ok) {
      const errorBody = await response.text();
      if (errorBody.includes('ENV_CONFLICT') || response.status === 409) {
        console.log(`   ℹ ${envVar.key} already exists, updating...`);
        
        // Try to update the existing variable
        // First, get the existing variable ID
        const getUrl = VERCEL_TEAM_ID
          ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${VERCEL_TEAM_ID}`
          : `https://api.vercel.com/v10/projects/${projectId}/env`;
        
        const getResponse = await fetch(getUrl, {
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
          },
        });

        if (getResponse.ok) {
          const envList = await getResponse.json();
          const existing = envList.envs?.find((e: any) => e.key === envVar.key);
          
          if (existing) {
            // Update the existing variable
            const updateUrl = VERCEL_TEAM_ID
              ? `https://api.vercel.com/v10/projects/${projectId}/env/${existing.id}?teamId=${VERCEL_TEAM_ID}`
              : `https://api.vercel.com/v10/projects/${projectId}/env/${existing.id}`;
            
            const updateResponse = await fetch(updateUrl, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                key: envVar.key,
                value: envVar.value,
                target: envVar.target,
                type: envVar.type,
              }),
            });

            if (!updateResponse.ok) {
              const updateError = await updateResponse.text();
              console.error(`Failed to update ${envVar.key}: ${updateError}`);
              throw new Error(`Failed to update environment variable ${envVar.key}`);
            }

            console.log(`   ✓ Updated ${envVar.key}`);
            continue;
          }
        }
      }

      console.error(`Failed to set ${envVar.key}: ${errorBody}`);
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

  // First, get the project to find the linked repo ID
  const projectUrl = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v9/projects/${projectId}`;

  const projectResponse = await fetch(projectUrl, {
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
    },
  });

  if (!projectResponse.ok) {
    throw new Error('Failed to get project details for deployment');
  }

  const project = await projectResponse.json();
  
  console.log(`📋 Project link status:`, {
    hasLink: !!project.link,
    linkType: project.link?.type,
    repoId: project.link?.repoId,
    repo: project.link?.repo,
  });
  
  if (!project.link || !project.link.repoId) {
    throw new Error('Project does not have a linked GitHub repository. Link may still be processing.');
  }

  // Now trigger deployment with the repo ID
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
      name: project.name,
      project: projectId,
      gitSource: {
        type: 'github',
        ref: gitBranch,
        repoId: project.link.repoId,
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
