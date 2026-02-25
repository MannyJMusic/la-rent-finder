# LA Rental Finder - Multi-Agent Rental Search Platform

## Overview

LA Rental Finder is a multi-agent AI platform that helps users find rental properties across Los Angeles and surrounding areas. Users interact with a browser-based chat UI to describe their ideal rental, and a team of specialized AI agents collaborates to search listings, score properties, schedule viewings, estimate costs, and manage the entire project lifecycle. An Orchestrator agent delegates work to seven sub-agents, each with distinct responsibilities and tool access.

---

## Target Audience

**Primary User:** Individuals searching for a rental property in the greater Los Angeles area who want an AI-powered assistant to aggregate listings, score matches, handle outreach, and manage appointments.

**Key Pain Points:**
- Listings are scattered across MLS, Craigslist, Facebook Marketplace, Reddit, and individual realtor sites
- Manually cross-referencing and deduplicating listings is tedious
- Hard to evaluate total move-in and monthly costs across different properties
- Scheduling tours and contacting landlords/agents is time-consuming
- No single tool aggregates, scores, and acts on rental searches end-to-end

---

## Agent Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              User (Browser UI)                               │
│                    Chat interface to describe preferences                     │
│                    View listings, scores, appointments                        │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR AGENT                                   │
│                                                                              │
│  Coordinates all sub-agents, routes user intent, manages conversation,       │
│  synthesizes results, and drives the workflow forward.                        │
│                                                                              │
│  Tools: Task delegation, context passing, workflow state                      │
└───┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────────────────────┘
    │      │      │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐┌───────┐
│Market ││Software││Project││Docs   ││Software││DB     ││Appt   │
│Research││Arch.  ││Mgr    ││Agent  ││Dev    ││Mgr    ││Sched. │
└───────┘└───────┘└───────┘└───────┘└───────┘└───────┘└───────┘
                                                        ┌───────┐
                                                        │Cost   │
                                                        │Est.   │
                                                        └───────┘
```

---

## Crawl Pipeline Architecture (Implemented)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cron / Manual Trigger                        │
│              GET /api/cron/sync-listings (daily)                    │
│              POST /api/sync (manual, authenticated)                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────┐  ┌──────────────────────┐
│  Realty in US Adapter │  │   RentCast Adapter   │
│  v3/list (ZIP-based) │  │  (city-wide search)  │
│  50/zip × 2 zips     │  │  limit: 100          │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           └────────────┬────────────┘
                        ▼
              ┌──────────────────┐
              │   Normalize      │
              │  (address, type, │
              │   amenities,     │
              │   neighborhood)  │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │   Deduplicate    │
              │  (exact address  │
              │   or fuzzy match)│
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Persist / Merge │
              │  (new → insert,  │
              │   dup → merge)   │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Lifecycle       │
              │  (14d → stale,   │
              │   90d → purge)   │
              └──────────────────┘

On-Demand Enrichment (when user views a property):

┌──────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│ GET /api/listings │────▶│ description === null? │─yes─▶│ v3/detail    │
│     /[id]        │     │ source = realty_in_us?│     │ API call     │
└──────────────────┘     └──────────┬───────────┘     └──────┬───────┘
                                    │ no                      │
                                    ▼                         ▼
                           Return cached data        Store to DB, then
                           from properties table     return enriched data
```

### Pipeline Code Structure

```
lib/crawl/
├── adapters/
│   ├── index.ts            # Adapter registry (exports apiAdapters[])
│   ├── realty-in-us.ts     # Realty in US: fetchListings() + fetchPropertyDetail()
│   └── rentcast.ts         # RentCast: fetchListings()
├── api-client.ts           # Shared HTTP client with retry + rate-limit handling
├── dedup.ts                # findDuplicates(), mergeWithExisting(), persistNewListing()
├── lifecycle.ts            # markStaleListings() (14d), purgeExpiredListings() (90d)
├── normalize.ts            # normalizeRawListing(), normalizeAmenities(), etc.
└── types.ts                # RawListing, NormalizedListing, ApiSourceAdapter interfaces
```

---

## Agent Definitions

### 1. Orchestrator Agent

**Role:** Central coordinator. Receives user messages from the chat UI, determines intent, delegates to appropriate sub-agents, passes context between agents, synthesizes responses, and returns results to the user.

**Model:** claude-opus-4-6

**Responsibilities:**
- Parse user intent (search, refine, schedule, estimate, ask status)
- Delegate tasks to the correct sub-agent with full context
- Aggregate multi-agent results into coherent user-facing responses
- Maintain conversation history and user preference profile
- Enforce verification gates before presenting results
- Manage workflow state (search → review → schedule → move-in)

**Tools:**
- Task delegation to all sub-agents
- Read/Write for shared state files
- Chat interface message handling

---

### 2. Market Researcher Agent

**Role:** Deep-searches across multiple online listing platforms to find rental properties matching user criteria. Scores and ranks properties. Only indexes listings that include photos.

**Model:** claude-sonnet-4-5-20250929

**Responsibilities:**
- Search publicly available MLS data aggregators (Zillow, Realtor.com, Redfin)
- Search Craigslist housing/apartments sections for LA area
- Search Facebook Marketplace rental listings
- Search Reddit communities (r/LArentals, r/LosAngeles, r/LAList)
- Search individual realtor and property management company websites
- Aggregate and deduplicate listings across sources
- Extract: address, price, bedrooms, bathrooms, sqft, amenities, photos, listing URL, contact info
- Filter: ONLY index properties that have photos
- Score properties (1-100) based on user preferences (location, price, size, amenities, commute, vibe)
- Generate recommendation summaries with pros/cons for top matches
- Track listing freshness and flag stale or expired listings

**Tools & MCP Servers:**
- `mcp__web_search` or equivalent web search MCP — for searching listing sites
- `mcp__web_fetch` / `WebFetch` — for scraping listing details and photos from URLs
- `mcp__supabase__execute_sql` — for writing indexed listings to the database
- `mcp__supabase__search_docs` — for querying stored listings
- Firecrawl MCP server (recommended) — for structured web scraping at scale
  - `mcp__firecrawl__scrape` — scrape individual listing pages
  - `mcp__firecrawl__crawl` — crawl listing sites for bulk discovery
  - `mcp__firecrawl__search` — search the web for rental listings
