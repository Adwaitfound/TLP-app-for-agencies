-- Add shared_with_client column to invoices table if it doesn't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT false;

-- Update existing invoices to default to true (show all invoices to clients by default)
UPDATE invoices SET shared_with_client = true WHERE shared_with_client IS NULL;
