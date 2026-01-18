#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SERVICE_KEY:', SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

async function checkPayments() {
  console.log('🔍 Checking payments in database...\n');
  
  // Query payments
  const response = await fetch(`${SUPABASE_URL}/rest/v1/saas_organization_payments?select=*&order=created_at.desc`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Error fetching payments:', error);
    return;
  }

  const payments = await response.json();
  
  if (!payments || payments.length === 0) {
    console.log('ℹ️  No payments found.\n');
    return;
  }

  console.log(`Found ${payments.length} payment(s):\n`);

  for (const payment of payments) {
    const adminEmail = payment.notes?.admin_email;
    const agencyName = payment.notes?.agency_name;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💳 Payment ID: ${payment.id.substring(0, 8)}...`);
    console.log(`   Razorpay Order: ${payment.razorpay_order_id}`);
    console.log(`   Razorpay Payment: ${payment.razorpay_payment_id || 'N/A'}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Amount: ₹${payment.amount} (${payment.plan_type})`);
    console.log(`   Admin Email: ${adminEmail || 'N/A'}`);
    console.log(`   Agency: ${agencyName || 'N/A'}`);
    console.log(`   Created: ${new Date(payment.created_at).toLocaleString()}`);

    if (payment.org_id) {
      console.log(`   ✅ Organization ID: ${payment.org_id.substring(0, 8)}...`);

      // Get organization
      const orgRes = await fetch(`${SUPABASE_URL}/rest/v1/saas_organizations?id=eq.${payment.org_id}&select=*`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      });

      const orgs = await orgRes.json();
      if (orgs && orgs[0]) {
        const org = orgs[0];
        console.log(`   📦 Org Name: ${org.name}`);
        console.log(`   📦 Slug: ${org.slug}`);

        // Get magic links
        const linksRes = await fetch(`${SUPABASE_URL}/rest/v1/saas_magic_links?org_id=eq.${payment.org_id}&type=eq.signup&select=*&order=created_at.desc`, {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
          }
        });

        const links = await linksRes.json();
        if (links && links.length > 0) {
          console.log(`   🔗 Magic Links: ${links.length}`);
          
          for (const link of links) {
            const isExpired = new Date(link.expires_at) < new Date();
            const isUsed = !!link.used_at;
            const status = isUsed ? '✓ USED' : (isExpired ? '✗ EXPIRED' : '✓ VALID');
            
            console.log(`      ${status} | ${link.email}`);
            
            if (!isUsed && !isExpired) {
              const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/v2/setup?token=${link.token}`;
              console.log(`         🔗 ${setupUrl}`);
            }
          }
        } else {
          console.log(`   ⚠️  No magic links found`);
        }
      }
    } else {
      console.log(`   ⚠️  NO ORGANIZATION CREATED`);
      if (payment.status === 'captured') {
        console.log(`   ⚠️  Payment captured but org missing - webhook issue!`);
      }
    }
    console.log('');
  }
}

checkPayments().catch(console.error);
