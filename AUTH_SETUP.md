# Authentication Setup - REC-126

This document provides instructions for setting up Supabase authentication in the LA Rent Finder application.

## Implementation Summary

The following authentication features have been implemented:

### 1. Supabase Client Configuration
- **Browser Client** (`lib/supabase/client.ts`): For use in Client Components
- **Server Client** (`lib/supabase/server.ts`): For use in Server Components, Server Actions, and Route Handlers
- Both clients use `@supabase/ssr` for proper cookie handling and session management

### 2. Authentication Pages
- **Login Page** (`app/auth/login/page.tsx`): Email/password login with error handling
- **Signup Page** (`app/auth/signup/page.tsx`): User registration with validation
  - Password confirmation
  - Minimum 6 character password requirement
  - First name and last name collection
- **Auth Callback** (`app/auth/callback/route.ts`): Handles OAuth callbacks and email confirmations

### 3. Protected Routes
- **Middleware** (`middleware.ts`): Protects routes requiring authentication
  - Redirects unauthenticated users to login
  - Preserves the intended destination for post-login redirect
  - Protected routes: `/dashboard`, `/favorites`, `/appointments`, `/messages`, `/chat`

### 4. Dashboard & Logout
- **Dashboard** (`app/dashboard/page.tsx`): Sample protected page showing user information
- **Logout Button** (`components/LogoutButton.tsx`): Sign out functionality

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - Name: `la-rent-finder` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose closest to your users

### Step 2: Get API Keys

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - KEEP THIS SECRET!

### Step 3: Configure Environment Variables

Update your `.env.local` file with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 4: Set Up Authentication in Supabase

1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email settings:
   - **Confirm email**: Toggle off for development (optional)
   - **Secure email change**: Enable for production
   - **Secure password change**: Enable for production

### Step 5: Run Database Migrations

The database schema has already been set up in REC-124. Ensure the following tables exist:
- `users` - User profiles with preferences
- Other tables as defined in your migration

### Step 6: Test the Authentication Flow

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/signup`

3. Create a test account:
   - Fill in first name, last name, email, and password
   - Click "Create account"

4. Test the login flow:
   - Go to `http://localhost:3000/auth/login`
   - Sign in with your credentials

5. Test protected routes:
   - Try accessing `http://localhost:3000/dashboard`
   - Should redirect to login if not authenticated
   - Should display dashboard if authenticated

6. Test logout:
   - Click "Sign out" button in the dashboard
   - Should redirect to login page

## Features Implemented

### Client-Side Authentication
- Email/password signup with validation
- Email/password login
- Session persistence across page reloads
- Automatic token refresh

### Server-Side Authentication
- Middleware-based route protection
- Server-side session validation
- Secure cookie handling with `@supabase/ssr`

### User Experience
- Form validation (password matching, minimum length)
- Error messages for invalid credentials
- Loading states during authentication
- Redirect to intended destination after login
- Clean, accessible UI with Tailwind CSS

## Security Features

1. **Row-Level Security**: All database operations respect RLS policies
2. **Secure Cookies**: Session tokens stored in HTTP-only cookies
3. **Environment Variables**: Sensitive keys stored in `.env.local` (not in version control)
4. **Service Role Key**: Only used server-side for admin operations
5. **Password Requirements**: Minimum 6 characters (configurable)

## Next Steps

1. **Email Confirmation**: Enable email confirmation in Supabase dashboard
2. **Password Reset**: Implement forgot password flow
3. **OAuth Providers**: Add Google, GitHub, or other OAuth providers
4. **User Profile**: Create profile page for updating user information
5. **Session Timeout**: Configure session timeout and refresh policies

## Troubleshooting

### "Failed to fetch" Error
- Ensure Supabase URL and API keys are correctly set in `.env.local`
- Restart dev server after updating environment variables
- Check Supabase dashboard for project status

### Redirect Loop
- Clear browser cookies and local storage
- Check middleware configuration
- Ensure protected routes are properly defined

### Session Not Persisting
- Verify cookies are enabled in browser
- Check that middleware is running (should see it in request logs)
- Ensure `@supabase/ssr` is properly installed

## File Structure

```
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser client
│       └── server.ts          # Server client
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   ├── signup/
│   │   │   └── page.tsx       # Signup page
│   │   └── callback/
│   │       └── route.ts       # Auth callback handler
│   └── dashboard/
│       └── page.tsx           # Protected dashboard page
├── components/
│   └── LogoutButton.tsx       # Logout component
└── middleware.ts              # Route protection middleware
```

## API Reference

### Browser Client (`lib/supabase/client.ts`)
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
await supabase.auth.signInWithPassword({ email, password });
```

### Server Client (`lib/supabase/server.ts`)
```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

## Support

For issues or questions:
1. Check the [Supabase Documentation](https://supabase.com/docs/guides/auth)
2. Review the [Next.js App Router Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
3. Check Linear issue REC-126 for implementation details
