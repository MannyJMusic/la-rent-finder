---
allowed-tools: Read, Glob
description: Prime agent with codebase context
---

Read these files to understand the LA Rent Finder codebase before starting work:

## Core Context

1. `README.md` - Project overview, tech stack, features, and getting started
2. `app_spec.md` - Detailed app specification with multi-agent architecture and workflows
3. `package.json` - Node.js dependencies and scripts
4. `supabase/SCHEMA_SUMMARY.md` - Database schema documentation (12 tables)

## Architecture (read as needed based on task)

### Multi-Agent System
5. `lib/agents/orchestrator.ts` - Main orchestrator agent (claude-opus-4-6), delegates to sub-agents
6. `lib/agents/framework.ts` - Agent framework, base classes, communication patterns
7. `lib/agents/types.ts` - Agent type definitions and interfaces
8. `lib/agents/market-researcher.ts` - Market research agent for listing searches
9. `lib/agents/scheduler.ts` - Appointment scheduling agent
10. `lib/agents/cost-estimator.ts` - Cost estimation agent

### API Routes
11. `app/api/chat/route.ts` - Chat/orchestrator endpoint with SSE streaming
12. `app/api/listings/route.ts` - Listing CRUD and search
13. `app/api/communications/` - Email (Resend), SMS (Twilio), call endpoints

### Database & Auth
14. `lib/database.types.ts` - Auto-generated Supabase TypeScript types
15. `lib/supabase/client.ts` - Browser Supabase client
16. `lib/supabase/server.ts` - Server-side Supabase client
17. `middleware.ts` - Next.js auth middleware protecting routes

## UI Patterns

18. `app/dashboard/page.tsx` - Main dashboard view (protected)
19. `components/DashboardLayout.tsx` - Resizable panel layout wrapper
20. `components/ChatPanel.tsx` - Chat interface with agent status
21. `components/MapListingsPanel.tsx` - Mapbox map with property markers
22. `components/DetailPanel.tsx` - Property detail view panel
23. `components/listings/ListingCard.tsx` - Listing card component

## External Services

24. `lib/services/google-calendar.ts` - Google Calendar integration
25. `lib/services/resend.ts` - Email service (Resend)
26. `lib/services/twilio.ts` - SMS/call service (Twilio)

## Database Migrations

27. `supabase/migrations/20260211000001_initial_schema.sql` - Core tables (users, apartments, favorites, appointments, messages, chats) + PostGIS
28. `supabase/migrations/20260211000002_add_missing_tables.sql` - Preferences, searches, scores, cost estimates + pg_trgm
29. `supabase/migrations/20260212000001_add_communications_and_chat_messages.sql` - Communications and chat messages

## Key Conventions

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components (`components/ui/`)
- **Database**: Supabase PostgreSQL with PostGIS, RLS on all tables
- **Auth**: Supabase Auth with middleware-protected routes (`/dashboard`, `/appointments`, etc.)
- **AI Agents**: Multi-agent orchestration via Anthropic SDK, SSE streaming responses
- **Maps**: Mapbox GL JS for interactive property visualization
- **State**: React hooks + Supabase client (no external state library)
- **Icons**: Lucide React icons
- **Theme**: Dark mode support via ThemeProvider
- **MCP**: Supabase MCP + sequential-thinking server (see `.mcp.json`)
- **Public demos**: `/chat-demo` and `/map-demo` bypass auth

Confirm you understand the project structure before proceeding with any task.