- Browserbase MCP server (recommended) — for headless browser automation on JS-heavy sites
  - `mcp__browserbase__browse` — navigate dynamic listing sites (Facebook Marketplace, etc.)

**Implemented Data Sources (via RapidAPI):**
- **Realty in US** (`realty-in-us` v3/list) — Primary source. Returns address, price, beds/baths, sqft, property type, thumbnail photos, coordinates. ZIP-code-based search across LA neighborhoods.
- **Realty in US** (`realty-in-us` v3/detail) — On-demand enrichment. Returns full description, 30+ high-res photos, structured amenities, pet policy, landlord name. Called once per property on first user view, then cached in DB.
- **RentCast** (`rentcast`) — Secondary source. Returns address, price, beds/baths, sqft, property type. No photos or descriptions.

**Planned Data Sources (not yet implemented):**
- Zillow API / Zillow scraping
- Craigslist (housing > apts/housing, rooms/shared)
- Facebook Marketplace (rentals category, LA area)
- Reddit (r/LArentals, r/LosAngeles, r/LAList)
- Apartments.com

**Scoring Criteria:**
- Price match (within budget ± 10%)
- Location match (proximity to preferred neighborhoods/workplace)
- Size match (bedrooms, bathrooms, sqft)
- Amenity match (parking, laundry, pet-friendly, AC, etc.)
- Listing quality (number of photos, description detail)
- Source reliability (MLS > Realtor site > Craigslist > Reddit)
- Freshness (days since posted)

---

### 3. Software Architect Agent

**Role:** Designs the infrastructure, system architecture, and technical solutions needed to build the LA Rental Finder platform.

**Model:** claude-sonnet-4-5-20250929

**Responsibilities:**
- Design system architecture diagrams (frontend, backend, databases, agent layer)
- Specify technology stack with justifications
- Provide technical specifications for each component
- Create scope of work documents with effort estimates
- Produce cost estimates for infrastructure (hosting, APIs, databases, third-party services)
- Define design patterns (agent communication, data flow, error handling)
- Document API contracts between services
- Specify security and rate-limiting strategies
- Define scalability approach for web scraping and data storage

**Tools:**
- Read/Write for architecture docs and specs
- WebSearch for evaluating technology options and pricing
- WebFetch for API documentation review

**Outputs:**
- Architecture Decision Records (ADRs)
- Technical specification documents
- Infrastructure cost breakdown
- API contracts and schemas
- Sequence diagrams for key workflows
- Scope of work with task-level estimates

---

### 4. Project Manager Agent

**Role:** Creates and maintains the project roadmap, manages the repository, tracks progress, and breaks work into efficient tasks in Linear.

**Model:** claude-haiku-4-5-20251001

**Responsibilities:**
- Create and maintain Linear project with milestones
- Break epics into manageable issues with acceptance criteria
- Prioritize and sequence work based on dependencies
- Track progress across all agents and update issue statuses
- Maintain META issue for session handoffs
- Manage the git repository structure and branching strategy
- Generate status reports and progress summaries

**MCP Tools (Linear via Arcade):**
- `mcp__arcade__Linear_CreateProject` — create the rental finder project
- `mcp__arcade__Linear_CreateIssue` — create tasks and stories
- `mcp__arcade__Linear_UpdateIssue` — update issue details
- `mcp__arcade__Linear_TransitionIssueState` — move issues through workflow (Todo → In Progress → Done)
- `mcp__arcade__Linear_AddComment` — add progress notes and session summaries
- `mcp__arcade__Linear_ListIssues` — query issues by status/project
- `mcp__arcade__Linear_GetIssue` — get full issue details
- `mcp__arcade__Linear_ListProjects` — list existing projects
- `mcp__arcade__Linear_WhoAmI` — get team context
- `mcp__arcade__Linear_ListTeams` — get team info
- `mcp__arcade__Linear_ListWorkflowStates` — get available states

**MCP Tools (GitHub via Arcade):**
- `mcp__arcade__Github_CreateRepository` — initialize repo if needed
- `mcp__arcade__Github_CreatePullRequest` — create PRs for completed features
- `mcp__arcade__Github_ListPullRequests` — review open PRs

**File Tools:**
- Read/Write for `.linear_project.json` and project state files

---

### 5. Documentation Agent

**Role:** Maintains the project changelog, release notes, and all related documentation. Keeps a living record of decisions, changes, and progress.

**Model:** claude-haiku-4-5-20251001

**Responsibilities:**
- Maintain CHANGELOG.md with all notable changes (Added, Changed, Fixed, Removed)
- Generate release notes for each milestone
- Document architecture decisions and their rationale
- Keep README.md up to date with setup instructions and usage
- Maintain API documentation
- Document agent configurations and MCP server setup
- Track and document known issues and workarounds
- Maintain a decision log for key technical and product choices

**Tools:**
- Read/Write/Edit for documentation files
- Git commands via Bash for checking file history

**Output Files:**
- `CHANGELOG.md` — semantic versioning changelog
- `README.md` — project overview, setup, usage
- `docs/architecture.md` — system architecture documentation
- `docs/api.md` — API endpoint documentation
- `docs/agents.md` — agent configuration and responsibilities
- `docs/decisions.md` — architecture decision records
- `docs/releases/` — release notes per version

---

### 6. Software Developer Agent

**Role:** Builds and scaffolds the software and infrastructure. Implements features, writes tests, and provides screenshot evidence of working functionality.

**Model:** claude-sonnet-4-5-20250929

**Responsibilities:**
- Scaffold project structure (frontend, backend, agent services)
- Implement UI components and pages
- Build API endpoints and backend services
- Implement agent communication layer
- Write and run tests (unit, integration, e2e with Playwright)
- Provide screenshot evidence of completed features
- Fix bugs and regressions
- Manage dependencies and build configuration

**Tools:**
- Read/Write/Edit for all source code
- Bash for running dev servers, tests, build commands, npm/pnpm
- Playwright MCP or Bash for browser testing and screenshots
- Git commands via Bash

