# Invoice Status Sync Fix

## Problem

When an invoice status was updated to "paid" in the admin panel, the change was not reflecting in the client dashboard. The client would still see the old status.

## Root Causes

1. **Limited Status Query**: The client dashboard was only fetching invoices with `status === "sent"` and `shared_with_client === true`. When an invoice was updated to "paid", it was excluded from the query results.

2. **No Real-time Updates**: There was no real-time subscription to invoice changes, so updates made in the admin panel didn't trigger a refresh in the client dashboard.

## Solution

### 1. Expanded Invoice Query

Updated the invoice queries in the client dashboard to include both "sent" AND "paid" statuses:

**File**: `components/client/client-dashboard-tabs.tsx`

Changed from:

```typescript
.eq("status", "sent")
```

To:

```typescript
.in("status", ["sent", "paid"])
```

This was applied to both invoice queries:

- Invoices by client ID (line ~260)
- Invoices by project IDs (line ~290)

### 2. Added Real-time Subscription

Implemented a Supabase real-time subscription to listen for invoice changes:

**File**: `components/client/client-dashboard-tabs.tsx`

```typescript
// Subscribe to real-time invoice updates
useEffect(() => {
  if (!clientData?.id) return;

  const supabase = createClient();

  // Subscribe to all changes on the invoices table for this client
  const channel = supabase
    .channel(`invoices-${clientData.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "invoices",
        filter: `client_id=eq.${clientData.id}`,
      },
      (payload: any) => {
        console.log("📡 Invoice change detected:", payload);
        // Re-fetch invoice data when any change is detected
        fetchClientData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [clientData?.id, fetchClientData]);
```

## How It Works

1. **Initial Load**: Client dashboard fetches all invoices with status "sent" OR "paid" (that are shared with client)
2. **Real-time Sync**: When admin updates an invoice status in the admin panel:
   - The `updateInvoiceStatus` server action updates the database
   - The Supabase real-time subscription detects the change
   - The client dashboard automatically re-fetches all invoice data
   - The UI updates to show the new status

## Benefits

- **Instant Updates**: Changes made in the admin panel are immediately visible to clients
- **No Manual Refresh**: Clients don't need to refresh the page to see updated invoice statuses
- **Scalable**: The subscription pattern can be extended to other data types (projects, files, etc.)
- **Reliable**: Uses Supabase's built-in real-time capabilities for guaranteed delivery

## Testing

To verify the fix works:

1. Log in to the admin dashboard as adwait@thelostproject.in
2. Navigate to Invoices page
3. Open a second browser window and log in as a client
4. In the admin dashboard, change an invoice status to "paid"
5. In the client dashboard, the invoice should automatically update to show "paid" status within 1-2 seconds

## Files Modified

- `components/client/client-dashboard-tabs.tsx`
  - Added real-time subscription for invoice changes
  - Updated invoice queries to include "paid" status
