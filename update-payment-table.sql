-- Make org_id nullable and add 'free' to plan_type check
ALTER TABLE saas_organization_payments 
ALTER COLUMN org_id DROP NOT NULL;

ALTER TABLE saas_organization_payments 
DROP CONSTRAINT IF EXISTS saas_organization_payments_plan_type_check;

ALTER TABLE saas_organization_payments 
ADD CONSTRAINT saas_organization_payments_plan_type_check 
CHECK (plan_type IN ('free', 'standard', 'premium'));

-- Add comment explaining why org_id is nullable
COMMENT ON COLUMN saas_organization_payments.org_id IS 'Nullable: Payment is created before organization (linked after webhook creates org)';