---

### 7. Database Manager Agent

**Role:** Designs and manages the databases needed to store listings, user searches, preferences, appointments, and application state.

**Model:** claude-sonnet-4-5-20250929

**Responsibilities:**
- Design database schema for listings, users, searches, preferences, appointments
- Create and manage Supabase tables and migrations
- Write and optimize SQL queries for listing search and filtering
- Implement full-text search and geo-spatial queries for location-based filtering
- Manage data indexing for fast property lookups
- Handle data deduplication across listing sources
- Set up Row Level Security (RLS) policies
- Monitor and optimize query performance
- Manage data retention and cleanup for stale listings

**MCP Tools (Supabase):**
- `mcp__supabase__list_tables` — inspect existing schema
- `mcp__supabase__apply_migration` — create/alter tables
- `mcp__supabase__execute_sql` — run queries, seed data, test queries
- `mcp__supabase__list_migrations` — review migration history
- `mcp__supabase__list_extensions` — check available Postgres extensions (PostGIS, pg_trgm, etc.)
- `mcp__supabase__get_advisors` — get performance recommendations
- `mcp__supabase__get_project_url` — get connection details
- `mcp__supabase__generate_typescript_types` — generate TypeScript types from schema

**Database Schema (Supabase / PostgreSQL):**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  max_budget NUMERIC,
  min_bedrooms INTEGER,
  max_bedrooms INTEGER,
  min_bathrooms NUMERIC,
  preferred_neighborhoods TEXT[],
  must_have_amenities TEXT[],
  nice_to_have_amenities TEXT[],
  pet_type TEXT,
  move_in_date DATE,
  lease_length_months INTEGER,
  commute_address TEXT,
  max_commute_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Listings
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  source TEXT NOT NULL, -- 'zillow', 'craigslist', 'facebook', 'reddit', 'realtor', etc.
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT DEFAULT 'Los Angeles',
  state TEXT DEFAULT 'CA',
  zip_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  price NUMERIC NOT NULL,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  sqft INTEGER,
  property_type TEXT, -- 'apartment', 'house', 'condo', 'townhouse', 'room'
  amenities TEXT[],
  photos TEXT[] NOT NULL CHECK (array_length(photos, 1) > 0),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  listing_date DATE,
  available_date DATE,
  lease_length TEXT,
  pet_policy TEXT,
  parking TEXT,
  laundry TEXT,
  is_active BOOLEAN DEFAULT true,
  last_verified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

-- Enable PostGIS for geo queries
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE listings ADD COLUMN location GEOGRAPHY(POINT, 4326);

-- Search sessions
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  filters JSONB,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Listing scores per user search
CREATE TABLE listing_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  price_score INTEGER,
  location_score INTEGER,
  size_score INTEGER,
  amenity_score INTEGER,
  quality_score INTEGER,
  recommendation TEXT,
  pros TEXT[],
  cons TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User favorites / saved listings
CREATE TABLE saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  contact_method TEXT, -- 'email', 'sms', 'phone'
  contact_details TEXT,
  notes TEXT,
  confirmation_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Communication log (emails, SMS, calls)
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'email', 'sms', 'phone_call'
  direction TEXT NOT NULL, -- 'outbound', 'inbound'
  recipient TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'replied'
  sent_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Cost estimates
CREATE TABLE cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  estimate_type TEXT NOT NULL, -- 'move_in', 'monthly', 'annual', 'moving'
  line_items JSONB NOT NULL,
  total NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 8. Appointment Scheduler Agent

**Role:** Reviews the user's schedule, suggests appointment times for property viewings, sends inquiry emails, SMS messages, and makes automated AI phone calls to confirm appointments and gather details.

**Model:** claude-sonnet-4-5-20250929

**Responsibilities:**
- Review user's connected calendar for availability
- Suggest optimal viewing time slots based on location clustering (nearby properties in same time block)
- Draft and send inquiry emails to landlords/agents on user's behalf
- Send SMS messages to property contacts
- Initiate automated AI phone calls for appointment confirmation and detail gathering
- Track appointment status (pending, confirmed, cancelled, completed)
- Send reminders to user before scheduled viewings
- Log all communications for audit trail

**MCP Tools & Integrations:**
- Google Calendar MCP server (recommended)
  - `mcp__google_calendar__list_events` — check user availability
  - `mcp__google_calendar__create_event` — book viewing appointments
  - `mcp__google_calendar__update_event` — reschedule appointments
- Email MCP server (Gmail or SendGrid)
  - `mcp__gmail__send_email` — send inquiry emails to contacts
  - `mcp__gmail__list_messages` — check for replies
  - Or SendGrid API via Bash/fetch for transactional email
- Twilio MCP server or API (for SMS and voice)
  - `mcp__twilio__send_sms` — send text messages to property contacts
  - `mcp__twilio__make_call` — initiate automated phone calls
  - Twilio Programmable Voice with AI TTS for automated call scripts
- Bland.ai or Vapi API (recommended for AI phone calls)
  - REST API integration for natural-sounding AI phone calls
  - Call recording and transcript storage
- `mcp__supabase__execute_sql` — log appointments and communications

**Email Templates:**
- Initial inquiry: introduce user, express interest, request viewing
- Follow-up: check availability, confirm details
- Confirmation: confirm scheduled viewing time
- Thank you: post-viewing follow-up

**SMS Templates:**
- Quick inquiry: "Hi, I'm interested in [address]. Is it available for viewing?"
- Confirmation: "Confirming our appointment for [date/time] at [address]."
- Reminder: "Reminder: viewing at [address] tomorrow at [time]."

**AI Phone Call Script:**
- Introduce as user's assistant
- Confirm listing is still available
- Ask about move-in date, pet policy, parking
- Request viewing appointment
- Provide user's contact info for follow-up

---

### 9. Cost Estimator Agent

**Role:** Estimates total costs associated with renting and moving into a property, including move-in costs, monthly recurring costs, and one-time moving expenses.

**Model:** claude-haiku-4-5-20251001

