-- Milestones: add ordering and audit fields, plus update trigger

-- Ensure the helper trigger function exists
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = TIMEZONE('utc'::text, NOW());
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $do$ LANGUAGE plpgsql;

-- Add columns if missing
ALTER TABLE IF EXISTS milestones
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_email TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Backfill position per project order by created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS rn
  FROM milestones
)
UPDATE milestones m
SET position = ranked.rn
FROM ranked
WHERE ranked.id = m.id;

-- Optional: backfill created_by_email to primary admin
UPDATE milestones
SET created_by_email = 'adwait@thelostproject.in'
WHERE created_by_email IS NULL;

-- Keep updated_at in sync on updates
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Helpful index for ordering/filtering
CREATE INDEX IF NOT EXISTS idx_milestones_project_position ON milestones(project_id, position);
