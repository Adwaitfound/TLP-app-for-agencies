import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  'https://frinqtylwgzquoxvqhxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaW5xdHlsd2d6dW94dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTMyNDE4MCwiZXhwIjoxODI5MTMyNDE4MH0.1KqlRoVcLqZJkx1Xz6qLVz7CbKRBv0vwDjKRwb_xXFU'
);

const resend = new Resend('re_4KfJbWxz_ARs2SBNwWE4WBpurhxEGjCx9');

async function sendMagicLink() {
  console.log('📧 Sending magic link email...\n');

  try {
    // Get the latest magic link
    const { data: links } = await supabase
      .from('saas_magic_links')
      .select('*')
      .eq('email', 'social@thefoundproject.com')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!links || links.length === 0) {
      console.log('❌ No magic link found for social@thefoundproject.com');
      return;
    }

    const link = links[0];
    const setupUrl = `http://localhost:3001/v2/setup?token=${link.token}`;

    // Get org name
    const { data: org } = await supabase
      .from('saas_organizations')
      .select('name')
      .eq('id', link.org_id)
      .single();

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'onboarding@notifications.thelostproject.in',
      to: 'social@thefoundproject.com',
      subject: 'Complete Your Setup - TLP Agency Dashboard',
      html: `
        <h2>Welcome to TLP Agency! 🎉</h2>
        <p>Your organization <strong>${org?.name}</strong> has been created.</p>
        <p>Click the button below to complete your setup and create your password:</p>
        <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background: #fbbf24; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Complete Setup
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This link expires in 24 hours. If you didn't request this, please ignore this email.
        </p>
      `,
    });

    if (error) {
      console.log('❌ Error sending email:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log(`To: social@thefoundproject.com`);
    console.log(`Email ID: ${data?.id}`);
    console.log(`\n📝 Setup Link:`);
    console.log(setupUrl);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

sendMagicLink();
