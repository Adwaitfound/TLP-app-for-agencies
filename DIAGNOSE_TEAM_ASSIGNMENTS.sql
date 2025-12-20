-- Diagnostic queries to check team member assignments
-- Run these in your Supabase SQL Editor to see what's in the database

-- 1. Check all project_team assignments
SELECT 
  pt.project_id,
  p.name as project_name,
  pt.user_id,
  u.email,
  u.full_name,
  u.role,
  pt.role as assignment_role
FROM project_team pt
LEFT JOIN projects p ON pt.project_id = p.id
LEFT JOIN users u ON pt.user_id = u.id
ORDER BY p.created_at DESC;

-- 2. Count assignments per project
SELECT 
  p.id,
  p.name,
  COUNT(pt.user_id) as team_member_count
FROM projects p
LEFT JOIN project_team pt ON p.id = pt.project_id
GROUP BY p.id, p.name
ORDER BY team_member_count DESC;

-- 3. Check for orphaned assignments (where user or project doesn't exist)
SELECT 
  pt.*,
  CASE 
    WHEN u.id IS NULL THEN 'USER MISSING'
    WHEN p.id IS NULL THEN 'PROJECT MISSING'
    ELSE 'OK'
  END as status
FROM project_team pt
LEFT JOIN users u ON pt.user_id = u.id
LEFT JOIN projects p ON pt.project_id = p.id;

-- 4. Check if there are duplicate assignments
SELECT 
  project_id,
  user_id,
  COUNT(*) as count
FROM project_team
GROUP BY project_id, user_id
HAVING COUNT(*) > 1;

-- 5. List all users available for assignment
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM users
WHERE role IN ('admin', 'project_manager')
ORDER BY created_at DESC;
