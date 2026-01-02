/**
 * Email Notification Service
 * 
 * Handles sending welcome emails and provisioning notifications using Resend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

if (!RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not configured - emails will fail');
}

interface WelcomeEmailData {
  agencyName: string;
  adminEmail: string;
  adminPassword: string;
  instanceUrl: string;
  supabaseUrl: string;
}

interface ProvisioningStatusEmail {
  adminEmail: string;
  agencyName: string;
  status: 'success' | 'failed';
  instanceUrl?: string;
  errorMessage?: string;
}

/**
 * Send welcome email to agency admin with login credentials
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Skipping email - RESEND_API_KEY not configured');
    return;
  }

  console.log(`📧 Sending welcome email to ${data.adminEmail}`);

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
    .credentials {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
    }
    .credential-item {
      margin: 10px 0;
    }
    .credential-label {
      font-weight: 600;
      color: #667eea;
    }
    .credential-value {
      font-family: 'Courier New', monospace;
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 5px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Welcome to The Lost Project!</h1>
    <p>Your agency instance is ready</p>
  </div>
  
  <div class="content">
    <p>Hi there,</p>
    
    <p>Great news! Your dedicated instance of The Lost Project has been successfully provisioned for <strong>${data.agencyName}</strong>.</p>
    
    <div class="credentials">
      <h3>🔐 Your Login Credentials</h3>
      
      <div class="credential-item">
        <div class="credential-label">Instance URL:</div>
        <div class="credential-value">${data.instanceUrl}</div>
      </div>
      
      <div class="credential-item">
        <div class="credential-label">Email:</div>
        <div class="credential-value">${data.adminEmail}</div>
      </div>
      
      <div class="credential-item">
        <div class="credential-label">Temporary Password:</div>
        <div class="credential-value">${data.adminPassword}</div>
      </div>
    </div>
    
    <div class="warning">
      <strong>⚠️ Important:</strong> Please change your password immediately after your first login for security reasons.
    </div>
    
    <center>
      <a href="${data.instanceUrl}" class="button">Access Your Dashboard →</a>
    </center>
    
    <h3>✨ What's Next?</h3>
    <ul>
      <li>Log in and change your password</li>
      <li>Set up your agency profile and branding</li>
      <li>Invite team members</li>
      <li>Create your first project</li>
    </ul>
    
    <h3>📚 Resources</h3>
    <ul>
      <li><a href="${data.instanceUrl}/docs">Documentation</a></li>
      <li><a href="${data.instanceUrl}/support">Support</a></li>
    </ul>
    
    <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
    
    <p>Best regards,<br>The Lost Project Team</p>
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
      subject: `Welcome to The Lost Project - ${data.agencyName}`,
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
