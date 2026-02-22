---
allowed-tools: Read, Glob
description: Prime agent with codebase context
---

Read these files to understand the LA Rent Finder codebase before starting work:

## CRITICAL: Deployment Model

**There is no local development environment.** All development pushes directly to production.

- **Production URL**: `rent.digitalcrossroadsmusic.com`
- **Server**: Hostinger VPS (Ubuntu 24.04) at `/var/www/la-rent-finder/`
- **SSH Access**: `ssh root@rent.digitalcrossroadsmusic.com` (authenticates via `~/.ssh/id_ed25519`)
- **Process Manager**: PM2 in cluster mode on port 3001, behind Nginx reverse proxy
- **Deploy Flow**: `git push` triggers GitHub Actions → build → rsync to VPS → PM2 reload (zero-downtime)
- **Rollback**: `scripts/rollback.sh` on the server to revert to the previous release
- **Server Directory Structure**:
  ```
  /var/www/la-rent-finder/
  ├── .env.local          # Runtime secrets (persists across deploys)
  ├── current/            # Symlink → latest release
  ├── releases/           # Timestamped releases (keeps 5)
  ├── logs/               # PM2 output and error logs
  └── staging/            # Temporary upload dir (cleaned after deploy)
  ```

When testing changes, build locally with `npm run build` to catch errors before pushing. After pushing, monitor the GitHub Actions workflow and verify at `rent.digitalcrossroadsmusic.com`.

## Core Context

1. `README.md` - Project overview, tech stack, features, and getting started
2. `app_spec.md` - Detailed app specification with multi-agent architecture and workflows
3. `package.json` - Node.js dependencies and scripts
4. `supabase/SCHEMA_SUMMARY.md` - Database schema documentation (10 tables)

## Architecture (read as needed based on task)

### Multi-Agent System
5. `lib/agents/orchestrator.ts` - Main orchestrator agent (claude-sonnet-4-5), delegates to sub-agents
6. `lib/agents/framework.ts` - Agent framework, base classes, communication patterns
7. `lib/agents/types.ts` - Agent type definitions and interfaces
8. `lib/agents/market-researcher.ts` - Market research agent for listing searches
9. `lib/agents/scheduler.ts` - Appointment scheduling agent
10. `lib/agents/cost-estimator.ts` - Cost estimation agent

### API Routes
11. `app/api/chat/route.ts` - Chat/orchestrator endpoint with SSE streaming
12. `app/api/listings/route.ts` - Listing CRUD and search
13. `app/api/sync/route.ts` - Listing sync from external APIs (RapidAPI, RentCast)
14. `app/api/cron/sync-listings/route.ts` - Automated listing sync cron endpoint
15. `app/api/communications/` - Email (Resend), SMS (Twilio), call endpoints

### Data Pipeline & Crawl Engine
16. `lib/crawl/engine.ts` - Firecrawl-based web scraping with rate limiting
17. `lib/crawl/adapters/base.ts` - Base adapter interface
18. `lib/crawl/adapters/realty-in-us.ts` - RapidAPI Realty in US adapter
19. `lib/crawl/adapters/rentcast.ts` - RentCast API adapter (neighborhood→coordinates mapping)
20. `lib/crawl/adapters/apartments-com.ts` - Apartments.com scraping adapter
21. `lib/crawl/adapters/zillow.ts` - Zillow data adapter
22. `lib/crawl/adapters/rent-com.ts` - Rent.com integration adapter

### Database & Auth
23. `lib/database.types.ts` - Auto-generated Supabase TypeScript types
24. `lib/supabase/client.ts` - Browser Supabase client
25. `lib/supabase/server.ts` - Server-side Supabase client
26. `middleware.ts` - Next.js auth middleware protecting routes

### Type Definitions
27. `lib/types/listing.ts` - Listing interface (id, title, address, lat/lng, price, bedrooms, bathrooms, sqft, score, photos, property_type, etc.)
28. `lib/types/chat.ts` - ChatMessage, status types (thinking, searching, scheduling, estimating, analyzing, done)

