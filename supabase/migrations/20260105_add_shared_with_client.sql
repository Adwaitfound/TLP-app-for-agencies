-- Add shared_with_client column to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN DEFAULT true;

-- Create an index for faster queries on shared invoices
CREATE INDEX IF NOT EXISTS idx_invoices_shared_with_client 
ON public.invoices(shared_with_client) 
WHERE shared_with_client = true;

-- Update existing invoices to be shared by default
UPDATE public.invoices SET shared_with_client = true WHERE shared_with_client IS NULL;
