-- =====================================================
-- VERIFY CHAT SETUP - Run this to check if everything is configured
-- =====================================================

-- Check if table exists
SELECT 
    'chat_messages table' AS check_name,
    CASE WHEN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_messages'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status;

-- Check if RLS is enabled
SELECT 
    'RLS enabled' AS check_name,
    CASE WHEN relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS status
FROM pg_class
WHERE relname = 'chat_messages';

-- Check replica identity (needed for realtime)
SELECT 
    'Replica Identity' AS check_name,
    CASE relreplident 
        WHEN 'f' THEN '✅ FULL (realtime will work)'
        WHEN 'd' THEN '⚠️ DEFAULT (realtime might not work)'
        ELSE '❌ ' || relreplident
    END AS status
FROM pg_class
WHERE relname = 'chat_messages';

-- Check if table is in realtime publication
SELECT 
    'Realtime publication' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_messages'
    ) THEN '✅ ENABLED' ELSE '❌ NOT IN PUBLICATION' END AS status;

-- Count RLS policies
SELECT 
    'RLS policies count' AS check_name,
    COUNT(*)::text || ' policies' AS status
FROM pg_policies
WHERE tablename = 'chat_messages';

-- List all policies
SELECT 
    policyname AS policy_name,
    cmd AS command,
    CASE WHEN permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS type
FROM pg_policies
WHERE tablename = 'chat_messages';

-- Count messages
SELECT 
    'Total messages' AS check_name,
    COUNT(*)::text || ' messages' AS status
FROM chat_messages;
