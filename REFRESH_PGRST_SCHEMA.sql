-- =====================================================
-- REFRESH PostgREST Schema Cache
-- This fixes PGRST204 "Could not find column" errors
-- Run this via Supabase SQL Editor or psql
-- =====================================================

-- Notify PostgREST to refresh schema by updating a table comment
-- (PostgREST watches for comment changes on tables)
COMMENT ON TABLE invoices IS 'Invoices table - refreshed schema cache';

-- Alternative: Notify PostgREST through database event
-- This is handled automatically by Supabase when migrations run

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name IN ('invoice_file_url', 'advance_amount', 'tax_type', 'notes')
ORDER BY ordinal_position;
