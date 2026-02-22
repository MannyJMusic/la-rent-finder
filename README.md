# LA Rent Finder

A rental property search and management application for Los Angeles, featuring AI-powered chat, interactive maps, and real-time listings.

**Production**: [rent.digitalcrossroadsmusic.com](https://rent.digitalcrossroadsmusic.com)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (React 19, App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Maps | Mapbox GL JS |
| AI | Anthropic Claude (via `@anthropic-ai/sdk`) |
| Deployment | GitHub Actions → Hostinger VPS (PM2 cluster) |
| Node | 22 (pinned via `.nvmrc`) |

## Project Structure

```
la-rent-finder/
├── app/
│   ├── api/              # API routes (chat, listings, appointments, etc.)
│   ├── auth/             # Login, signup, callback pages
│   ├── dashboard/        # Main dashboard page
│   ├── appointments/     # Appointment management
│   ├── compare/          # Property comparison
│   ├── settings/         # User settings
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page
│   └── globals.css       # Tailwind + CSS custom properties
├── components/
│   ├── DashboardLayout.tsx   # Three-panel flexbox layout
│   ├── ChatPanel.tsx         # AI chat interface
│   ├── MapListingsPanel.tsx  # Mapbox map + listings
│   ├── DetailPanel.tsx       # Property detail view
│   ├── DashboardHeader.tsx   # Nav header
│   ├── ui/                   # shadcn/ui primitives
│   └── ...                   # Feature-specific components
├── lib/
│   ├── agents/           # AI agent definitions
│   ├── services/         # Business logic services
│   ├── supabase/         # Supabase client helpers
│   ├── types/            # TypeScript type definitions
│   └── utils.ts          # Shared utilities
├── scripts/
│   ├── deploy.sh         # VPS deployment (called by CI)
│   ├── rollback.sh       # Emergency rollback
│   └── server-setup.sh   # One-time VPS provisioning
├── .github/workflows/
│   └── deploy.yml        # CI/CD pipeline
├── ecosystem.config.cjs  # PM2 cluster config
├── middleware.ts          # Auth route protection
└── next.config.mjs       # Standalone output mode
```

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- npm
- Supabase project
- Mapbox API key

### Installation

```bash
git clone https://github.com/MannyJMusic/la-rent-finder.git
cd la-rent-finder
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_API_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# Optional integrations
FIRECRAWL_API_KEY=
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
```

### Development

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build (standalone output)
npm run lint      # ESLint 9 flat config
```

## Deployment

### CI/CD Pipeline

Every push to `main` triggers a GitHub Actions workflow:

```
Push to main
  → quality job: ESLint + TypeScript type-check
  → deploy job: build (standalone) → rsync to VPS → deploy.sh
    → symlink swap → PM2 reload → health check
```

The workflow is defined in `.github/workflows/deploy.yml`.

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Hostinger VPS IP/hostname |
| `VPS_USER` | SSH username |
| `VPS_SSH_PRIVATE_KEY` | Ed25519 SSH private key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token |
| `NEXT_PUBLIC_API_URL` | Production base URL |

### VPS Architecture

```
/var/www/la-rent-finder/
├── .env.local              ← Runtime secrets (persists across deploys)
├── current/                ← Symlink → latest release
├── releases/
│   ├── 20260221143000/     ← Timestamped releases (keeps last 5)
│   └── ...
├── logs/
└── staging/                ← Temporary, cleaned after deploy
```

- **Server**: Hostinger VPS, Ubuntu 24.04
- **Runtime**: Node 22, PM2 6 (cluster mode, port 3001)
- **Proxy**: Nginx → PM2 (port 3001)
- **Build**: Next.js standalone output (`server.js` entry point)

### Manual Operations

```bash
# Emergency rollback (on VPS)
bash /var/www/la-rent-finder/current/scripts/rollback.sh

# Check app status (on VPS)
pm2 list
pm2 logs la-rent-finder
```

## Features

- **AI Chat**: Natural language property search powered by Claude
- **Interactive Map**: Mapbox-powered map with property markers and clustering
- **Property Details**: Photos, amenities, pricing, and neighborhood info
- **Saved Listings**: Bookmark properties for later
- **Appointments**: Schedule and manage property viewings
- **Property Comparison**: Side-by-side comparison of listings
- **Cost Estimates**: Rental cost breakdowns
- **Communications**: Email/SMS/call integration (Resend, Twilio)
- **Auth**: Supabase Auth with email verification

## API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat` | AI chat completions |
| `GET /api/listings` | Search listings |
| `GET /api/listings/[id]` | Listing details |
| `POST /api/listings/[id]/save` | Save/unsave listing |
| `GET /api/listings/saved` | User's saved listings |
| `GET/POST /api/appointments` | Manage appointments |
| `GET/POST /api/estimates` | Cost estimates |
| `POST /api/search` | Property search |
| `GET/PUT /api/user/profile` | User profile |
| `GET/PUT /api/user/preferences` | User preferences |
| `POST /api/communications/email` | Send email |
| `POST /api/communications/sms` | Send SMS |
| `POST /api/communications/call` | Initiate call |

## License

MIT
