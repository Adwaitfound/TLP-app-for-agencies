-- Query to check payment and organization status
-- Run this in your Supabase SQL Editor

-- 1. Check all payments
SELECT 
  id,
  razorpay_order_id,
  razorpay_payment_id,
  status,
  amount,
  plan_type,
  billing_cycle,
  org_id,
  notes->>'admin_email' as admin_email,
  notes->>'agency_name' as agency_name,
  created_at,
  completed_at
FROM saas_organization_payments
ORDER BY created_at DESC;

-- 2. Check if organizations were created
SELECT 
  p.id as payment_id,
  p.razorpay_order_id,
  p.notes->>'admin_email' as admin_email,
  p.notes->>'agency_name' as agency_name,
  p.status as payment_status,
  o.id as org_id,
  o.name as org_name,
  o.slug as org_slug,
  o.plan as org_plan,
  o.status as org_status
FROM saas_organization_payments p
LEFT JOIN saas_organizations o ON p.org_id = o.id
ORDER BY p.created_at DESC;

-- 3. Check magic links
SELECT 
  ml.id,
  ml.email,
  ml.type,
  ml.token,
  ml.expires_at,
  ml.used_at,
  ml.created_at,
  CASE 
    WHEN ml.used_at IS NOT NULL THEN 'USED'
    WHEN ml.expires_at < NOW() THEN 'EXPIRED'
    ELSE 'VALID'
  END as link_status,
  o.name as org_name,
  o.slug as org_slug
FROM saas_magic_links ml
LEFT JOIN saas_organizations o ON ml.org_id = o.id
WHERE ml.type = 'signup'
ORDER BY ml.created_at DESC;

-- 4. Full status check - Combined view
SELECT 
  p.razorpay_order_id,
  p.status as payment_status,
  p.notes->>'admin_email' as admin_email,
  p.notes->>'agency_name' as agency_name,
  CASE WHEN p.org_id IS NOT NULL THEN 'YES' ELSE 'NO' END as org_created,
  o.name as org_name,
  COUNT(ml.id) as magic_links_count,
  COUNT(CASE WHEN ml.used_at IS NULL AND ml.expires_at > NOW() THEN 1 END) as valid_links
FROM saas_organization_payments p
LEFT JOIN saas_organizations o ON p.org_id = o.id
LEFT JOIN saas_magic_links ml ON ml.org_id = o.id AND ml.type = 'signup'
WHERE p.status = 'captured'
GROUP BY p.id, p.razorpay_order_id, p.status, p.notes, o.name
ORDER BY p.created_at DESC;
