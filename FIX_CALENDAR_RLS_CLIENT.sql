-- Fix calendar_events RLS to allow clients to see events for their projects
-- Apply via Supabase Dashboard SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "calendar_events read" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events update" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events delete" ON public.calendar_events;

-- SELECT: Allow users to see calendar events for projects they have access to
CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT
  USING (
    -- Super admin, admin, project manager, agency admin can see all
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin', 'project_manager', 'agency_admin')
    )
    OR
    -- Employees can see events for projects they're assigned to
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = calendar_events.project_id
      AND pt.user_id = auth.uid()
    )
    OR
    -- Clients can see events for their projects
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = calendar_events.project_id
      AND c.user_id = auth.uid()
    )
  );

-- INSERT: Allow team members and clients to create events
CREATE POLICY "calendar_events_insert" ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    -- Super admin, admin, project manager, agency admin can create
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin', 'project_manager', 'agency_admin')
    )
    OR
    -- Employees can create events for their assigned projects
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = calendar_events.project_id
      AND pt.user_id = auth.uid()
    )
  );

-- UPDATE: Allow team members to update events
CREATE POLICY "calendar_events_update" ON public.calendar_events
  FOR UPDATE
  USING (
    -- Super admin, admin, project manager, agency admin can update
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin', 'project_manager', 'agency_admin')
    )
    OR
    -- Employees can update events for their assigned projects
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = calendar_events.project_id
      AND pt.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same check for the updated data
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin', 'project_manager', 'agency_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = calendar_events.project_id
      AND pt.user_id = auth.uid()
    )
  );

-- DELETE: Allow team members to delete events
CREATE POLICY "calendar_events_delete" ON public.calendar_events
  FOR DELETE
  USING (
    -- Super admin, admin, project manager, agency admin can delete
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'admin', 'project_manager', 'agency_admin')
    )
    OR
    -- Employees can delete events for their assigned projects
    EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = calendar_events.project_id
      AND pt.user_id = auth.uid()
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id ON public.calendar_events(project_id);

-- Test the policies (run this as a client user to verify)
-- SELECT * FROM calendar_events LIMIT 5;
