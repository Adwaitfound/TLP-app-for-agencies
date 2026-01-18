#!/usr/bin/env node
/**
 * Resend Setup Email for Completed Payments
 * 
 * This script finds payments that were completed but didn't receive the setup email
 * and sends the email with the magic link.
 * 
 * Usage: node resend-setup-email.mjs [email_address]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resendSetupEmail(emailFilter = null) {
  console.log('🔍 Finding completed payments without setup emails sent...\n');

  // Find payments that are completed and have an org_id
  let query = supabase
    .from('saas_organization_payments')
    .select(`
      id,
      org_id,
      plan_type,
      billing_cycle,
      amount,
      razorpay_order_id,
      completed_at,
      notes
    `)
    .eq('status', 'captured')
    .not('org_id', 'is', null)
    .order('completed_at', { ascending: false });

  const { data: payments, error: paymentsError } = await query;

  if (paymentsError) {
    console.error('❌ Error fetching payments:', paymentsError);
    return;
  }

  if (!payments || payments.length === 0) {
    console.log('ℹ️  No completed payments found.');
    return;
  }

  console.log(`Found ${payments.length} completed payment(s)\n`);

  for (const payment of payments) {
    const adminEmail = payment.notes?.admin_email;
    
    if (!adminEmail) {
      console.log(`⚠️  Payment ${payment.id} has no admin email in notes. Skipping.`);
      continue;
    }

    // If email filter is provided, skip if it doesn't match
    if (emailFilter && adminEmail !== emailFilter) {
      continue;
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('saas_organizations')
      .select('id, name, slug')
      .eq('id', payment.org_id)
      .single();

    if (orgError || !org) {
      console.log(`⚠️  Organization not found for payment ${payment.id}. Skipping.`);
      continue;
    }

    // Check if magic link already exists
    const { data: existingLink } = await supabase
      .from('saas_magic_links')
      .select('id, token, expires_at, used_at')
      .eq('org_id', org.id)
      .eq('email', adminEmail)
      .eq('type', 'signup')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let token;
    let linkId;

    if (existingLink && !existingLink.used_at) {
      // Check if link is still valid
      const expiresAt = new Date(existingLink.expires_at);
      if (expiresAt > new Date()) {
        console.log(`✓ Using existing valid magic link for ${adminEmail}`);
        token = existingLink.token;
        linkId = existingLink.id;
      } else {
        console.log(`⚠️  Existing link expired. Creating new one for ${adminEmail}`);
        // Create new magic link
        const newToken = crypto.randomUUID().replace(/-/g, '');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const { data: newLink, error: linkError } = await supabase
          .from('saas_magic_links')
          .insert({
            type: 'signup',
            email: adminEmail,
            org_id: org.id,
            token: newToken,
            expires_at: expiresAt.toISOString(),
            metadata: {
              plan: payment.plan_type,
              billing_cycle: payment.billing_cycle,
              resent: true,
            },
          })
          .select('id, token')
          .single();

        if (linkError || !newLink) {
          console.error(`❌ Failed to create magic link for ${adminEmail}:`, linkError);
          continue;
        }

        token = newLink.token;
        linkId = newLink.id;
      }
    } else {
      // Create new magic link
      console.log(`📝 Creating new magic link for ${adminEmail}`);
      const newToken = crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const { data: newLink, error: linkError } = await supabase
        .from('saas_magic_links')
        .insert({
          type: 'signup',
          email: adminEmail,
          org_id: org.id,
          token: newToken,
          expires_at: expiresAt.toISOString(),
          metadata: {
            plan: payment.plan_type,
            billing_cycle: payment.billing_cycle,
            resent: true,
          },
        })
        .select('id, token')
        .single();

      if (linkError || !newLink) {
        console.error(`❌ Failed to create magic link for ${adminEmail}:`, linkError);
        continue;
      }

      token = newLink.token;
      linkId = newLink.id;
    }

    // Construct setup URL
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${token}`;

    // Send email
    console.log(`📧 Sending setup email to ${adminEmail}...`);

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@example.com',
          to: adminEmail,
          subject: `Welcome to ${org.name}! Complete Your Setup`,
          html: `
            <h2>Welcome to your new workspace!</h2>
            <p>Hi there,</p>
            <p>Your payment has been confirmed and your workspace is ready. Click the link below to set up your password and get started:</p>
            <p><a href="${setupUrl}" style="padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Setup</a></p>
            <p style="color: #666; font-size: 12px;">This link expires in 7 days.</p>
            <p><strong>Your Organization Details:</strong></p>
            <ul>
              <li>Name: ${org.name}</li>
              <li>Plan: ${payment.plan_type}</li>
              <li>Billing: ${payment.billing_cycle}</li>
            </ul>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px;">${setupUrl}</p>
            <p>If you have any questions, reply to this email.</p>
          `,
        }),
      });

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        console.log(`✅ Email sent successfully to ${adminEmail}`);
        console.log(`   Email ID: ${emailData.id}`);
        console.log(`   Setup URL: ${setupUrl}\n`);
      } else {
        const errorText = await emailResponse.text();
        console.error(`❌ Failed to send email to ${adminEmail}:`, errorText);
        console.log(`   Setup URL (share manually): ${setupUrl}\n`);
      }
    } catch (emailError) {
      console.error(`❌ Email error for ${adminEmail}:`, emailError.message);
      console.log(`   Setup URL (share manually): ${setupUrl}\n`);
    }
  }

  console.log('✓ Done!');
}

// Get email filter from command line argument
const emailFilter = process.argv[2];

if (emailFilter) {
  console.log(`Filtering for email: ${emailFilter}\n`);
}

resendSetupEmail(emailFilter).catch(console.error);
