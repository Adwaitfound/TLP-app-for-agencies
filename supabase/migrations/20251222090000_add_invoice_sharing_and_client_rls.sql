-- Add shared_with_client flag to invoices and RLS to allow client visibility of sent shared invoices

-- 1) Add column for sharing visibility
alter table if exists invoices
  add column if not exists shared_with_client boolean not null default false;

-- Helpful index for filtering
create index if not exists idx_invoices_shared_status on invoices(shared_with_client, status);

-- 2) Ensure RLS is enabled on invoices table
alter table invoices enable row level security;

-- 3) RLS: Allow clients (authenticated user matching clients.user_id) to select invoices
-- that are marked as 'sent' and shared_with_client=true and belong to them.
-- This policy is additive and does not affect existing admin policies.
drop policy if exists "Clients can view shared sent invoices" on invoices;

create policy "Clients can view shared sent invoices" on invoices
  for select
  using (
    auth.role() = 'authenticated'
    and status = 'sent'
    and shared_with_client = true
    and exists (
      select 1 from clients c
      where c.id = invoices.client_id
        and c.user_id = auth.uid()
    )
  );
