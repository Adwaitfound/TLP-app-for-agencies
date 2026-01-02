-- Add agency_admin role to user_role enum
ALTER TYPE user_role ADD VALUE 'agency_admin' BEFORE 'admin';
