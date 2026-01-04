/**
 * Email Notification Service
 * 
 * Handles sending welcome emails and provisioning notifications using Resend
 */

import jwt from 'jsonwebtoken';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Use existing Supabase service key as JWT secret (it's a good random value)
// Fall back to the anon key if service key not available
const JWT_SECRET = process.env.JWT_SECRET 
  || process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'tlp-dev-secret-key-change-in-production';

if (!RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not configured - emails will fail');
}

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  JWT_SECRET not configured in production - using fallback');
}

interface WelcomeEmailData {
  agencyName: string;
  adminEmail: string;
  instanceUrl: string;
  supabaseProjectId: string;
  supabaseUrl: string;
  vercelProjectId: string;
  anonKey: string;
  serviceRoleKey: string;
}

interface ProvisioningStatusEmail {
  adminEmail: string;
  agencyName: string;
  status: 'success' | 'failed';
  instanceUrl?: string;
  errorMessage?: string;
}
/**
 * Generate a one-time setup token for agency initialization
 */
export function generateSetupToken(
  agencyId: string,
  adminEmail: string,
  supabaseProjectId: string,
  anonKey: string,
  serviceRoleKey: string,
  vercelUrl: string
): string {
  return jwt.sign(
    {
      agencyId,
      adminEmail,
      supabaseProjectId,
      anonKey,
      serviceRoleKey,
      vercelUrl,
      type: 'agency-setup',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify a setup token
 */
export function verifySetupToken(token: string): {
  agencyId: string;
  adminEmail: string;
  supabaseProjectId: string;
  anonKey: string;
  serviceRoleKey: string;
  vercelUrl?: string;
} {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'agency-setup') {
      throw new Error('Invalid token type');
    }
    return {
      agencyId: decoded.agencyId,
      adminEmail: decoded.adminEmail,
      supabaseProjectId: decoded.supabaseProjectId,
      anonKey: decoded.anonKey,
      serviceRoleKey: decoded.serviceRoleKey,
      vercelUrl: decoded.vercelUrl,
    };
  } catch (error) {
    throw new Error(`Invalid or expired setup token: ${error}`);
  }
}

/**
 * Send welcome email with one-click setup link
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Skipping email - RESEND_API_KEY not configured');
    return;
  }

  console.log(`📧 Sending welcome email to ${data.adminEmail}`);

  // Use the main app URL from environment or localhost for development
  const mainAppUrl = process.env.NEXT_PUBLIC_APP_URL 
    || process.env.VERCEL_URL 
    || 'http://localhost:3000';

  // Generate setup token with all necessary data
  const setupToken = generateSetupToken(
    data.supabaseProjectId,
    data.adminEmail,
    data.supabaseProjectId,
    data.anonKey,
    data.serviceRoleKey,
    data.instanceUrl
  );

  const setupUrl = `${mainAppUrl}/setup?token=${setupToken}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
      font-size: 16px;
    }
    .button:hover {
      background: #764ba2;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
    }
    .highlight {
      background: #eff6ff;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    h1 { color: white; margin: 0; }
    h2 { color: #667eea; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Welcome to The Lost Project!</h1>
    <p style="margin: 10px 0 0 0;">Your agency instance is ready</p>
  </div>
  
  <div class="content">
    <p>Hi there,</p>
    
    <p>Great news! Your dedicated instance of <strong>The Lost Project</strong> has been successfully provisioned for <strong>${data.agencyName}</strong>.</p>
    
    <div class="highlight">
      <p><strong>⚡ One-Click Setup</strong></p>
      <p>Click the button below to complete your setup. You'll create your password and be instantly logged in to your dashboard.</p>
    </div>
    
    <center>
      <a href="${setupUrl}" class="button">Complete Setup & Access Dashboard →</a>
    </center>
    
    <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link in your browser:<br>
      <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all; font-size: 12px;">${setupUrl}</code>
    </p>
    
    <h2>✨ What's Next?</h2>
    <ul>
      <li>Click the button above to set up your account</li>
      <li>Create your password</li>
      <li>Set up your agency profile and branding</li>
      <li>Invite team members</li>
      <li>Create your first project</li>
    </ul>
    
    <h2>📚 Need Help?</h2>
    <p>If you have any questions or the button doesn't work, please reach out to our support team.</p>
    
    <p>Best regards,<br><strong>The Lost Project Team</strong></p>
  </div>
  
  <div class="footer">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: data.adminEmail,
      subject: `${data.agencyName} - Complete Your Setup`,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send welcome email: ${response.status} ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Welcome email sent: ${result.id}`);
}

/**
 * Send provisioning status notification to internal admin
 */
export async function sendProvisioningStatusEmail(data: ProvisioningStatusEmail): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Skipping status email - RESEND_API_KEY not configured');
    return;
  }

  const subject = data.status === 'success'
    ? `✅ Agency Provisioned: ${data.agencyName}`
    : `❌ Provisioning Failed: ${data.agencyName}`;

  const htmlContent = data.status === 'success' ? `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>✅ Agency Successfully Provisioned</h2>
  <p><strong>Agency:</strong> ${data.agencyName}</p>
  <p><strong>Admin Email:</strong> ${data.adminEmail}</p>
  <p><strong>Instance URL:</strong> <a href="${data.instanceUrl}">${data.instanceUrl}</a></p>
  <p>Welcome email has been sent to the agency admin.</p>
</body>
</html>
  ` : `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>❌ Agency Provisioning Failed</h2>
  <p><strong>Agency:</strong> ${data.agencyName}</p>
  <p><strong>Admin Email:</strong> ${data.adminEmail}</p>
  <p><strong>Error:</strong></p>
  <pre style="background: #f3f4f6; padding: 15px; border-radius: 4px;">${data.errorMessage}</pre>
  <p>Please check the logs and retry provisioning.</p>
</body>
</html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: data.adminEmail,
      subject,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to send status email: ${response.status} ${error}`);
    // Don't throw - this is a notification email, not critical
  }
}

