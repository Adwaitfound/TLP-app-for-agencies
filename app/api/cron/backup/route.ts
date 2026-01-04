import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// This endpoint will be called by Vercel Cron
export async function GET(request: Request) {
  // Verify this is a cron request
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  console.log('Backup endpoint called');
  console.log('Auth header present:', !!authHeader);
  console.log('CRON_SECRET present:', !!process.env.CRON_SECRET);
  
  if (authHeader !== expectedAuth) {
    console.log('Authorization failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('🔄 Starting weekly backup...');

    // Fetch all critical data
    const [
      { data: clients },
      { data: projects },
      { data: subProjects },
      { data: users },
      { data: employeeTasks },
      { data: invoices },
      { data: milestones }
    ] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('sub_projects').select('*'),
      supabase.from('users').select('id, email, full_name, role, status, created_at'),
      supabase.from('employee_tasks').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('milestones').select('*')
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        clients: clients || [],
        projects: projects || [],
        sub_projects: subProjects || [],
        users: users || [],
        employee_tasks: employeeTasks || [],
        invoices: invoices || [],
        milestones: milestones || []
      },
      stats: {
        clients: clients?.length || 0,
        projects: projects?.length || 0,
        sub_projects: subProjects?.length || 0,
        users: users?.length || 0,
        employee_tasks: employeeTasks?.length || 0,
        invoices: invoices?.length || 0,
        milestones: milestones?.length || 0
      }
    };

    // Send email with backup
    const emailSent = await sendBackupEmail(backup);

    return NextResponse.json({
      success: true,
      timestamp: backup.timestamp,
      stats: backup.stats,
      emailSent
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function sendBackupEmail(backup: any) {
  // Option 1: Use Resend (recommended)
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.BACKUP_EMAIL_FROM || 'backups@thelostproject.in',
        to: process.env.BACKUP_EMAIL_TO || 'adwait@thelostproject.in',
        subject: `📦 Weekly Database Backup - ${new Date().toLocaleDateString()}`,
        html: `
          <h2>Weekly Database Backup</h2>
          <p><strong>Timestamp:</strong> ${backup.timestamp}</p>
          
          <h3>Data Summary:</h3>
          <ul>
            <li>Clients: ${backup.stats.clients}</li>
            <li>Projects: ${backup.stats.projects}</li>
            <li>Sub-projects: ${backup.stats.sub_projects}</li>
            <li>Users: ${backup.stats.users}</li>
            <li>Employee Tasks: ${backup.stats.employee_tasks}</li>
            <li>Invoices: ${backup.stats.invoices}</li>
            <li>Milestones: ${backup.stats.milestones}</li>
          </ul>
          
          <p>Full backup data is attached as JSON.</p>
        `,
        attachments: [
          {
            filename: `backup-${new Date().toISOString().split('T')[0]}.json`,
            content: Buffer.from(JSON.stringify(backup, null, 2)).toString('base64')
          }
        ]
      })
    });

    return response.ok;
  }

  // Option 2: Use SendGrid
  if (process.env.SENDGRID_API_KEY) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: process.env.BACKUP_EMAIL_TO || 'adwait@thelostproject.in' }],
          subject: `📦 Weekly Database Backup - ${new Date().toLocaleDateString()}`
        }],
        from: { email: process.env.BACKUP_EMAIL_FROM || 'backups@thelostproject.in' },
        content: [{
          type: 'text/html',
          value: `
            <h2>Weekly Database Backup</h2>
            <p><strong>Timestamp:</strong> ${backup.timestamp}</p>
            <h3>Data Summary:</h3>
            <ul>
              <li>Clients: ${backup.stats.clients}</li>
              <li>Projects: ${backup.stats.projects}</li>
              <li>Sub-projects: ${backup.stats.sub_projects}</li>
              <li>Users: ${backup.stats.users}</li>
              <li>Employee Tasks: ${backup.stats.employee_tasks}</li>
              <li>Invoices: ${backup.stats.invoices}</li>
              <li>Milestones: ${backup.stats.milestones}</li>
            </ul>
          `
        }],
        attachments: [{
          content: Buffer.from(JSON.stringify(backup, null, 2)).toString('base64'),
          filename: `backup-${new Date().toISOString().split('T')[0]}.json`,
          type: 'application/json',
          disposition: 'attachment'
        }]
      })
    });

    return response.ok;
  }

  console.warn('⚠️ No email service configured');
  return false;
}