## UI Patterns

29. `app/dashboard/page.tsx` - Main dashboard view (protected)
30. `components/DashboardLayout.tsx` - Three-panel flexbox layout wrapper
31. `components/ChatPanel.tsx` - Chat interface with agent status
32. `components/MapListingsPanel.tsx` - Mapbox map with property markers
33. `components/DetailPanel.tsx` - Property detail view panel
34. `components/listings/ListingCard.tsx` - Listing card component
35. `components/listings/PhotoCarousel.tsx` - Photo gallery component
36. `components/listings/ScoreBadge.tsx` - Color-coded match score (0-100)
37. `components/listings/ScoreRadar.tsx` - Score breakdown radar chart
38. `components/map/MapboxMap.tsx` - Interactive Mapbox GL map component

## External Services

39. `lib/services/google-calendar.ts` - Google Calendar integration
40. `lib/services/resend.ts` - Email service (Resend)
41. `lib/services/twilio.ts` - SMS/call service (Twilio)

## Deployment & CI/CD

42. `.github/workflows/deploy.yml` - CI/CD pipeline: ESLint + type-check → build → rsync → deploy → health check
43. `scripts/deploy.sh` - VPS deploy script (timestamped releases, symlink swap, PM2 reload)
44. `scripts/rollback.sh` - Emergency rollback to previous release
45. `ecosystem.config.cjs` - PM2 config (cluster mode, port 3001, max instances, 512M memory limit)

## Configuration

46. `next.config.mjs` - Next.js config (standalone output for VPS deployment)
47. `.env.example` - All required environment variables (Supabase, Mapbox, Anthropic, RapidAPI, RentCast, Twilio, Resend, Google)
48. `.mcp.json` - MCP server config (Supabase, sequential-thinking, RapidAPI Hub - Realty in US, RentCast API, PostHog, Obsidian)
49. `.claude/settings.local.json` - Claude Code settings (agent teams enabled, MCP servers, SSH/rsync permissions)

## Database Migrations

50. `supabase/migrations/20260211000001_initial_schema.sql` - Core tables (users, apartments, favorites, appointments, messages, chats) + PostGIS
51. `supabase/migrations/20260211000002_add_missing_tables.sql` - Preferences, searches, scores, cost estimates + pg_trgm
52. `supabase/migrations/20260212000001_add_communications_and_chat_messages.sql` - Communications and chat messages

## Key Conventions

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript 5.9
- **Node.js**: v22 (pinned via `.nvmrc`)
- **Styling**: Tailwind CSS 3 + Shadcn/ui components (`components/ui/`)
- **Database**: Supabase PostgreSQL with PostGIS + pg_trgm, RLS on all tables
- **Auth**: Supabase Auth with middleware-protected routes (`/dashboard`, `/appointments`, etc.)
- **AI Agents**: Multi-agent orchestration via Anthropic SDK (`@anthropic-ai/sdk 0.74.0`), SSE streaming responses
- **Agent Models**: Orchestrator/MarketResearcher/Scheduler use `claude-sonnet-4-5`, CostEstimator uses `claude-haiku-4-5`
- **Maps**: Mapbox GL JS 3.18 for interactive property visualization with photo thumbnail markers
- **State**: React hooks + Supabase client (no external state library)
- **Icons**: Lucide React icons
- **Theme**: Dark mode support via ThemeProvider (class-based)
- **MCP Servers**: Supabase, sequential-thinking, RapidAPI Realty in US, RentCast API, PostHog, Obsidian
- **Public demos**: `/chat-demo` and `/map-demo` bypass auth
- **Listing sources**: RapidAPI Realty in US, RentCast, Zillow, Apartments.com, Rent.com (via crawl adapters)
- **Deployment**: Direct to production — no staging environment. Always verify builds locally before pushing.

Confirm you understand the project structure before proceeding with any task.