/**
 * Generate a secure random password
 */
export function generateTempPassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

interface CommentNotificationData {
  recipientEmail: string;
  recipientName: string;
  clientName: string;
  projectName: string;
  commentText: string;
  commentUrl: string;
}

/**
 * Send email notification when a new comment is posted
 */
export async function sendCommentNotification(data: CommentNotificationData): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Skipping comment notification - RESEND_API_KEY not configured');
    return;
  }

  console.log(`📧 Sending comment notification to ${data.recipientEmail}`);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 30px;
    }
    .comment-box {
      background: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .button:hover {
      background: #764ba2;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      padding: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .meta {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 10px;
    }
    h1 { 
      color: white; 
      margin: 0;
      font-size: 24px;
    }
    h2 { 
      color: #667eea;
      font-size: 18px;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 New Client Feedback</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      
      <p><strong>${data.clientName}</strong> has posted a new comment on <strong>${data.projectName}</strong>:</p>
      
      <div class="comment-box">
        <div class="meta">
          <strong>Project:</strong> ${data.projectName}<br>
          <strong>From:</strong> ${data.clientName}
        </div>
        <p style="margin: 15px 0 0 0; white-space: pre-wrap;">${data.commentText}</p>
      </div>
      
      <p>Click the button below to view and respond to this comment:</p>
      
      <div style="text-align: center;">
        <a href="${data.commentUrl}" class="button">View Comment</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        💡 <strong>Tip:</strong> Respond quickly to client feedback to maintain great relationships and project momentum!
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from The Lost Project</p>
      <p style="margin: 5px 0 0 0;">
        <a href="${data.commentUrl}" style="color: #667eea; text-decoration: none;">View Dashboard</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: data.recipientEmail,
      subject: `New feedback from ${data.clientName} on ${data.projectName}`,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to send comment notification: ${response.status} ${error}`);
  } else {
    console.log(`✅ Comment notification sent to ${data.recipientEmail}`);
  }
}
