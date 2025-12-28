-- =====================================================
-- TEAM CHAT SETUP - Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Step 2: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Step 3: Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Set replica identity (REQUIRED for realtime to work!)
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Step 5: Enable realtime for the table (CRITICAL for chat to work!)
-- If you get an error, the publication might already include this table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication, ignore error
END $$;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read messages if not client" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages if not client" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;

-- Step 7: Create RLS policies
-- Policy: Users can read all messages if they're admin, PM, or employee
CREATE POLICY "Users can read messages if not client"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager', 'employee')
        )
    );

-- Policy: Users can insert their own messages if they're admin, PM, or employee
CREATE POLICY "Users can insert own messages if not client"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager', 'employee')
        )
    );

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
    ON chat_messages
    FOR DELETE
    USING (auth.uid() = user_id);

-- Done! Chat is now ready to use.
