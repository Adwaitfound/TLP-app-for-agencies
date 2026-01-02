/**
 * Database Schema Migration Runner
 * 
 * This module handles running SQL migrations on newly created Supabase projects.
 * It reads migration files and executes them in order.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

interface MigrationFile {
  filename: string;
  filepath: string;
  timestamp: string;
  sql: string;
}

/**
 * Get all migration files from the supabase/migrations directory
 */
export function getMigrationFiles(migrationsDir?: string): MigrationFile[] {
  const dir = migrationsDir || path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Migrations directory not found: ${dir}`);
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Migrations should be run in alphabetical/timestamp order

  return files.map(filename => {
    const filepath = path.join(dir, filename);
    const sql = fs.readFileSync(filepath, 'utf-8');
    const timestamp = filename.split('_')[0]; // Assumes format: YYYYMMDDHHMMSS_name.sql

    return {
      filename,
      filepath,
      timestamp,
      sql,
    };
  });
}

/**
 * Run a single migration on a Supabase project
 */
async function runMigration(
  supabaseUrl: string,
  serviceRoleKey: string,
  migration: MigrationFile
): Promise<void> {
  console.log(`   Running migration: ${migration.filename}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Execute the SQL using the service role client
  const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });

  if (error) {
    // If exec_sql RPC doesn't exist, try direct SQL execution (Postgres REST API)
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: migration.sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Migration ${migration.filename} failed: ${errorText}`);
    }
  }

  console.log(`      ✓ Completed: ${migration.filename}`);
}

/**
 * Run all migrations on a newly created Supabase project
 * 
 * @param supabaseUrl - The Supabase project URL
 * @param serviceRoleKey - The service role key (has admin permissions)
 * @param migrationsDir - Optional custom migrations directory
 */
export async function runMigrations(
  supabaseUrl: string,
  serviceRoleKey: string,
  migrationsDir?: string
): Promise<void> {
  console.log(`🗄️  Running database migrations...`);

  const migrations = getMigrationFiles(migrationsDir);

  if (migrations.length === 0) {
    console.log('   No migrations found, skipping');
    return;
  }

  console.log(`   Found ${migrations.length} migration(s)`);

  // Run migrations sequentially
  for (const migration of migrations) {
    await runMigration(supabaseUrl, serviceRoleKey, migration);
  }

  console.log(`✅ All migrations completed successfully`);
}

/**
 * Create initial admin user for the agency
 * 
 * This creates the first user account that the agency owner will use to log in
 */
export async function createInitialAdminUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  agencyName: string
): Promise<{ userId: string; email: string }> {
  console.log(`👤 Creating initial admin user: ${email}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: `${agencyName} Admin`,
    },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  const userId = authData.user.id;

  // Create user profile in users table
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      full_name: `${agencyName} Admin`,
      role: 'admin',
    });

  if (profileError) {
    console.warn(`⚠️  Failed to create user profile: ${profileError.message}`);
    // Continue anyway - the auth user was created
  }

  console.log(`✅ Admin user created: ${userId}`);

  return {
    userId,
    email,
  };
}

/**
 * Seed essential data for a new agency instance
 * 
 * This can include default settings, templates, etc.
 */
export async function seedInitialData(
  supabaseUrl: string,
  serviceRoleKey: string,
  agencyName: string
): Promise<void> {
  console.log(`🌱 Seeding initial data...`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Example: Insert default settings
  const { error: settingsError } = await supabase
    .from('settings')
    .insert({
      key: 'agency_name',
      value: agencyName,
    })
    .select()
    .single();

  if (settingsError) {
    console.warn(`⚠️  Could not seed settings: ${settingsError.message}`);
  }

  // Add more seed data as needed
  // For example: default project statuses, client types, etc.

  console.log(`✅ Initial data seeded`);
}

/**
 * Complete database setup for a new agency instance
 * 
 * This runs all migrations, creates the admin user, and seeds initial data
 */
export async function setupDatabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  adminEmail: string,
  adminPassword: string,
  agencyName: string
): Promise<{ userId: string; email: string }> {
  console.log(`\n📦 Setting up database for ${agencyName}...`);

  // Step 1: Run migrations
  await runMigrations(supabaseUrl, serviceRoleKey);

  // Step 2: Create admin user
  const adminUser = await createInitialAdminUser(
    supabaseUrl,
    serviceRoleKey,
    adminEmail,
    adminPassword,
    agencyName
  );

  // Step 3: Seed initial data
  await seedInitialData(supabaseUrl, serviceRoleKey, agencyName);

  console.log(`✅ Database setup complete\n`);

  return adminUser;
}
