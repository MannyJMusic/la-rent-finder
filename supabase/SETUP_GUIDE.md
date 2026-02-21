# Supabase Setup Guide - Quick Start

This is a step-by-step guide to get your Supabase database up and running for the LA Rent Finder application.

## Prerequisites

- A Supabase account (free tier is sufficient for development)
- Basic understanding of SQL and PostgreSQL

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: `la-rent-finder` (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely!)
   - **Region**: Select the region closest to your users (e.g., US West for LA)
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

## Step 2: Run Database Migration

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Open the file: `supabase/migrations/20260211000001_initial_schema.sql` in this repository
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see a success message: "Success. No rows returned"

### What This Creates

The migration creates:
- 6 tables: users, apartments, favorites, appointments, messages, chats
- All necessary indexes for performance
- Row-Level Security (RLS) policies for data protection
- Helper functions for geospatial queries
- Auto-update triggers for timestamps

## Step 3: Verify Tables Were Created

1. Click **"Table Editor"** in the left sidebar
2. You should see all 6 tables listed:
   - users
   - apartments
   - favorites
   - appointments
   - messages
   - chats
3. Click on each table to see its columns and structure

## Step 4: (Optional) Load Sample Data

1. Go back to **"SQL Editor"**
2. Click **"New Query"**
3. Open the file: `supabase/seed.sql`
4. Copy and paste the contents
5. Click **"Run"**
6. Go to **"Table Editor"** and check that data appears in the tables

The seed data includes:
- 3 sample users
- 6 sample apartments in different LA neighborhoods
- Sample favorites, appointments, messages, and chat history

## Step 5: Get Your API Keys

1. Click **"Settings"** in the left sidebar (gear icon)
2. Click **"API"** under Project Settings
3. You'll see:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **Project API keys**:
     - **anon / public**: Copy this key (safe for client-side code)
     - **service_role**: Copy this key (KEEP SECRET - server-side only)

## Step 6: Configure Environment Variables

1. In your project root, open (or create) `.env.local`
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

3. Save the file
4. Restart your development server (`npm run dev`)

## Step 7: Test the Connection

Create a simple test page or API route to verify the connection:

```typescript
// Test in a page or API route
import { supabase } from '@/lib/supabase';

// Try fetching apartments
const { data, error } = await supabase
  .from('apartments')
  .select('*')
  .limit(5);

if (error) {
  console.error('Connection error:', error);
} else {
  console.log('Connected! Found apartments:', data);
}
```

## Troubleshooting

### Error: "Extension 'uuid-ossp' is not available"

Some Supabase projects don't have this extension enabled by default.

**Solution**: In SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "Extension 'postgis' is not available"

PostGIS may need to be enabled manually.

**Solution**: In SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Tables not appearing

- Make sure you ran the migration successfully
- Check for any error messages in the SQL Editor
- Verify you're looking at the correct project

### RLS blocking queries

Row-Level Security policies require authenticated users for most operations.

**For testing without authentication**:
```sql
-- Temporarily disable RLS (testing only!)
ALTER TABLE apartments DISABLE ROW LEVEL SECURITY;
```

Remember to re-enable before going to production!

### Environment variables not loading

- Make sure `.env.local` is in the project root (not in a subdirectory)
- Restart your Next.js dev server after changing environment variables
- Verify there are no typos in variable names

## Next Steps

After successful setup:

1. Enable authentication (Supabase Auth)
2. Test CRUD operations for apartments
3. Implement search functionality
4. Set up real-time subscriptions for chat features
5. Configure storage buckets for apartment photos

## Security Checklist

- [ ] Service role key is in `.env.local` (not committed to Git)
- [ ] `.env.local` is in `.gitignore`
- [ ] RLS policies are enabled on all tables
- [ ] Database password is stored securely
- [ ] API keys are not exposed in client-side code (except anon key)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Need Help?**

- Check the main README: `supabase/README.md`
- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Supabase GitHub: [github.com/supabase/supabase](https://github.com/supabase/supabase)
