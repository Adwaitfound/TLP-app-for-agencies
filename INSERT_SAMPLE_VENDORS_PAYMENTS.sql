-- Insert sample vendors
INSERT INTO vendors (name, vendor_type, email, phone, upi_id, total_projects_worked, total_amount_paid, is_active, preferred_vendor)
VALUES 
  ('Creative Studios India', 'video_editing', 'contact@creativestudios.in', '9876543210', 'creative@upi', 0, 0, true, true),
  ('VFX Masters', 'motion_graphics', 'info@vfxmasters.in', '9876543211', 'vfx@upi', 0, 0, true, true),
  ('Audio Professionals', 'sound_design', 'hello@audiopro.in', '9876543212', 'audio@upi', 0, 0, true, false),
  ('Photography Pro', 'photography', 'shoot@photopro.in', '9876543213', 'photo@upi', 0, 0, true, true),
  ('Freelance Animator', 'animation', 'animate@freelance.in', '9876543214', 'animate@upi', 0, 0, true, false)
ON CONFLICT DO NOTHING;

-- Get vendor IDs for use in payments (you may need to adjust these UUIDs if they differ)
-- First, let's insert payments referencing the vendors by their email for clarity

-- Get a sample project ID (if you have any projects)
WITH sample_vendor AS (
  SELECT id FROM vendors WHERE email = 'contact@creativestudios.in' LIMIT 1
),
sample_project AS (
  SELECT id FROM projects LIMIT 1
)
INSERT INTO vendor_payments (vendor_id, project_id, amount, payment_date, status, payment_method, description, payment_reason)
SELECT 
  (SELECT id FROM sample_vendor),
  (SELECT id FROM sample_project),
  15000.00,
  CURRENT_DATE - INTERVAL '5 days',
  'completed',
  'UPI',
  'Video editing services for Q1 project',
  'Editorial cuts - 2 videos'
WHERE EXISTS (SELECT 1 FROM sample_vendor)
ON CONFLICT DO NOTHING;

-- Insert more sample payments
WITH sample_vendor2 AS (
  SELECT id FROM vendors WHERE email = 'info@vfxmasters.in' LIMIT 1
),
sample_project AS (
  SELECT id FROM projects LIMIT 1
)
INSERT INTO vendor_payments (vendor_id, project_id, amount, payment_date, status, payment_method, description, payment_reason)
SELECT 
  (SELECT id FROM sample_vendor2),
  (SELECT id FROM sample_project),
  25000.00,
  CURRENT_DATE - INTERVAL '2 days',
  'completed',
  'Bank Transfer',
  'Motion graphics animation',
  'Opening sequence and transitions'
WHERE EXISTS (SELECT 1 FROM sample_vendor2)
ON CONFLICT DO NOTHING;

-- Insert scheduled payment
WITH sample_vendor3 AS (
  SELECT id FROM vendors WHERE email = 'hello@audiopro.in' LIMIT 1
)
INSERT INTO vendor_payments (vendor_id, amount, scheduled_date, status, payment_method, description, payment_reason)
SELECT 
  (SELECT id FROM sample_vendor3),
  8000.00,
  CURRENT_DATE + INTERVAL '7 days',
  'pending',
  'UPI',
  'Sound design services',
  'Background music and SFX'
WHERE EXISTS (SELECT 1 FROM sample_vendor3)
ON CONFLICT DO NOTHING;

-- Insert another completed payment
WITH sample_vendor4 AS (
  SELECT id FROM vendors WHERE email = 'shoot@photopro.in' LIMIT 1
)
INSERT INTO vendor_payments (vendor_id, amount, payment_date, status, payment_method, description, payment_reason)
SELECT 
  (SELECT id FROM sample_vendor4),
  12000.00,
  CURRENT_DATE - INTERVAL '10 days',
  'completed',
  'Cheque',
  'Photography session',
  'Product photography - 50 images'
WHERE EXISTS (SELECT 1 FROM sample_vendor4)
ON CONFLICT DO NOTHING;
