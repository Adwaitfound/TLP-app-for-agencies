import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

console.log('📧 Resending Magic Link Email\n');

// Get the latest magic link
const { data: magicLink, error: linkError } = await supabase
  .from('saas_magic_links')
  .select('*, saas_organizations(*)')
  .eq('type', 'signup')
  .is('used_at', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (linkError || !magicLink) {
  console.error('❌ No unused magic link found:', linkError);
  process.exit(1);
}

console.log(`✅ Found magic link for: ${magicLink.email}`);
console.log(`   Organization: ${magicLink.saas_organizations.name}`);
console.log(`   Expires: ${magicLink.expires_at}`);

const setupUrl = `http://localhost:3001/v2/setup?token=${magicLink.token}`;

console.log(`\n📧 Sending email via Resend...`);
const resend = new Resend(resendApiKey);
const { data: emailData, error: emailError } = await resend.emails.send({
  from: 'onboarding@notifications.thelostproject.in',
  to: [magicLink.email],
  subject: `Complete your ${magicLink.saas_organizations.name} setup`,
  html: `
    <h2>Welcome to ${magicLink.saas_organizations.name}!</h2>
    <p>Hi ${magicLink.metadata.admin_name || 'there'},</p>
    <p>Your payment was successful. Complete your account setup:</p>
    <p><a href="${setupUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Setup</a></p>
    <p>Or copy this link: ${setupUrl}</p>
    <p><strong>This link expires in 24 hours and can only be used once.</strong></p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
  `,
});

if (emailError) {
  console.error('❌ Failed to send email:', emailError);
  process.exit(1);
}

console.log(`✅ Email sent successfully!`);
console.log(`   To: ${magicLink.email}`);
console.log(`   Email ID: ${emailData.id}`);
console.log(`\n🔗 Setup URL (also in email):`);
console.log(`   ${setupUrl}`);
console.log(`\n💡 Check your inbox at ${magicLink.email}\n`);
