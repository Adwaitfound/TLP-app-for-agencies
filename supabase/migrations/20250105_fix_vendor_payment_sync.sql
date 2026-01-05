-- ===== FIX VENDOR PAYMENT SYNCHRONIZATION =====
-- This migration fixes the data mismatch where deleting payments doesn't update vendor totals

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_vendor_stats_on_payment ON vendor_payments;
DROP FUNCTION IF EXISTS update_vendor_stats();

-- Create improved function that handles INSERT, UPDATE, and DELETE
CREATE OR REPLACE FUNCTION update_vendor_stats()
RETURNS TRIGGER AS $$
DECLARE
    vendor_id_var UUID;
    old_amount DECIMAL(15, 2);
    new_amount DECIMAL(15, 2);
    old_status payment_status;
    new_status payment_status;
BEGIN
    -- Determine which vendor and amounts to use based on operation
    IF TG_OP = 'DELETE' THEN
        vendor_id_var := OLD.vendor_id;
        old_amount := OLD.amount;
        new_amount := 0;
        old_status := OLD.status;
        new_status := NULL;
    ELSE
        vendor_id_var := NEW.vendor_id;
        old_amount := COALESCE(OLD.amount, 0);
        new_amount := NEW.amount;
        old_status := COALESCE(OLD.status, NULL);
        new_status := NEW.status;
    END IF;

    -- If payment was completed (or being deleted from completed), subtract the old amount
    IF old_status = 'completed' THEN
        UPDATE vendors
        SET total_amount_paid = total_amount_paid - old_amount,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = vendor_id_var;
    END IF;

    -- If payment is now completed (insert/update), add the new amount
    IF new_status = 'completed' THEN
        UPDATE vendors
        SET total_amount_paid = total_amount_paid + new_amount,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = vendor_id_var;
    END IF;

    -- Update vendor_project_assignments count if project is assigned
    IF vendor_id_var IS NOT NULL THEN
        UPDATE vendors
        SET total_projects_worked = (
            SELECT COUNT(DISTINCT project_id)
            FROM vendor_payments
            WHERE vendor_id = vendor_id_var
            AND project_id IS NOT NULL
            AND status = 'completed'
        ),
        updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = vendor_id_var;
    END IF;

    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, and DELETE
DROP TRIGGER IF EXISTS update_vendor_stats_on_payment ON vendor_payments;
CREATE TRIGGER update_vendor_stats_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_stats();

-- ===== RECALCULATE ALL VENDOR TOTALS (DATA SYNC) =====
-- This ensures existing data is corrected
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
            ), 0),
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = vendor_record.vendor_id;
    END LOOP;
END $$;

-- Create a function to manually recalculate vendor stats (in case needed in future)
CREATE OR REPLACE FUNCTION recalculate_vendor_stats(p_vendor_id UUID DEFAULT NULL)
RETURNS TABLE(vendor_id UUID, total_paid DECIMAL, projects_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    UPDATE vendors
    SET 
        total_amount_paid = COALESCE((
            SELECT SUM(amount)
            FROM vendor_payments
            WHERE vendor_id = CASE WHEN p_vendor_id IS NULL THEN vendors.id ELSE p_vendor_id END
            AND status = 'completed'
        ), 0),
        total_projects_worked = COALESCE((
            SELECT COUNT(DISTINCT project_id)
            FROM vendor_payments
            WHERE vendor_id = CASE WHEN p_vendor_id IS NULL THEN vendors.id ELSE p_vendor_id END
            AND project_id IS NOT NULL
            AND status = 'completed'
        ), 0),
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE p_vendor_id IS NULL OR id = p_vendor_id
    RETURNING vendors.id, vendors.total_amount_paid, vendors.total_projects_worked::BIGINT;
END;
$$ LANGUAGE plpgsql;
