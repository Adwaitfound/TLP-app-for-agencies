import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

console.log('🚀 Manual Onboarding Completion Script\n');

// Step 1: Get the pending payment
console.log('📋 Step 1: Finding pending payment...');
const { data: payment, error: paymentError } = await supabase
  .from('saas_organization_payments')
  .select('*')
  .eq('status', 'pending')
  .is('org_id', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (paymentError || !payment) {
  console.error('❌ No pending payment found:', paymentError);
  process.exit(1);
}

console.log(`✅ Found payment: ${payment.razorpay_order_id}`);
console.log(`   Plan: ${payment.plan_type}`);
console.log(`   Amount: ₹${payment.amount}`);

// Get agency details from payment notes
const agencyData = payment.notes;
console.log(`\n📝 Agency Details:`);
console.log(`   Name: ${agencyData.agency_name}`);
console.log(`   Admin Email: ${agencyData.admin_email}`);
console.log(`   Admin Name: ${agencyData.admin_name}`);

// Step 2: Create organization
console.log(`\n🏢 Step 2: Creating organization...`);

const slug = agencyData.agency_name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const { data: org, error: orgError } = await supabase
  .from('saas_organizations')
  .insert({
    name: agencyData.agency_name,
    slug: slug,
    website: agencyData.website || null,
    plan: payment.plan_type,
    status: 'active',
    razorpay_order_id: payment.razorpay_order_id,
    payment_status: 'completed',
    amount_paid: payment.amount,
    billing_cycle: payment.billing_cycle,
    subscription_started_at: new Date().toISOString(),
  })
  .select()
  .single();

if (orgError) {
  console.error('❌ Failed to create organization:', orgError);
  process.exit(1);
}

console.log(`✅ Organization created: ${org.id}`);
console.log(`   Slug: ${org.slug}`);

// Step 3: Update payment with org_id
console.log(`\n💳 Step 3: Linking payment to organization...`);
const { error: updatePaymentError } = await supabase
  .from('saas_organization_payments')
  .update({
    org_id: org.id,
    status: 'captured',
    completed_at: new Date().toISOString(),
  })
  .eq('id', payment.id);

if (updatePaymentError) {
  console.error('❌ Failed to update payment:', updatePaymentError);
}

console.log(`✅ Payment linked to organization`);

// Step 4: Create magic link
console.log(`\n🔗 Step 4: Creating magic link...`);
const { data: magicLink, error: magicLinkError } = await supabase
  .from('saas_magic_links')
  .insert({
    type: 'signup',
    email: agencyData.admin_email,
    org_id: org.id,
    metadata: {
      role: 'admin',
      admin_name: agencyData.admin_name,
      agency_name: agencyData.agency_name,
    }
  })
  .select()
  .single();

if (magicLinkError) {
  console.error('❌ Failed to create magic link:', magicLinkError);
  process.exit(1);
}

console.log(`✅ Magic link created`);
console.log(`   Token: ${magicLink.token}`);
console.log(`   Expires: ${magicLink.expires_at}`);

// Step 5: Generate setup URL
const setupUrl = `http://localhost:3001/v2/setup?token=${magicLink.token}`;
console.log(`\n🎯 Setup URL:`);
console.log(`   ${setupUrl}`);

// Step 6: Send email (if Resend configured)
if (resendApiKey) {
  console.log(`\n📧 Step 5: Sending email via Resend...`);
  try {
    const resend = new Resend(resendApiKey);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'notifications@thelostproject.in',
      to: [agencyData.admin_email],
      subject: `Complete your ${agencyData.agency_name} setup`,
      html: `
        <h2>Welcome to ${agencyData.agency_name}!</h2>
        <p>Hi ${agencyData.admin_name},</p>
        <p>Your payment of ₹${payment.amount} was successful. Complete your account setup:</p>
        <p><a href="${setupUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Setup</a></p>
        <p>Or copy this link: ${setupUrl}</p>
        <p>This link expires in 24 hours.</p>
      `,
    });

    if (emailError) {
      console.error('❌ Failed to send email:', emailError);
    } else {
      console.log(`✅ Email sent to ${agencyData.admin_email}`);
      console.log(`   Email ID: ${emailData.id}`);
    }
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
} else {
  console.log(`\n⚠️  Resend API key not configured - email not sent`);
}

// Summary
console.log(`\n✅ ONBOARDING COMPLETE!`);
console.log(`\n📊 Summary:`);
console.log(`   Organization: ${org.name} (${org.slug})`);
console.log(`   Plan: ${org.plan}`);
console.log(`   Admin: ${agencyData.admin_name} <${agencyData.admin_email}>`);
console.log(`   Payment: ₹${payment.amount} (${payment.billing_cycle})`);
console.log(`\n🔑 Next Steps:`);
console.log(`   1. Open: ${setupUrl}`);
console.log(`   2. Set your password`);
console.log(`   3. Access dashboard at /v2/dashboard`);
console.log(`\n💡 Check email at ${agencyData.admin_email} for the setup link!\n`);
