-- Add 'in_progress' to comment_status enum to align UI
DO $$
BEGIN
    -- Add value if it does not already exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'comment_status'
        AND e.enumlabel = 'in_progress'
    ) THEN
        ALTER TYPE comment_status ADD VALUE 'in_progress';
    END IF;
END $$;

-- Optional: Verify existing rows are valid (no change needed if only 'pending'/'resolved' exist)
-- SELECT status, COUNT(*) FROM project_comments GROUP BY status;
