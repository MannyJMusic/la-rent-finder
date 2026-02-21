# LA Rent Finder - Supabase Database Setup

This directory contains the database schema, migrations, and setup instructions for the LA Rent Finder application using Supabase (PostgreSQL).

## Directory Structure

```
supabase/
├── README.md                           # This file
├── migrations/
│   └── 20260211000001_initial_schema.sql  # Initial database schema
└── seed.sql                            # Sample data for development
```

## Database Schema Overview

### Tables

1. **users** - User account information
   - id (UUID, Primary Key)
   - email, password_hash
   - first_name, last_name, phone
   - preferences (JSONB)
   - created_at, updated_at

2. **apartments** - Rental property listings
   - id (UUID, Primary Key)
   - title, description, address, location
   - price, latitude, longitude
   - bedrooms, bathrooms, square_feet
   - amenities (JSONB), photos (text[])
   - availability_score
   - Various property details
   - created_at, updated_at

3. **favorites** - User saved apartments
   - user_id, apartment_id (Composite Primary Key)
   - notes
   - created_at

4. **appointments** - Viewing appointments
   - id (UUID, Primary Key)
   - user_id, apartment_id (Foreign Keys)
   - scheduled_time, status
   - notes, reminder_sent
   - created_at, updated_at

5. **messages** - Direct messaging between users
   - id (UUID, Primary Key)
   - sender_id, recipient_id, apartment_id (Foreign Keys)
   - subject, content, read
   - created_at

6. **chats** - AI agent chat history
   - id (UUID, Primary Key)
   - user_id (Foreign Key)
   - agent_type, title
   - messages (JSONB), metadata (JSONB)
   - created_at, updated_at

### Features

- **Foreign Keys**: All relationships properly defined with CASCADE deletes
- **Indexes**: Optimized for common queries (user_id, apartment_id, created_at, etc.)
- **Geospatial Support**: PostGIS extension for location-based searches
- **Row-Level Security (RLS)**: Comprehensive policies for all tables
- **Auto-Update Triggers**: Automatic updated_at timestamps
- **Helper Functions**: `search_apartments_nearby()` for radius searches

## Setup Instructions

### Option 1: Using Supabase Cloud (Recommended)

1. **Create a Supabase Project**
   ```bash
   # Go to https://supabase.com/dashboard
   # Click "New Project"
   # Fill in project details:
   #   - Name: la-rent-finder
   #   - Database Password: (save this securely)
   #   - Region: (choose closest to your users)
   ```

2. **Run the Migration**
   - In Supabase Dashboard, go to **SQL Editor**
   - Click **New Query**
   - Copy the contents of `migrations/20260211000001_initial_schema.sql`
   - Paste and click **Run**
   - Verify all tables are created in the **Table Editor**

3. **Load Sample Data (Optional)**
   - In SQL Editor, create a new query
   - Copy the contents of `seed.sql`
   - Run the query
   - Check Table Editor to verify data

4. **Get Your API Keys**
   - Go to **Project Settings** > **API**
   - Copy:
     - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
     - Anon/Public Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
     - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) - Keep this secret!

5. **Configure Environment Variables**
   ```bash
   # In your project root, update .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Option 2: Using Supabase CLI (Local Development)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase**
   ```bash
   # From project root
   supabase init
   ```

3. **Start Local Supabase**
   ```bash
   supabase start
   ```
   This will start local PostgreSQL, PostgREST, and other services.

4. **Apply Migrations**
   ```bash
   supabase db reset
   ```
   This will apply all migrations in the `migrations/` folder.

5. **Load Seed Data**
   ```bash
   supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
   ```

6. **Get Local Connection Info**
   ```bash
   supabase status
   ```
   Update `.env.local` with the local URLs and keys.

### Option 3: Manual PostgreSQL Setup

If you prefer to use a different PostgreSQL provider:

1. Create a new PostgreSQL database
2. Run the migration SQL file manually
3. Update connection strings in your environment variables

## Verifying the Setup

### Check Tables
```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

### Check RLS Policies
```sql
-- List all RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### Check Indexes
```sql
-- List all indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

### Test Geospatial Function
```sql
-- Find apartments within 5 miles of Santa Monica
SELECT * FROM search_apartments_nearby(34.0195, -118.4912, 5);
```

## Row-Level Security (RLS)

All tables have RLS enabled with policies that:
- **users**: Users can only read/update their own data
- **apartments**: Everyone can read, authenticated users can insert/update
- **favorites**: Users can only manage their own favorites
- **appointments**: Users can only manage their own appointments
- **messages**: Users can only see messages they sent or received
- **chats**: Users can only access their own chat history

## Database Migrations

When making schema changes:

1. Create a new migration file in `migrations/`
   - Name format: `YYYYMMDDHHMMSS_description.sql`
   - Example: `20260212120000_add_reviews_table.sql`

2. Write your migration SQL
   ```sql
   -- Migration: Add reviews table
   CREATE TABLE reviews (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES users(id),
       apartment_id UUID REFERENCES apartments(id),
       rating INTEGER CHECK (rating >= 1 AND rating <= 5),
       comment TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. Apply the migration
   - Supabase Cloud: Run in SQL Editor
   - Supabase CLI: `supabase db reset` or `supabase db push`

## Troubleshooting

### Tables not appearing
- Check that extensions are enabled (uuid-ossp, postgis)
- Verify you have proper permissions

### RLS blocking queries
- RLS policies require authenticated users
- For testing, you can temporarily disable RLS:
  ```sql
  ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
  ```
- Remember to re-enable in production!

### Geospatial queries not working
- Ensure PostGIS extension is installed
- Check that latitude/longitude values are valid decimals

## Security Best Practices

1. **Never commit** `.env.local` or expose Service Role Key
2. **Use RLS policies** to protect sensitive data
3. **Validate input** on the client and server
4. **Use Supabase Auth** for user authentication (not custom password handling)
5. **Rotate API keys** periodically

## Next Steps

After setting up the database:
1. Create Supabase client configuration (`lib/supabase.ts`)
2. Implement authentication with Supabase Auth
3. Build API routes for apartment search
4. Integrate with Next.js frontend

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
