# Supabase Migration Guide

This guide walks you through setting up the complete Supabase database schema for the LA Rent Finder application.

## Prerequisites

- A Supabase account (free tier works fine)
- Node.js 18+ installed
- Project dependencies installed (`npm install`)

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in the details:
   - **Project Name**: `la-rent-finder`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to Los Angeles (e.g., `us-west-1`)
   - **Pricing Plan**: Free tier is sufficient for development
4. Click **"Create new project"** and wait for setup (1-2 minutes)

## Step 2: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of `supabase/migrations/20260211000001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. Verify success - you should see "Success. No rows returned"
7. Repeat for `supabase/migrations/20260211000002_add_missing_tables.sql`

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push
```

## Step 3: Verify the Schema

After running the migrations, verify everything is set up correctly:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see all 10 tables:
   - ✅ users
   - ✅ user_preferences
   - ✅ apartments
   - ✅ favorites
   - ✅ appointments
   - ✅ messages
   - ✅ chats
   - ✅ searches
   - ✅ listing_scores
   - ✅ cost_estimates

3. Check **Extensions** (Database → Extensions):
   - ✅ uuid-ossp (enabled)
   - ✅ postgis (enabled)
   - ✅ pg_trgm (enabled)

4. Check **Functions** (Database → Functions):
   - ✅ search_apartments_nearby
   - ✅ update_updated_at_column

## Step 4: Get API Keys

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 5: Configure Environment Variables

1. Open `.env.local` in the project root
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file

## Step 6: Test the Connection

Run the verification script to ensure everything works:

```bash
# Option 1: Using Node.js directly
node --loader tsx supabase/test_connection.ts

# Option 2: Using npm script (if added to package.json)
npm run test:db
```

Expected output:
```
🧪 Starting Supabase Database Tests...

✅ Database Connection
   Successfully connected to Supabase

✅ Extension: uuid-ossp
   Extension uuid-ossp is enabled

✅ Extension: postgis
   Extension postgis is enabled

✅ Extension: pg_trgm
   Extension pg_trgm is enabled

✅ Table: users
   Table users exists

... (all tests passing)

🎉 All tests passed! Your Supabase database is properly configured.
```

## Step 7: (Optional) Load Sample Data

To populate the database with sample apartments for testing:

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy the contents of `supabase/seed.sql`
4. Run the query
5. Go to **Table Editor** → **apartments** to verify data was inserted

## Common Issues & Solutions

### Issue: "relation does not exist"

**Cause**: Migration wasn't applied properly

**Solution**:
1. Check SQL Editor for error messages
2. Verify you ran BOTH migration files in order
3. Try dropping all tables and re-running migrations (⚠️ this deletes data!)

### Issue: "permission denied for table"

**Cause**: Row Level Security is blocking the query

**Solution**:
1. Make sure you're using the correct API key
2. For admin operations, use the `service_role` key
3. For user operations, make sure the user is authenticated

### Issue: "function search_apartments_nearby does not exist"

**Cause**: PostGIS extension not enabled or function not created

**Solution**:
1. Enable PostGIS: `CREATE EXTENSION postgis;`
2. Re-run the initial migration file

### Issue: "extension 'pg_trgm' is not available"

**Cause**: Extension not enabled

**Solution**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Verifying Specific Features

### Test PostGIS (Geospatial Queries)

```sql
-- Find apartments within 5 miles of downtown LA (34.0522, -118.2437)
SELECT * FROM search_apartments_nearby(34.0522, -118.2437, 5);
```

### Test pg_trgm (Fuzzy Text Search)

```sql
-- Search apartments by title similarity
SELECT title, similarity(title, 'modern loft') AS score
FROM apartments
WHERE title % 'modern loft'
ORDER BY score DESC
LIMIT 5;
```

### Test Row Level Security

```sql
-- This should return no rows (RLS blocks unauthenticated access)
SELECT * FROM user_preferences;

-- This should work (apartments are publicly readable)
SELECT * FROM apartments LIMIT 5;
```

## Next Steps

After completing this setup:

1. ✅ Database schema is ready
2. ✅ All extensions are enabled
3. ✅ RLS policies are configured
4. ✅ TypeScript types are generated
5. ➡️ Proceed to build the Next.js API routes
6. ➡️ Implement authentication with Supabase Auth
7. ➡️ Build the frontend UI components

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostGIS Documentation](https://postgis.net/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js + Supabase Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

## Schema Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│    users    │────→│ user_preferences │     │  apartments  │
└─────────────┘     └──────────────────┘     └──────────────┘
      │                                              │
      │  ┌───────────────────────────────────────┐  │
      ├─→│           favorites                   │←─┤
      │  └───────────────────────────────────────┘  │
      │  ┌───────────────────────────────────────┐  │
      ├─→│          appointments                 │←─┤
      │  └───────────────────────────────────────┘  │
      │  ┌───────────────────────────────────────┐  │
      ├─→│           messages                    │←─┤
      │  └───────────────────────────────────────┘  │
      │  ┌───────────────────────────────────────┐
      ├─→│             chats                     │
      │  └───────────────────────────────────────┘
      │  ┌───────────────────────────────────────┐
      ├─→│            searches                   │
      │  └───────────────────────────────────────┘
      │  ┌───────────────────────────────────────┐  │
      ├─→│        listing_scores                 │←─┤
      │  └───────────────────────────────────────┘  │
      │  ┌───────────────────────────────────────┐  │
      └─→│        cost_estimates                 │←─┘
         └───────────────────────────────────────┘
```

## Support

If you encounter issues not covered in this guide:
1. Check the Supabase Dashboard logs
2. Review the SQL Editor error messages
3. Search the [Supabase Discord](https://discord.supabase.com/)
4. Check the project's GitHub Issues
