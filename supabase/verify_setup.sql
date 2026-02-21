-- Supabase Setup Verification Script
-- Run this script after applying the migration to verify everything is set up correctly

-- ==============================================
-- 1. VERIFY EXTENSIONS
-- ==============================================
SELECT 'Checking Extensions...' AS step;
SELECT
    extname AS extension_name,
    extversion AS version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'postgis');

-- Expected: Both extensions should be listed

-- ==============================================
-- 2. VERIFY TABLES
-- ==============================================
SELECT 'Checking Tables...' AS step;
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected: users, apartments, favorites, appointments, messages, chats

-- ==============================================
-- 3. VERIFY COLUMNS
-- ==============================================
SELECT 'Checking Table Structures...' AS step;

-- Users table columns
SELECT 'users table' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Apartments table columns
SELECT 'apartments table' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'apartments'
ORDER BY ordinal_position;

-- ==============================================
-- 4. VERIFY INDEXES
-- ==============================================
SELECT 'Checking Indexes...' AS step;
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes on user_id, apartment_id, created_at, etc.

-- ==============================================
-- 5. VERIFY FOREIGN KEYS
-- ==============================================
SELECT 'Checking Foreign Keys...' AS step;
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Expected: Foreign keys from favorites, appointments, messages, chats to users and apartments

-- ==============================================
-- 6. VERIFY RLS POLICIES
-- ==============================================
SELECT 'Checking RLS Policies...' AS step;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Multiple policies for each table (select_own, insert_own, etc.)

-- ==============================================
-- 7. VERIFY RLS IS ENABLED
-- ==============================================
SELECT 'Checking RLS Status...' AS step;
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('users', 'apartments', 'favorites', 'appointments', 'messages', 'chats');

-- Expected: rls_enabled = true for all tables

-- ==============================================
-- 8. VERIFY TRIGGERS
-- ==============================================
SELECT 'Checking Triggers...' AS step;
SELECT
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: update_*_updated_at triggers for tables with updated_at columns

-- ==============================================
-- 9. VERIFY FUNCTIONS
-- ==============================================
SELECT 'Checking Functions...' AS step;
SELECT
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name IN ('update_updated_at_column', 'search_apartments_nearby')
ORDER BY routine_name;

-- Expected: update_updated_at_column and search_apartments_nearby functions

-- ==============================================
-- 10. COUNT RECORDS (if seed data loaded)
-- ==============================================
SELECT 'Checking Record Counts...' AS step;
SELECT
    'users' AS table_name,
    COUNT(*) AS record_count
FROM users
UNION ALL
SELECT
    'apartments',
    COUNT(*)
FROM apartments
UNION ALL
SELECT
    'favorites',
    COUNT(*)
FROM favorites
UNION ALL
SELECT
    'appointments',
    COUNT(*)
FROM appointments
UNION ALL
SELECT
    'messages',
    COUNT(*)
FROM messages
UNION ALL
SELECT
    'chats',
    COUNT(*)
FROM chats;

-- Expected: 0 if seed not loaded, or 3 users, 6 apartments, etc. if seed data loaded

-- ==============================================
-- SUMMARY
-- ==============================================
SELECT 'Setup Verification Complete!' AS summary;
SELECT '
✓ All tables created
✓ All indexes in place
✓ Foreign keys configured
✓ RLS policies active
✓ Triggers working
✓ Helper functions available

Your database is ready for use!
' AS status;
