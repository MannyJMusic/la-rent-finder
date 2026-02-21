-- ==========================================
-- SUPABASE SCHEMA VERIFICATION QUERIES
-- ==========================================
-- Run these queries in the Supabase SQL Editor to verify your setup
-- Copy and paste each section individually

-- ==========================================
-- 1. CHECK EXTENSIONS
-- ==========================================
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm')
ORDER BY extname;

-- Expected output: 3 rows with uuid-ossp, postgis, and pg_trgm


-- ==========================================
-- 2. CHECK ALL TABLES EXIST
-- ==========================================
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected: 10 tables
-- apartments, appointments, chats, cost_estimates, favorites,
-- listing_scores, messages, searches, user_preferences, users


-- ==========================================
-- 3. CHECK TABLE COLUMNS
-- ==========================================

-- Users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Apartments table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'apartments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- User preferences table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Listing scores table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_scores'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cost estimates table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cost_estimates'
  AND table_schema = 'public'
ORDER BY ordinal_position;


-- ==========================================
-- 4. CHECK INDEXES
-- ==========================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes on each table including:
-- - Primary key indexes
-- - Foreign key indexes
-- - Geospatial index (idx_apartments_coordinates)
-- - GIN indexes for arrays and full-text search


-- ==========================================
-- 5. CHECK FOREIGN KEY CONSTRAINTS
-- ==========================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Expected: Foreign keys linking:
-- - user_preferences → users
-- - favorites → users, apartments
-- - appointments → users, apartments
-- - messages → users, apartments
-- - chats → users
-- - searches → users
-- - listing_scores → apartments, users, searches
-- - cost_estimates → users, apartments


-- ==========================================
-- 6. CHECK ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: rowsecurity = true for all 10 tables

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Multiple policies per table for SELECT, INSERT, UPDATE, DELETE


-- ==========================================
-- 7. CHECK FUNCTIONS
-- ==========================================
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('search_apartments_nearby', 'update_updated_at_column')
ORDER BY p.proname;

-- Expected: 2 functions
-- - search_apartments_nearby (for geospatial queries)
-- - update_updated_at_column (trigger function)


-- ==========================================
-- 8. CHECK TRIGGERS
-- ==========================================
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: Triggers on users, apartments, appointments, chats,
-- user_preferences, listing_scores, cost_estimates
-- for updating updated_at timestamp


-- ==========================================
-- 9. TEST GEOSPATIAL FUNCTION
-- ==========================================

-- Test the search_apartments_nearby function
-- This searches for apartments within 5 miles of downtown LA
SELECT * FROM search_apartments_nearby(34.0522, -118.2437, 5);

-- Expected: Returns apartment_id and distance_miles
-- (Will be empty if no apartments with coordinates exist yet)


-- ==========================================
-- 10. TEST FUZZY TEXT SEARCH (pg_trgm)
-- ==========================================

-- First, insert a test apartment if none exist
INSERT INTO apartments (
    title,
    description,
    address,
    location,
    price,
    bedrooms,
    bathrooms,
    latitude,
    longitude
) VALUES (
    'Modern Downtown Loft',
    'Beautiful loft in the heart of downtown',
    '123 Main St, Los Angeles, CA 90012',
    'Downtown LA',
    2500.00,
    1,
    1.0,
    34.0522,
    -118.2437
);

-- Test similarity search
SELECT
    title,
    similarity(title, 'modern loft') AS match_score
FROM apartments
WHERE title % 'modern loft'  -- % is the similarity operator
ORDER BY match_score DESC
LIMIT 5;

-- Expected: Returns apartments with similar titles, scored by similarity


-- ==========================================
-- 11. COUNT RECORDS IN EACH TABLE
-- ==========================================

SELECT
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 'user_preferences', COUNT(*) FROM user_preferences
UNION ALL
SELECT 'apartments', COUNT(*) FROM apartments
UNION ALL
SELECT 'favorites', COUNT(*) FROM favorites
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'chats', COUNT(*) FROM chats
UNION ALL
SELECT 'searches', COUNT(*) FROM searches
UNION ALL
SELECT 'listing_scores', COUNT(*) FROM listing_scores
UNION ALL
SELECT 'cost_estimates', COUNT(*) FROM cost_estimates
ORDER BY table_name;


-- ==========================================
-- 12. SAMPLE DATA VERIFICATION
-- ==========================================

-- Check if apartments have required photo data
SELECT
    COUNT(*) as total_apartments,
    COUNT(*) FILTER (WHERE photos IS NOT NULL AND array_length(photos, 1) > 0) as with_photos,
    COUNT(*) FILTER (WHERE photos IS NULL OR array_length(photos, 1) = 0) as without_photos
FROM apartments;


-- ==========================================
-- SUCCESS CRITERIA CHECKLIST
-- ==========================================
-- Run this final query to verify all requirements are met

SELECT
    '✅ Extensions' as check_item,
    CASE
        WHEN COUNT(*) = 3 THEN 'PASS'
        ELSE 'FAIL'
    END as status
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'postgis', 'pg_trgm')

UNION ALL

SELECT
    '✅ Tables',
    CASE
        WHEN COUNT(*) = 10 THEN 'PASS'
        ELSE 'FAIL'
    END
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT
    '✅ RLS Enabled',
    CASE
        WHEN COUNT(*) = 10 THEN 'PASS'
        ELSE 'FAIL'
    END
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true

UNION ALL

SELECT
    '✅ Functions',
    CASE
        WHEN COUNT(*) >= 2 THEN 'PASS'
        ELSE 'FAIL'
    END
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('search_apartments_nearby', 'update_updated_at_column')

UNION ALL

SELECT
    '✅ Indexes',
    CASE
        WHEN COUNT(*) > 30 THEN 'PASS'
        ELSE 'FAIL'
    END
FROM pg_indexes
WHERE schemaname = 'public';

-- Expected: All checks should show PASS
