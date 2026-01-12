#!/usr/bin/env node
/**
 * Apply brand color migration to database
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

async function applyMigration() {
  try {
    console.log('🔄 Applying brand_color migration...');

    // Get all organizations
    const { data: orgs, error: selectError } = await supabase
      .from('saas_organizations')
      .select('id, settings');

    if (selectError) {
      console.error('Error fetching organizations:', selectError);
      return;
    }

    console.log(`Found ${orgs.length} organizations`);
    let updated = 0;

    // Update each organization to ensure settings has brand_color
    for (const org of orgs) {
      const currentSettings = org.settings || {};
      if (!currentSettings.brand_color) {
        const { error: updateError } = await supabase
          .from('saas_organizations')
          .update({ 
            settings: {
              ...currentSettings,
              brand_color: 'blue'
            }
          })
          .eq('id', org.id);

        if (!updateError) {
          updated++;
          console.log(`  ✅ Updated org: ${org.id}`);
        } else {
          console.error(`  ❌ Failed to update org ${org.id}:`, updateError.message);
        }
      }
    }

    console.log(`✅ Migration applied successfully! Updated ${updated} organizations with brand_color support`);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
