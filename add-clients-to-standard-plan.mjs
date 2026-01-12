#!/usr/bin/env node
/**
 * Add all clients to standard plan (limit to 2 clients per agency)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from .env.local first
const envPath = `${__dirname}/.env.local`;
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addClientsToStandard() {
  try {
    console.log('🔄 Adding all clients to agencies (Standard: 2 clients)...');

    // Get all agencies
    const { data: agencies, error: agencyError } = await supabase
      .from('saas_organizations')
      .select('id, name, plan')
      .eq('type', 'agency');

    if (agencyError) throw agencyError;
    console.log(`Found ${agencies.length} agencies`);

    // Get all clients
    const { data: clients, error: clientError } = await supabase
      .from('saas_organizations')
      .select('id, name, parent_id')
      .eq('type', 'client');

    if (clientError) throw clientError;
    console.log(`Found ${clients.length} clients`);

    // Group clients by agency
    const clientsByAgency = {};
    clients.forEach(client => {
      if (!clientsByAgency[client.parent_id]) {
        clientsByAgency[client.parent_id] = [];
      }
      clientsByAgency[client.parent_id].push(client);
    });

    // Assign clients to agencies based on plan limits
    let totalAssigned = 0;
    for (const agency of agencies) {
      const agencyClients = clientsByAgency[agency.id] || [];
      const clientLimit = agency.plan === 'premium' ? 4 : 2;
      
      console.log(`\n📌 Agency: ${agency.name} (${agency.plan}) - Limit: ${clientLimit}`);
      console.log(`   Current clients: ${agencyClients.length}`);
      
      // Update client parent_id if not already set
      for (let i = 0; i < Math.min(agencyClients.length, clientLimit); i++) {
        const client = agencyClients[i];
        if (!client.parent_id) {
          await supabase
            .from('saas_organizations')
            .update({ parent_id: agency.id })
            .eq('id', client.id);
          console.log(`   ✅ Linked: ${client.name}`);
          totalAssigned++;
        }
      }
    }

    console.log(`\n✅ Successfully assigned ${totalAssigned} clients to agencies!`);
  } catch (error) {
    console.error('❌ Failed to add clients:', error.message);
    process.exit(1);
  }
}

addClientsToStandard();
