-- ============================================
-- CREATE ADMIN USER FOR SINGLE-INSTANCE
-- ============================================
-- Change the email and password below to your preferences
-- ============================================

DO $$
DECLARE
  admin_email TEXT := 'admin@example.com';  -- CHANGE THIS
  admin_password TEXT := 'admin123';        -- CHANGE THIS
  admin_name TEXT := 'Admin User';          -- CHANGE THIS
  user_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', admin_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE
    SET encrypted_password = crypt(admin_password, gen_salt('bf'))
  RETURNING id INTO user_id;

  -- Create or update users table record
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (user_id, admin_email, admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE
    SET 
      email = admin_email,
      full_name = admin_name,
      role = 'admin';

  RAISE NOTICE 'Admin user created/updated successfully!';
  RAISE NOTICE 'Email: %', admin_email;
  RAISE NOTICE 'Password: %', admin_password;
  RAISE NOTICE 'User ID: %', user_id;
END $$;

-- Verify the user was created
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM public.users u
WHERE u.email = 'admin@example.com';  -- Match the email you set above