**Responsibilities:**
- Calculate move-in costs (first/last month, security deposit, application fees, broker fees)
- Estimate monthly costs (rent, utilities, parking, renter's insurance, internet)
- Estimate moving costs (movers, truck rental, packing supplies, cleaning)
- Factor in LA-specific costs (earthquake insurance rider, parking permits)
- Compare costs across multiple properties side-by-side
- Provide total first-year cost projection
- Flag hidden costs or unusually high estimates
- Use current LA market data for utility and service estimates

**Tools:**
- WebSearch for current LA utility rates, moving company prices
- `mcp__supabase__execute_sql` — read listing details, write estimates
- Read/Write for estimate reports

**Cost Categories:**

**Move-In Costs:**
- First month's rent
- Last month's rent (if required)
- Security deposit (typically 1-2x rent in LA)
- Application fee ($30-75 per application)
- Broker fee (if applicable, typically 1 month rent)
- Key/lock change fee
- Move-in cleaning fee

**Monthly Recurring:**
- Rent
- Electricity (LADWP avg: $100-200/month)
- Gas (SoCalGas avg: $30-60/month)
- Water/sewer/trash (often included, or $50-80/month)
- Internet ($50-80/month)
- Renter's insurance ($15-30/month)
- Parking (if not included, $100-300/month in LA)
- Pet rent (if applicable, $25-75/month)

**One-Time Moving:**
- Professional movers (LA avg: $800-2500 for local move)
- Truck rental (if DIY: $100-300)
- Packing supplies ($50-200)
- Utility deposits/setup fees
- Address change / mail forwarding

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (React 19, App Router)
- **Styling:** Tailwind CSS 3 + shadcn/ui
- **Maps:** Mapbox GL JS with clustering and score-colored pins
- **Chat UI:** Custom chat interface powered by Anthropic Claude
- **Port:** 3000

### Backend
- **Runtime:** Node.js 22 (Next.js API routes)
- **AI:** Anthropic Claude (via `@anthropic-ai/sdk`)
- **Database:** Supabase (PostgreSQL + PostGIS + pg_trgm)
- **Authentication:** Supabase Auth (email/password)
- **Crawl Pipeline:** Automated multi-source listing sync with normalization, deduplication, on-demand enrichment, and lifecycle management
- **Deployment:** GitHub Actions → Hostinger VPS (PM2 cluster, Nginx proxy)

### Agent Layer
- **Orchestration:** Claude Agent SDK with multi-agent delegation
- **Models:**
  - Orchestrator: claude-opus-4-6
  - Market Researcher: claude-sonnet-4-5-20250929
  - Software Architect: claude-sonnet-4-5-20250929
  - Project Manager: claude-haiku-4-5-20251001
  - Documentation: claude-haiku-4-5-20251001
  - Software Developer: claude-sonnet-4-5-20250929
  - Database Manager: claude-sonnet-4-5-20250929
  - Appointment Scheduler: claude-sonnet-4-5-20250929
  - Cost Estimator: claude-haiku-4-5-20251001

### External Services
- **Supabase:** Database, auth, storage, edge functions
- **Twilio:** SMS and voice calls for appointment scheduling
- **Bland.ai or Vapi:** AI-powered phone calls
- **SendGrid or Gmail API:** Transactional email
- **Google Calendar API:** Calendar integration
- **Mapbox or Google Maps:** Geocoding and map display
- **Firecrawl:** Web scraping for listing aggregation
- **Browserbase:** Headless browser for JS-heavy sites

---

## MCP Server Configuration

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "@arcade-ai/mcp-server-linear"],
      "env": {
        "ARCADE_API_KEY": "${ARCADE_API_KEY}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@arcade-ai/mcp-server-github"],
      "env": {
        "ARCADE_API_KEY": "${ARCADE_API_KEY}"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@arcade-ai/mcp-server-slack"],
      "env": {
        "ARCADE_API_KEY": "${ARCADE_API_KEY}"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-firecrawl"],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    },
    "browserbase": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-browserbase"],
      "env": {
        "BROWSERBASE_API_KEY": "${BROWSERBASE_API_KEY}",
        "BROWSERBASE_PROJECT_ID": "${BROWSERBASE_PROJECT_ID}"
      }
    },
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-google-calendar"],
      "env": {
        "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
        "GOOGLE_REFRESH_TOKEN": "${GOOGLE_REFRESH_TOKEN}"
      }
    },
    "twilio": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-twilio"],
      "env": {
        "TWILIO_ACCOUNT_SID": "${TWILIO_ACCOUNT_SID}",
        "TWILIO_AUTH_TOKEN": "${TWILIO_AUTH_TOKEN}",
        "TWILIO_PHONE_NUMBER": "${TWILIO_PHONE_NUMBER}"
      }
    }
  }
}
```

---

## Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Arcade (Linear, GitHub, Slack)
ARCADE_API_KEY=your_arcade_api_key

# Firecrawl (web scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key

# Browserbase (headless browser)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token

# Twilio (SMS + Voice)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Bland.ai or Vapi (AI phone calls)
BLAND_API_KEY=your_bland_api_key

# Maps
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# GitHub
GITHUB_REPO=owner/la-rental-finder
```

---

## UI Layout

