"use server";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Execute raw SQL statements via service role
 * WARNING: Only use for migrations and admin operations
 */
export async function executeSql(sqlStatements: string[]) {
  try {
    const supabase = createServiceClient();
    const results = [];

    for (const sql of sqlStatements) {
      if (!sql.trim() || sql.trim().startsWith('--')) {
        continue;
      }

      try {
        // For SELECT statements, we can use rpc
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: sql,
          });

          if (error) {
            console.error("SQL error:", error);
            results.push({
              sql: sql.substring(0, 50),
              status: 'error',
              error: error.message,
            });
          } else {
            results.push({
              sql: sql.substring(0, 50),
              status: 'success',
              data,
            });
          }
        } else {
          // For INSERT, UPDATE, DELETE, we need a different approach
          // This is a placeholder - actual implementation depends on Supabase setup
          results.push({
            sql: sql.substring(0, 50),
            status: 'queued',
            note: 'Use Supabase Dashboard for non-SELECT statements',
          });
        }
      } catch (err: any) {
        results.push({
          sql: sql.substring(0, 50),
          status: 'error',
          error: err.message,
        });
      }
    }

    return results;
  } catch (err: any) {
    console.error('Error executing SQL:', err);
    return {
      error: err.message,
    };
  }
}
