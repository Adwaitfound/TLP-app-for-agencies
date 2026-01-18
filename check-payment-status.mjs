#!/usr/bin/env node
/**
 * Check Payment and Organization Creation Status
 * Verifies if the webhook process is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkPaymentStatus() {
  console.log('🔍 Checking payment and organization creation status...\n');

  // Get all payments
  const { data: payments, error: paymentsError } = await supabase
    .from('saas_organization_payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('❌ Error fetching payments:', paymentsError);
    return;
  }

  if (!payments || payments.length === 0) {
    console.log('ℹ️  No payments found in database.\n');
    return;
  }

  console.log(`Found ${payments.length} payment(s):\n`);

  for (const payment of payments) {
    const adminEmail = payment.notes?.admin_email;
    const agencyName = payment.notes?.agency_name;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💳 Payment ID: ${payment.id.substring(0, 8)}...`);
    console.log(`   Razorpay Order ID: ${payment.razorpay_order_id}`);
    console.log(`   Razorpay Payment ID: ${payment.razorpay_payment_id || 'N/A'}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Amount: ₹${payment.amount} (${payment.plan_type} - ${payment.billing_cycle})`);
    console.log(`   Admin Email: ${adminEmail || 'N/A'}`);
    console.log(`   Agency Name: ${agencyName || 'N/A'}`);
    console.log(`   Created: ${new Date(payment.created_at).toLocaleString()}`);
    console.log(`   Completed: ${payment.completed_at ? new Date(payment.completed_at).toLocaleString() : 'N/A'}`);

    // Check if organization was created
    if (payment.org_id) {
      console.log(`   ✅ Organization ID: ${payment.org_id.substring(0, 8)}...`);

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('saas_organizations')
        .select('*')
        .eq('id', payment.org_id)
        .single();

      if (org) {
        console.log(`   📦 Organization Name: ${org.name}`);
        console.log(`   📦 Slug: ${org.slug}`);
        console.log(`   📦 Plan: ${org.plan}`);
        console.log(`   📦 Status: ${org.status}`);

        // Check for magic links
        const { data: magicLinks, error: linksError } = await supabase
          .from('saas_magic_links')
          .select('*')
          .eq('org_id', payment.org_id)
          .eq('type', 'signup')
          .order('created_at', { ascending: false });

        if (magicLinks && magicLinks.length > 0) {
          console.log(`   🔗 Magic Links Found: ${magicLinks.length}`);
          
          for (const link of magicLinks) {
            const isExpired = new Date(link.expires_at) < new Date();
            const isUsed = !!link.used_at;
            const status = isUsed ? '✓ USED' : (isExpired ? '✗ EXPIRED' : '✓ VALID');
            
            console.log(`      ${status} | Email: ${link.email}`);
            console.log(`         Token: ${link.token.substring(0, 16)}...`);
            console.log(`         Expires: ${new Date(link.expires_at).toLocaleString()}`);
            console.log(`         Used: ${link.used_at ? new Date(link.used_at).toLocaleString() : 'No'}`);
            
            if (!isUsed && !isExpired) {
              const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${link.token}`;
              console.log(`         🔗 Setup URL: ${setupUrl}`);
            }
          }
        } else {
          console.log(`   ⚠️  No magic links found for this organization`);
        }
      }
    } else {
      console.log(`   ⚠️  No organization created yet`);
      
      if (payment.status === 'captured') {
        console.log(`   ⚠️  WARNING: Payment is captured but org not created!`);
        console.log(`   💡 This means the webhook might not have triggered.`);
      }
    }

    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✓ Status check complete!\n');
}

checkPaymentStatus().catch(console.error);
