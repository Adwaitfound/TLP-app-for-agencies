-- =====================================================
-- RLS Policy: Allow clients to view invoices shared with them
-- Apply via Supabase Dashboard SQL Editor or psql
-- =====================================================

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_shared_with_client ON invoices(shared_with_client);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'Clients can view shared invoices'
  ) THEN
    CREATE POLICY "Clients can view shared invoices" ON invoices
      FOR SELECT
      USING (
        shared_with_client = true
        AND client_id = (
          SELECT id FROM clients 
          WHERE user_id = auth.uid()
          LIMIT 1
        )
      );
  END IF;
END $$;

-- Keep existing admin policies intact
-- The "Adwait can view invoices" policy will continue to work for admins
