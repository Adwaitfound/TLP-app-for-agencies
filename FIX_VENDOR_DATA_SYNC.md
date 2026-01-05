# Fix Vendor Payment Data Mismatch

## Problem

When a payment is deleted from the `vendor_payments` table, the vendor's `total_amount_paid` is not being updated. This causes data inconsistency.

**Example:** Anurag Gaikwad was paid ₹10,000 once, but the total shows ₹20,000. When deleting one payment, it doesn't sync with the vendor totals.

## Root Cause

The trigger function `update_vendor_stats()` in the database was only handling INSERT and UPDATE operations, not DELETE operations. This means:

- ✅ When a payment is created with status 'completed', vendor total increases
- ✅ When a payment is updated from 'pending' to 'completed', vendor total increases
- ❌ When a payment is deleted, vendor total is NOT decreased

## Solution Implemented

A new migration has been created: `supabase/migrations/20250105_fix_vendor_payment_sync.sql`

This migration does THREE things:

### 1. **Enhanced Trigger Function**

The `update_vendor_stats()` function now handles INSERT, UPDATE, **and DELETE** operations:

```sql
CREATE OR REPLACE FUNCTION update_vendor_stats()
RETURNS TRIGGER AS $$
  -- Handles all three operations correctly
  -- If DELETE: subtracts the deleted payment amount from vendor total
  -- If INSERT: adds amount if status is 'completed'
  -- If UPDATE: adjusts based on status changes
END;
```

**Key Logic:**

- Tracks both old and new amounts
- Only affects "completed" payments
- Decreases total when payment is deleted
- Updates total_projects_worked count

### 2. **Fixed Trigger Registration**

```sql
DROP TRIGGER IF EXISTS update_vendor_stats_on_payment ON vendor_payments;
CREATE TRIGGER update_vendor_stats_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_stats();
```

Now includes DELETE operation!

### 3. **Data Sync & Correction**

The migration automatically recalculates all vendor totals:

```sql
DO $$
DECLARE
    vendor_record RECORD;
BEGIN
    FOR vendor_record IN SELECT DISTINCT vendor_id FROM vendor_payments LOOP
        UPDATE vendors
        SET
            total_amount_paid = COALESCE((
                SELECT SUM(amount)
                FROM vendor_payments
                WHERE vendor_id = vendor_record.vendor_id
                AND status = 'completed'
            ), 0),
            total_projects_worked = COALESCE((
                SELECT COUNT(DISTINCT project_id)
                FROM vendor_payments
                WHERE vendor_id = vendor_record.vendor_id
                AND project_id IS NOT NULL
                AND status = 'completed'
            ), 0)
        WHERE id = vendor_record.vendor_id;
    END LOOP;
END $$;
```

This corrects ALL existing mismatches in your data!

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire contents of:
   ```
   supabase/migrations/20250105_fix_vendor_payment_sync.sql
   ```
6. Click **Run**
7. Wait for completion (should see "Query executed successfully")

### Option 2: Using Supabase CLI

```bash
cd "/Users/adwaitparchure/TLP-app for agnecies"
supabase db push
```

This will automatically run all pending migrations including this one.

### Option 3: Manual Reset (If Needed)

If you need to manually verify data before/after:

```sql
-- Check current vendor totals BEFORE fix
SELECT id, name, total_amount_paid, total_projects_worked
FROM vendors
WHERE name LIKE '%Anurag%' OR name LIKE '%gaikwad%';

-- Run the migration script

-- Check vendor totals AFTER fix (should be corrected)
SELECT id, name, total_amount_paid, total_projects_worked
FROM vendors
WHERE name LIKE '%Anurag%' OR name LIKE '%gaikwad%';
```

## Verification

After applying the migration:

### Test 1: Delete a Payment

1. Go to Payments tab
2. Delete a payment (e.g., the ₹10,000 payment for Anurag Gaikwad)
3. Check vendor list - Anurag's total should automatically decrease
4. Expected: If he had ₹20,000 and you delete ₹10,000, total should become ₹10,000

### Test 2: Create New Payment

1. Add a ₹5,000 payment to Anurag
2. Total should increase to ₹15,000 (from ₹10,000)

### Test 3: Check Vendor Details

1. Go to Vendors tab → Vendors list
2. Click on any vendor
3. Total shown in table should match sum of all completed payments

## Technical Details

### Affected Tables

- `vendors` - total_amount_paid, total_projects_worked columns
- `vendor_payments` - all operations (INSERT, UPDATE, DELETE)

### Trigger Behavior

| Operation | Status Change       | Vendor Total Action |
| --------- | ------------------- | ------------------- |
| INSERT    | pending → completed | ➕ Increase         |
| INSERT    | pending → other     | No change           |
| UPDATE    | pending → completed | ➕ Increase         |
| UPDATE    | completed → pending | ➖ Decrease         |
| UPDATE    | completed → other   | ➖ Decrease         |
| DELETE    | was completed       | ➖ Decrease         |
| DELETE    | was pending         | No change           |

### New Helper Function

A new function is also created for manual recalculation (in case needed):

```sql
SELECT * FROM recalculate_vendor_stats(NULL); -- Recalc all vendors
SELECT * FROM recalculate_vendor_stats('vendor-uuid'); -- Recalc specific vendor
```

## Data Integrity

✅ **Before Migration:**

- Deleting payments doesn't update vendor totals
- Data becomes inconsistent

✅ **After Migration:**

- All existing mismatches are corrected
- Future deletions automatically update vendor totals
- Project counts are also recalculated

## Questions?

If you encounter issues:

1. Check the migration file exists: `supabase/migrations/20250105_fix_vendor_payment_sync.sql`
2. Verify database logs in Supabase Dashboard → Logs
3. Test with a single vendor first before applying widely