### Main Layout (Three-Panel)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Header: LA Rental Finder   |  Search Status  |  User Profile  |  Settings  │
├───────────────────┬──────────────────────────────┬───────────────────────────┤
│                   │                              │                           │
│   CHAT PANEL      │      MAP / LISTINGS VIEW     │    DETAIL PANEL           │
│                   │                              │                           │
│   Agent chat      │   Interactive map with pins  │   Selected listing        │
│   User messages   │   or                         │   - Photos carousel       │
│   Agent responses │   Grid of listing cards      │   - Details               │
│   Status updates  │   Toggle: Map | Grid | List  │   - Score breakdown       │
│   Quick actions   │                              │   - Cost estimate         │
│                   │   Filters bar:               │   - Schedule viewing btn  │
│                   │   Price | Beds | Area | More │   - Save / Dismiss        │
│                   │                              │                           │
│   [Type message]  │                              │   Appointments tab        │
│   [Send]          │                              │   Cost comparison tab     │
│                   │                              │                           │
└───────────────────┴──────────────────────────────┴───────────────────────────┘
```

### Key Screens

**1. Chat Interface (Left Panel)**
- Threaded conversation with orchestrator agent
- Agent thinking/status indicators
- Quick-action buttons (New Search, View Saved, Appointments, Cost Report)
- File/image sharing for lease documents

**2. Map View (Center Panel)**
- Interactive map centered on LA
- Color-coded pins by score (green = high match, yellow = medium, red = low)
- Cluster markers for dense areas
- Click pin to select listing and show in detail panel
- Draw-to-search for custom areas
- Neighborhood boundary overlays

**3. Listings Grid (Center Panel, alternate view)**
- Card grid with thumbnail, price, beds/baths, score badge
- Sort by: Score, Price, Date Listed, Distance
- Filter chips: Neighborhoods, Price Range, Bedrooms, Pet-Friendly, Parking
- Infinite scroll with lazy loading

**4. Listing Detail (Right Panel) — `components/DetailPanel.tsx`**
- Photo carousel with prev/next arrows, photo counter (up to 30 photos from on-demand enrichment)
- Property details (address, price, beds, baths, sqft, neighborhood)
- Score badge (color-coded 0-100)
- Enriched description (fetched on-demand from v3/detail, with loading spinner)
- Amenities displayed as pill badges (normalized via `normalizeAmenities()`)
- Pet policy string (structured: "Cats allowed, Dogs allowed (large)")
- Cost estimate breakdown (move-in, monthly, moving)
- Action buttons: Save/Unsave, Schedule Viewing, Get Cost Estimate, Contact via Email
- On-demand enrichment via `useEffect` → `GET /api/listings/[id]` on listing selection

**5. Appointments Dashboard**
- Calendar view of scheduled viewings
- Upcoming appointments list with status badges
- Communication log (emails sent, SMS sent, calls made)
- One-click reschedule or cancel

**6. Cost Comparison View**
- Side-by-side comparison of 2-4 properties
- Breakdown: move-in, monthly, first-year total
- Highlight best value
- Exportable as PDF

---

## Design System

- **Theme:** Dark mode primary with light mode toggle
- **Primary Color:** #3B82F6 (blue) for interactive elements
- **Accent:** #10B981 (green) for high scores, #F59E0B (amber) for medium, #EF4444 (red) for low
- **Typography:** Inter for UI, JetBrains Mono for data/code
- **Components:** Shadcn/ui base with custom listing cards
- **Maps:** Dark map style (Mapbox Dark or similar)
- **Animations:** Framer Motion for panel transitions, loading states
- **Responsive:** Mobile-first, collapsible panels on smaller screens

---

## API Endpoints

### Search & Listings
- `POST /api/search` — submit a new search query
- `GET /api/listings` — get listings with filters (price, beds, area, etc.)
- `GET /api/listings/:id` — get full listing details
- `POST /api/listings/:id/score` — trigger scoring for a listing against user preferences
- `POST /api/listings/:id/save` — save a listing
- `DELETE /api/listings/:id/save` — unsave a listing
- `GET /api/listings/saved` — get saved listings

### User & Preferences
- `GET /api/user/profile` — get user profile
- `PUT /api/user/profile` — update profile
- `GET /api/user/preferences` — get search preferences
- `PUT /api/user/preferences` — update preferences

### Appointments
- `GET /api/appointments` — list appointments
- `POST /api/appointments` — schedule a new viewing
- `PUT /api/appointments/:id` — update appointment
- `DELETE /api/appointments/:id` — cancel appointment
- `POST /api/appointments/:id/confirm` — confirm appointment

### Communications
- `POST /api/communications/email` — send inquiry email
- `POST /api/communications/sms` — send SMS
- `POST /api/communications/call` — initiate AI phone call
- `GET /api/communications` — get communication history

### Cost Estimates
- `POST /api/estimates` — generate cost estimate for a listing
- `GET /api/estimates/:id` — get estimate details
- `GET /api/estimates/compare` — compare estimates across listings

### Chat / Agent
- `POST /api/chat` — send message to orchestrator agent
- `GET /api/chat/stream` — SSE endpoint for real-time agent responses
- `GET /api/chat/history` — get conversation history
- `GET /api/agents/status` — get status of all running agent tasks

---

## File Structure

```
la-rental-finder/
├── app/                          # Next.js App Router
│   ├── (dashboard)/
│   │   ├── page.tsx              # Main dashboard with chat + map + listings
│   │   ├── appointments/
│   │   │   └── page.tsx          # Appointments calendar view
│   │   ├── compare/
│   │   │   └── page.tsx          # Side-by-side cost comparison
│   │   └── settings/
│   │       └── page.tsx          # User preferences and settings
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts          # Chat message endpoint
│   │   │   └── stream/route.ts   # SSE streaming endpoint
│   │   ├── search/route.ts
│   │   ├── listings/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── appointments/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── communications/route.ts
│   │   ├── estimates/
│   │   │   ├── route.ts
│   │   │   └── compare/route.ts
│   │   └── user/
│   │       ├── profile/route.ts
│   │       └── preferences/route.ts
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── chat-panel.tsx        # Main chat interface
│   │   ├── message-bubble.tsx    # Individual message display
│   │   ├── agent-status.tsx      # Agent thinking/working indicator
│   │   └── quick-actions.tsx     # Quick action buttons
│   ├── listings/
│   │   ├── listing-card.tsx      # Listing card for grid view
│   │   ├── listing-detail.tsx    # Full listing detail panel
│   │   ├── listing-grid.tsx      # Grid of listing cards
│   │   ├── photo-carousel.tsx    # Photo gallery carousel
│   │   ├── score-badge.tsx       # Color-coded score badge
│   │   └── score-radar.tsx       # Score breakdown radar chart
│   ├── map/
│   │   ├── map-view.tsx          # Interactive Mapbox map
│   │   ├── listing-pin.tsx       # Custom map pin component
│   │   └── map-filters.tsx       # Map filter overlay
│   ├── appointments/
│   │   ├── calendar-view.tsx     # Calendar with appointments
│   │   ├── appointment-card.tsx  # Appointment detail card
│   │   └── schedule-modal.tsx    # Schedule viewing modal
│   ├── costs/
│   │   ├── cost-breakdown.tsx    # Cost estimate breakdown
│   │   ├── cost-comparison.tsx   # Side-by-side comparison
│   │   └── cost-chart.tsx        # Visual cost chart
│   └── ui/                       # Shadcn base components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Supabase client
│   │   ├── types.ts              # Generated TypeScript types
│   │   └── queries.ts            # Reusable query functions
│   ├── agents/
│   │   ├── orchestrator.ts       # Orchestrator agent config
│   │   ├── market-researcher.ts  # Market researcher agent config
│   │   ├── scheduler.ts          # Appointment scheduler agent config
│   │   └── cost-estimator.ts     # Cost estimator agent config
│   ├── maps/
│   │   └── mapbox.ts             # Mapbox configuration
│   └── utils/
│       ├── scoring.ts            # Scoring algorithm helpers
│       └── formatting.ts         # Price, date, address formatting
├── agents/                       # Python agent layer (if using Claude Agent SDK)
│   ├── orchestrator/
│   │   ├── agent.py
│   │   └── prompts.py
│   ├── market_researcher/
│   │   ├── agent.py
│   │   ├── scrapers.py
│   │   └── scoring.py
│   ├── scheduler/
│   │   ├── agent.py
│   │   ├── email_templates.py
│   │   └── call_scripts.py
│   ├── cost_estimator/
│   │   ├── agent.py
│   │   └── la_market_data.py
│   └── shared/
│       ├── models.py
│       └── db.py
├── supabase/
│   └── migrations/               # Database migrations
├── screenshots/                  # Verification screenshots
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── agents.md
│   └── decisions.md
├── .env
├── .env.example
├── .linear_project.json
├── CHANGELOG.md
├── README.md
├── init.sh
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Key Workflows

