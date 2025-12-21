# Invoice Sharing Fix - December 22, 2025

## Problem

Invoices still not showing on client dashboard despite the `shared_with_client` column being added to the database.

Root cause: All existing invoices have `shared_with_client = false` (the default value). The RLS policy only allows clients to see invoices where:

- `status = 'sent'`
- `shared_with_client = true`

## Solution Implemented

### 1. Added Server Action

**File**: `app/actions/invoice-operations.ts`

- New function: `updateInvoiceSharedStatus(invoiceId: string, shared_with_client: boolean)`
- Allows admin to toggle the `shared_with_client` flag for any invoice

### 2. Updated Admin UI

**File**: `app/dashboard/invoices/page.tsx`

- Added "Shared with Client" column to the invoice management table
- Added checkbox control to toggle `shared_with_client` status per invoice
- When toggled, instantly updates via server action and shows success toast

### 3. Updated TypeScript Types

- Added `shared_with_client?: boolean` to Invoice interface
- Imported `updateInvoiceSharedStatus` in the component

## How to Use

1. Go to `/dashboard/invoices` (admin only)
2. Find invoices with `status = "sent"`
3. Check the "Shared with Client" checkbox for the invoices you want clients to see
4. The checkbox is interactive - clicking it immediately updates the database

## Next Steps for Client

1. Open `/dashboard/client` in browser
2. Click "Invoices" tab
3. Previously failing invoices should now appear if:
   - Their status is "sent"
   - Their "Shared with Client" checkbox is enabled
   - The logged-in client is assigned to the project/invoice

## Testing Checklist

- [ ] Admin can see and toggle "Shared with Client" checkbox on invoices page
- [ ] Toggling checkbox shows success message
- [ ] Client logs in and sees invoices marked as shared
- [ ] Client console shows clean `[1/6]` through `[6/6]` logs (no errors)
- [ ] Invoices with `shared_with_client=false` don't appear for clients

## Database State

Migration `20251222090000_add_invoice_sharing_and_client_rls.sql` successfully applied:

- ✅ Column `shared_with_client` added to invoices table (defaults to false)
- ✅ Index `idx_invoices_shared_status` created for performance
- ✅ RLS enabled on invoices table
- ✅ RLS policy created: Clients can only see sent invoices marked as shared

## Files Modified

1. `app/actions/invoice-operations.ts` - Added `updateInvoiceSharedStatus` action
2. `app/dashboard/invoices/page.tsx` - Added UI toggle for `shared_with_client`

## SQL to Mark Invoices Shared (Optional Manual Update)

```sql
-- Mark all "sent" invoices as shared with client
update invoices
set shared_with_client = true
where status = 'sent';
```

If you need to execute this, run:

```bash
supabase db execute << 'EOF'
update invoices
set shared_with_client = true
where status = 'sent';
EOF
```
