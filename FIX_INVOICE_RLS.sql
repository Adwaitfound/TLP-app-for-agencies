-- Fix Invoice RLS Policy to show all statuses when shared_with_client is true
-- This allows clients to see paid, cancelled, overdue invoices, not just "sent"

-- Drop existing client view policy
DROP POLICY IF EXISTS "Clients can view their invoices" ON invoices;
DROP POLICY IF EXISTS "Clients can view shared invoices" ON invoices;

-- Create new policy that allows clients to view all their invoices where shared_with_client = true
CREATE POLICY "Clients can view shared invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
  -- Client can see invoices where they are the client AND it's shared with them
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = invoices.client_id
    AND clients.user_id = auth.uid()
  )
  AND shared_with_client = true
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'invoices'
ORDER BY policyname;
