-- Function to check payment and organization status
-- Run this in Supabase SQL Editor first

CREATE OR REPLACE FUNCTION check_payment_status()
RETURNS TABLE (
  payment_id UUID,
  razorpay_order_id TEXT,
  payment_status TEXT,
  admin_email TEXT,
  agency_name TEXT,
  org_created BOOLEAN,
  org_name TEXT,
  org_slug TEXT,
  magic_links_count BIGINT,
  valid_links_count BIGINT,
  setup_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as payment_id,
    p.razorpay_order_id,
    p.status as payment_status,
    p.notes->>'admin_email' as admin_email,
    p.notes->>'agency_name' as agency_name,
    (p.org_id IS NOT NULL) as org_created,
    o.name as org_name,
    o.slug as org_slug,
    COUNT(ml.id) as magic_links_count,
    COUNT(CASE WHEN ml.used_at IS NULL AND ml.expires_at > NOW() THEN 1 END) as valid_links_count,
    CASE 
      WHEN COUNT(CASE WHEN ml.used_at IS NULL AND ml.expires_at > NOW() THEN 1 END) > 0 THEN
        (SELECT token FROM saas_magic_links WHERE org_id = p.org_id AND type = 'signup' AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1)
      ELSE NULL
    END as setup_url
  FROM saas_organization_payments p
  LEFT JOIN saas_organizations o ON p.org_id = o.id
  LEFT JOIN saas_magic_links ml ON ml.org_id = o.id AND ml.type = 'signup'
  WHERE p.status IN ('captured', 'authorized')
  GROUP BY p.id, p.razorpay_order_id, p.status, p.notes, o.name, o.slug
  ORDER BY p.created_at DESC;
END;
$$;
