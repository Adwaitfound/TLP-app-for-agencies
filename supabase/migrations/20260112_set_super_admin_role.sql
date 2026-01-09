-- Set adwait@thelostproject.in as the ONLY super admin after enum values exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    -- First, remove super_admin role from everyone
    UPDATE users
    SET role = 'admin'
    WHERE role = 'super_admin' AND email != 'adwait@thelostproject.in';
    
    -- Then set adwait@thelostproject.in as super_admin
    UPDATE users
    SET role = 'super_admin'
    WHERE email = 'adwait@thelostproject.in';
    
    RAISE NOTICE 'Set adwait@thelostproject.in as the only super_admin';
  ELSE
    RAISE NOTICE 'super_admin not present in user_role enum; skipping role update';
  END IF;
END $$;