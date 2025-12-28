-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

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