### 1. New Search Flow
```
User: "I'm looking for a 2-bedroom apartment in Silver Lake under $3000"
  ↓
Orchestrator: Parse intent → delegate to Market Researcher + DB Manager
  ↓
Market Researcher: Search Zillow, Craigslist, FB, Reddit for Silver Lake 2BR <$3000
  ↓
DB Manager: Store new listings, deduplicate against existing
  ↓
Market Researcher: Score all matches against user preferences
  ↓
Orchestrator: Return top 10 results with scores and map pins to UI
  ↓
User: Sees listings on map and in grid, browses detail panel
```

### 2. Schedule Viewing Flow
```
User: Clicks "Schedule Viewing" on a listing
  ↓
Orchestrator: Delegate to Appointment Scheduler
  ↓
Scheduler: Check user's Google Calendar for availability
  ↓
Scheduler: Suggest 3 time slots, cluster with nearby listings
  ↓
User: Selects preferred time
  ↓
Scheduler: Send inquiry email to listing contact
  ↓
Scheduler: If no reply in 24h, send SMS follow-up
  ↓
Scheduler: If still no reply, initiate AI phone call
  ↓
Scheduler: Confirm appointment, add to calendar, notify user
```

### 3. Cost Estimate Flow
```
User: "What would it cost me to move into this place?"
  ↓
Orchestrator: Delegate to Cost Estimator
  ↓
Cost Estimator: Pull listing details (rent, deposit info)
  ↓
Cost Estimator: Calculate move-in costs, monthly costs, moving costs
  ↓
Cost Estimator: Use current LA market data for utility estimates
  ↓
Orchestrator: Return itemized cost breakdown to UI
  ↓
User: Sees breakdown in detail panel, can compare with other listings
```

---

## Task List

```json
[
  {
    "category": "setup",
    "description": "Initialize Next.js project with TypeScript and Tailwind",
    "steps": [
      "Run npx create-next-app@latest with TypeScript, Tailwind, App Router",
      "Install Shadcn/ui: npx shadcn@latest init",
      "Install core Shadcn components: button, card, input, dialog, badge, tabs, separator, sheet",
      "Install additional deps: zustand, framer-motion, mapbox-gl",
      "Configure dark theme as default",
      "Verify project runs on port 3000"
    ],
    "passes": false
  },
  {
    "category": "setup",
    "description": "Set up Supabase project and database schema",
    "steps": [
      "Connect to Supabase project via MCP",
      "Enable PostGIS extension for geo queries",
      "Enable pg_trgm extension for fuzzy text search",
      "Create users table migration",
      "Create user_preferences table migration",
      "Create listings table migration with photo array constraint",
      "Create searches table migration",
      "Create listing_scores table migration",
      "Create saved_listings table migration",
      "Create appointments table migration",
      "Create communications table migration",
      "Create cost_estimates table migration",
      "Generate TypeScript types from schema",
      "Set up Row Level Security policies"
    ],
    "passes": false
  },
  {
    "category": "setup",
    "description": "Configure MCP servers and environment",
    "steps": [
      "Create .env.example with all required variables",
      "Configure Supabase MCP server connection",
      "Configure Linear MCP server (via Arcade)",
      "Configure GitHub MCP server (via Arcade)",
      "Configure Slack MCP server (via Arcade)",
      "Configure Firecrawl MCP server for web scraping",
      "Verify all MCP connections are working",
      "Create init.sh script for project setup"
    ],
    "passes": false
  },
  {
    "category": "setup",
    "description": "Initialize Linear project with issues and roadmap",
    "steps": [
      "Create Linear project: LA Rental Finder",
      "Create milestone issues for each phase (Foundation, Search, UI, Scheduling, Costs)",
      "Create feature issues with acceptance criteria",
      "Create META issue for session tracking",
      "Save .linear_project.json with project state",
      "Add initial session comment to META issue"
    ],
    "passes": false
  },
  {
    "category": "setup",
    "description": "Initialize git repository and push to GitHub",
    "steps": [
      "Create README.md with project overview",
      "Create .gitignore for Next.js + Python + env files",
      "Initialize git repository",
      "Create initial commit",
      "Check GITHUB_REPO env var",
      "If configured, add remote and push",
      "Report repo status"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build Supabase client and auth integration",
    "steps": [
      "Install @supabase/supabase-js and @supabase/ssr",
      "Create lib/supabase/client.ts with browser and server clients",
      "Set up Supabase Auth with email/password",
      "Create auth/login and auth/signup pages",
      "Add auth middleware for protected routes",
      "Test login/signup flow"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build listings API endpoints",
    "steps": [
      "Create GET /api/listings with filters (price, beds, area, source)",
      "Create GET /api/listings/:id for full listing details",
      "Create POST /api/listings/:id/save for saving listings",
      "Create DELETE /api/listings/:id/save for unsaving",
      "Create GET /api/listings/saved for saved listings",
      "Add pagination and sorting support",
      "Test all listing endpoints"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build search API with Market Researcher integration",
    "steps": [
      "Create POST /api/search endpoint",
      "Parse natural language search queries into structured filters",
      "Integrate with Market Researcher agent for web scraping",
      "Implement listing deduplication logic",
      "Store search history in searches table",
      "Return scored and ranked results",
      "Test with sample search queries"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build chat API with SSE streaming",
    "steps": [
      "Create POST /api/chat for sending messages to orchestrator",
      "Create GET /api/chat/stream SSE endpoint for real-time responses",
      "Create GET /api/chat/history for conversation history",
      "Implement message queue for agent delegation",
      "Add agent status tracking (thinking, searching, scoring, etc.)",
      "Test chat flow end-to-end"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build appointments API endpoints",
    "steps": [
      "Create GET /api/appointments for listing appointments",
      "Create POST /api/appointments for scheduling viewings",
      "Create PUT /api/appointments/:id for updates",
      "Create DELETE /api/appointments/:id for cancellation",
      "Create POST /api/appointments/:id/confirm for confirmation",
      "Integrate with Google Calendar MCP for availability check",
      "Test appointment CRUD operations"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build communications API (email, SMS, calls)",
    "steps": [
      "Create POST /api/communications/email with email templates",
      "Create POST /api/communications/sms with Twilio integration",
      "Create POST /api/communications/call with AI call integration",
      "Create GET /api/communications for history",
      "Log all communications to database",
      "Test email sending",
      "Test SMS sending",
      "Test AI phone call initiation"
    ],
    "passes": false
  },
  {
    "category": "backend",
    "description": "Build cost estimates API",
    "steps": [
      "Create POST /api/estimates for generating estimates",
      "Create GET /api/estimates/:id for estimate details",
      "Create GET /api/estimates/compare for side-by-side comparison",
      "Implement move-in cost calculator",
      "Implement monthly cost calculator with LA utility rates",
      "Implement moving cost calculator",
      "Test with various property types and price points"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build main dashboard layout with three-panel design",
    "steps": [
      "Create main layout with header, chat panel, center panel, detail panel",
      "Implement collapsible/resizable panels",
      "Add panel toggle buttons for mobile",
      "Create header with nav, search status indicator, user menu",
      "Style with dark theme",
      "Test responsive layout at all breakpoints"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build chat interface panel",
    "steps": [
      "Create chat panel component with message list",
      "Create message bubble component (user vs agent styling)",
      "Add agent thinking/status indicator with animations",
      "Create message input with send button",
      "Add quick action buttons (New Search, View Saved, Appointments, Costs)",
      "Implement SSE connection for streaming responses",
      "Auto-scroll to latest message",
      "Test chat interaction flow"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build interactive map view",
    "steps": [
      "Set up Mapbox GL JS with dark map style",
      "Create listing pin component with score-based coloring",
      "Implement pin clustering for dense areas",
      "Add click handler to select listing and show in detail panel",
      "Add neighborhood boundary overlays for popular LA neighborhoods",
      "Implement map bounds change to trigger listing filter update",
      "Add zoom to fit all visible listings",
      "Test map interaction and pin display"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build listings grid view",
    "steps": [
      "Create listing card component with photo, price, beds/baths, score badge",
      "Create listing grid with responsive columns",
      "Add sort controls (Score, Price, Date, Distance)",
      "Add filter chips (Neighborhood, Price, Beds, Pets, Parking)",
      "Implement view toggle: Map | Grid | List",
      "Add infinite scroll / pagination",
      "Test grid filtering and sorting"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build listing detail panel",
    "steps": [
      "Create photo carousel with thumbnail strip and fullscreen mode",
      "Create property details section (address, price, beds, baths, sqft, amenities)",
      "Create score breakdown with radar chart visualization",
      "Create agent recommendation section (pros/cons summary)",
      "Add action buttons: Save, Dismiss, Schedule Viewing, Contact, Cost Estimate",
      "Add source link and freshness indicator",
      "Add communication history for this listing",
      "Test detail panel with real listing data"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build appointments dashboard",
    "steps": [
      "Create calendar view component for appointment display",
      "Create appointment card with status badges",
      "Add upcoming appointments list view",
      "Add communication log (emails, SMS, calls) per appointment",
      "Add reschedule and cancel actions",
      "Add reminder notification display",
      "Test appointment management flow"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build cost comparison view",
    "steps": [
      "Create cost breakdown component with itemized line items",
      "Create side-by-side comparison for 2-4 properties",
      "Add visual cost chart (bar chart for categories)",
      "Highlight best value property",
      "Add first-year total projection",
      "Add export to PDF button",
      "Test comparison with multiple properties"
    ],
    "passes": false
  },
  {
    "category": "frontend",
    "description": "Build user preferences and settings page",
    "steps": [
      "Create preferences form (budget, bedrooms, neighborhoods, amenities, pets)",
      "Add commute address input with map pin placement",
      "Add calendar integration settings (Google Calendar connect)",
      "Add notification preferences (email, SMS)",
      "Add theme toggle (dark/light)",
      "Save preferences to Supabase",
      "Test preferences save and load"
    ],
    "passes": false
  },
  {
    "category": "agents",
    "description": "Implement Orchestrator agent with intent routing",
    "steps": [
      "Create orchestrator agent with system prompt defining its role",
      "Implement intent parser (search, refine, schedule, estimate, status)",
      "Implement delegation logic to each sub-agent",
      "Implement context passing between agents",
      "Implement result aggregation and user-facing response formatting",
      "Implement workflow state tracking (search → review → schedule → move-in)",
      "Test orchestrator with sample conversation flows"
    ],
    "passes": false
  },
  {
    "category": "agents",
    "description": "Implement Market Researcher agent with multi-source scraping",
    "steps": [
      "Create market researcher agent with scraping system prompt",
      "Implement Zillow/Realtor.com search via Firecrawl",
      "Implement Craigslist search and parsing",
      "Implement Facebook Marketplace search via Browserbase",
      "Implement Reddit search (r/LArentals, r/LosAngeles)",
      "Implement Apartments.com and Trulia search",
      "Create listing normalization pipeline (standardize fields across sources)",
      "Implement deduplication (match by address + price)",
      "Implement photo requirement filter (skip listings without photos)",
      "Implement scoring algorithm based on user preferences",
      "Test with real LA rental searches"
    ],
    "passes": false
  },
  {
    "category": "agents",
    "description": "Implement Appointment Scheduler agent",
    "steps": [
      "Create scheduler agent with communication system prompt",
      "Implement Google Calendar availability check",
      "Implement location-clustered time slot suggestion",
      "Create email inquiry templates and sending logic",
      "Create SMS templates and Twilio sending logic",
      "Implement AI phone call script and Bland.ai/Vapi integration",
      "Implement appointment status tracking and follow-up logic",
      "Add calendar event creation on confirmation",
      "Test full scheduling workflow"
    ],
    "passes": false
  },
  {
    "category": "agents",
    "description": "Implement Cost Estimator agent",
    "steps": [
      "Create cost estimator agent with LA market knowledge prompt",
      "Implement move-in cost calculator (deposit, first/last, fees)",
      "Implement monthly cost calculator (rent, utilities, insurance, parking)",
      "Implement moving cost calculator (movers, truck, supplies)",
      "Add current LA utility rate data (LADWP, SoCalGas)",
      "Implement side-by-side comparison logic",
      "Implement first-year total projection",
      "Test with various property types and neighborhoods"
    ],
    "passes": false
  },
  {
    "category": "agents",
    "description": "Implement Database Manager agent",
    "steps": [
      "Create DB manager agent with Supabase MCP tools",
      "Implement listing upsert with deduplication",
      "Implement full-text search queries for listings",
      "Implement geo-spatial queries (PostGIS) for location-based filtering",
      "Implement stale listing cleanup (mark inactive after 30 days)",
      "Optimize query performance with proper indexing",
      "Generate and maintain TypeScript types",
      "Test all database operations"
    ],
    "passes": false
  },
  {
    "category": "integration",
    "description": "Wire up agent-to-UI communication with SSE",
    "steps": [
      "Connect chat input to orchestrator agent",
      "Implement SSE streaming for agent responses",
      "Add real-time agent status indicators (which agent is working)",
      "Stream listing results to map and grid as they arrive",
      "Stream cost estimates to detail panel",
      "Handle agent errors gracefully with user-friendly messages",
      "Test full chat-to-agent-to-UI flow"
    ],
    "passes": false
  },
  {
    "category": "integration",
    "description": "End-to-end search flow testing",
    "steps": [
      "Test: user types search query → agent searches → listings appear on map",
      "Test: user clicks listing → detail panel shows with score and photos",
      "Test: user asks to schedule → scheduler checks calendar → suggests times",
      "Test: user requests cost estimate → estimator returns breakdown",
      "Test: user saves listing → appears in saved listings",
      "Test: user refines search → results update in real-time",
      "Provide screenshot evidence for each test"
    ],
    "passes": false
  },
  {
    "category": "polish",
    "description": "UI polish and responsive design",
    "steps": [
      "Ensure all components render correctly in dark and light mode",
      "Add loading skeletons for async data",
      "Add smooth panel transition animations",
      "Optimize for mobile (stacked layout, bottom sheet for detail)",
      "Add empty states for no results, no saved, no appointments",
      "Add error states with retry actions",
      "Test on mobile viewports"
    ],
    "passes": false
  },
  {
    "category": "documentation",
    "description": "Create project documentation",
    "steps": [
      "Write README.md with setup instructions, env var list, and usage guide",
      "Create docs/architecture.md with system diagram and agent descriptions",
      "Create docs/api.md with all endpoint documentation",
      "Create docs/agents.md with agent configs, tools, and prompts",
      "Create CHANGELOG.md with initial release notes",
      "Add inline code comments for complex logic",
      "Review and finalize all documentation"
    ],
    "passes": false
  }
]
```

---

## Success Criteria

1. **Multi-Source Search:** Market Researcher successfully aggregates listings from at least 4 different sources (MLS/Zillow, Craigslist, Facebook, Reddit/other)
2. **Photo Requirement:** All indexed listings include at least one photo
3. **Scoring:** Listings are scored 1-100 based on user preferences with visible breakdown
4. **Chat Interface:** Users can describe rental needs in natural language and receive relevant results
5. **Map Display:** Listings display on interactive map with score-colored pins
6. **Appointment Scheduling:** Full flow from inquiry email → SMS follow-up → AI phone call → calendar booking
7. **Cost Estimates:** Accurate move-in, monthly, and moving cost breakdowns with LA-specific data
8. **Database:** All listings, searches, preferences, and appointments persist in Supabase
9. **Linear Tracking:** All features tracked as issues with status updates
10. **Real-Time Updates:** Agent responses stream to UI via SSE with status indicators
11. **Responsive UI:** Works on desktop (three-panel) and mobile (stacked) layouts
12. **Documentation:** Complete README, architecture docs, and API docs

---

## Agent Instructions

1. Read `activity.md` first to understand current state
2. Find next task with `"passes": false`
3. Complete all steps for that task
4. Update task to `"passes": true`
5. Log completion in `activity.md`
6. Repeat until all tasks pass

**Important:** Only modify the `passes` field. Do not remove or rewrite tasks.

---

## Completion Criteria

All tasks marked with `"passes": true`
