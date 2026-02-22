# Plan: Multi-Source Real Estate API Integration

## Summary

Replace the Firecrawl-based web scraping pipeline with structured API clients (Realty in US via RapidAPI, RentCast, Homesage.ai) that return JSON directly. This eliminates brittle markdown parsing, reduces latency, and maximizes free-tier API volume. The existing normalization, deduplication, persistence, and lifecycle layers remain intact — only the data fetching layer changes.

## User Story

As an LA renter using the app,
I want reliable, up-to-date rental listings sourced from real estate APIs,
So that I get accurate results without depending on fragile web scraping.

## Metadata

| Field | Value |
|-------|-------|
| Type | REFACTOR + ENHANCEMENT |
| Complexity | MEDIUM |
| Systems Affected | `lib/crawl/`, `app/api/crawl/`, `.env.local`, `package.json` |

---

## Patterns to Follow

### Source Adapter Interface
```typescript
// SOURCE: lib/crawl/types.ts:90-94
export interface SourceAdapter {
  config: SourceAdapterConfig;
  buildSearchUrls(params: CrawlSearchParams): string[];
  extractListings(markdown: string, url: string): RawListing[];
}
```

### Adapter Config
```typescript
// SOURCE: lib/crawl/types.ts:80-86
export interface SourceAdapterConfig {
  name: string;
  baseUrl: string;
  reliability: number;       // 0-100
  requestsPerMinute: number;
  delayBetweenRequests: number; // ms
}
```

### Rate Limiting
```typescript
// SOURCE: lib/crawl/engine.ts:61-77
// Per-adapter in-memory rate limiters using Map<string, {lastRequest, minDelay}>
```

### Error Handling — Graceful Collection
```typescript
// SOURCE: lib/crawl/engine.ts:36-40
catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[CrawlEngine] Error crawling ${url}:`, message);
  errors.push(`Failed to crawl ${url}: ${message}`);
}
```

### Client Initialization — Environment Check
```typescript
// SOURCE: lib/crawl/engine.ts:14-18
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) throw new Error('FIRECRAWL_API_KEY environment variable is required');
```

### Service Client — Graceful Degradation
```typescript
// SOURCE: lib/services/resend.ts:3-7
const apiKey = process.env.RESEND_API_KEY;
const client = apiKey ? new Resend(apiKey) : null;
export function isEmailConfigured(): boolean {
  return Boolean(apiKey);
}
```

### Normalization Entry Point
```typescript
// SOURCE: lib/crawl/normalize.ts:213-262
// normalizeRawListing(raw: RawListing): NormalizedListing
// Multi-step: address → neighborhood → propertyType → price → amenities
```

### Crawl Route — Adapter Loop
```typescript
// SOURCE: app/api/crawl/route.ts:59-81
// For each adapter: crawl → normalize → dedup → merge/persist
// Errors collected per-adapter, never halt the loop
```

### Logging Convention
```
// SOURCE: lib/crawl/engine.ts:38
console.error(`[CrawlEngine] Error crawling ${url}:`, message);
// Pattern: console.error(`[ModuleName] Context:`, details)
```

---

## Architecture Change

```
CURRENT:
  CrawlEngine (Firecrawl) → markdown → SourceAdapter.extractListings() → RawListing[]
                                         ↓
                              normalize → dedup → persist

PROPOSED:
  ApiSyncEngine (fetch) → JSON → ApiSourceAdapter.fetchListings() → RawListing[]
                                    ↓
                         normalize → dedup → persist  (UNCHANGED)
```

Key insight: The `RawListing` type is the contract boundary. New API adapters produce `RawListing[]` directly from JSON — no markdown parsing needed. Everything downstream of `RawListing` (normalize, dedup, lifecycle) stays untouched.

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `lib/crawl/types.ts` | UPDATE | Add `ApiSourceAdapter` interface alongside existing `SourceAdapter` |
| `lib/crawl/api-client.ts` | CREATE | Generic HTTP client with rate limiting, retries, and API key management |
| `lib/crawl/adapters/realty-in-us.ts` | CREATE | RapidAPI Realty in US adapter (primary listings source, 500 free/mo) |
| `lib/crawl/adapters/rentcast.ts` | CREATE | RentCast adapter (enrichment + rent estimates, 50 free/mo) |
| `lib/crawl/adapters/index.ts` | UPDATE | Export new API adapters alongside existing ones |
| `lib/crawl/sync-engine.ts` | CREATE | API sync orchestrator — replaces CrawlEngine for API sources |
| `lib/crawl/index.ts` | UPDATE | Export new sync engine and API adapters |
| `app/api/crawl/route.ts` | UPDATE | Support both crawl (legacy) and API sync modes |
| `app/api/sync/route.ts` | CREATE | Dedicated endpoint for API-based sync (scheduled + manual) |
| `.env.example` | UPDATE | Add new API key variables |
| `.env.local` | UPDATE | Add actual API keys |

---

## Tasks

Execute in order. Each task is atomic and verifiable.

### Task 1: Define ApiSourceAdapter Interface

- **File**: `lib/crawl/types.ts`
- **Action**: UPDATE
- **Implement**: Add a new `ApiSourceAdapter` interface that returns `RawListing[]` directly from API calls instead of parsing markdown. Keep the existing `SourceAdapter` interface intact for backward compatibility.
  ```typescript
  export interface ApiSourceAdapter {
    config: SourceAdapterConfig;
    fetchListings(params: CrawlSearchParams): Promise<ApiSourceResult>;
    isConfigured(): boolean;
  }

  export interface ApiSourceResult {
    listings: RawListing[];
    errors: string[];
    rateLimitRemaining?: number;
    rateLimitReset?: string;
  }
  ```
- **Mirror**: `lib/crawl/types.ts:90-94` — follow the existing `SourceAdapter` shape
- **Validate**: `pnpm run build`

### Task 2: Create Generic API Client

- **File**: `lib/crawl/api-client.ts`
- **Action**: CREATE
- **Implement**: A shared HTTP client used by all API adapters. Features:
  - `fetchJson<T>(url, options)` — wrapper around `fetch()` with JSON parsing
  - Built-in rate limit tracking (read `X-RateLimit-Remaining` / `X-RateLimit-Reset` headers)
  - Retry logic with exponential backoff (max 2 retries, 429/5xx only)
  - Per-adapter rate limiting reusing the pattern from `engine.ts:61-77`
  - Request/response logging with `[ApiClient]` prefix
  - Timeout support (default 30s)
- **Mirror**: `lib/crawl/engine.ts:61-77` for rate limiting pattern, `lib/services/resend.ts:3-7` for env check pattern
- **Validate**: `pnpm run build`

### Task 3: Create Realty in US Adapter (Primary Source)

- **File**: `lib/crawl/adapters/realty-in-us.ts`
- **Action**: CREATE
- **Implement**: Adapter for the RapidAPI "Realty in US" API (by apidojo). This is the primary listings source with 500 free calls/mo.
  - **Config**: name `realty_in_us`, baseUrl `https://realty-in-us.p.rapidapi.com`, reliability 95, requestsPerMinute 10, delayBetweenRequests 6000ms
  - **Headers**: `X-RapidAPI-Key` from `RAPIDAPI_KEY` env var, `X-RapidAPI-Host: realty-in-us.p.rapidapi.com`
  - **Endpoint**: `GET /properties/v3/list` with params:
    - `status_type=ForRent`
    - `city=Los Angeles`, `state_code=CA`
    - `limit=42` (max per page)
    - `offset` for pagination
    - `price_min`, `price_max`, `beds_min`, `baths_min`
    - `postal_code` (for neighborhood targeting)
  - **Mapping**: Transform API JSON response → `RawListing[]` objects matching the contract in `types.ts:16-37`
  - **isConfigured()**: Check `process.env.RAPIDAPI_KEY` is set
- **Mirror**: `lib/crawl/adapters/zillow.ts:9-15` for config pattern, `lib/crawl/adapters/zillow.ts:160-223` for extraction helpers
- **Validate**: `pnpm run build`

### Task 4: Create RentCast Adapter (Enrichment Source)

- **File**: `lib/crawl/adapters/rentcast.ts`
- **Action**: CREATE
- **Implement**: Adapter for the RentCast API. Secondary source for enrichment and rent estimates (50 free calls/mo).
  - **Config**: name `rentcast`, baseUrl `https://api.rentcast.io/v1`, reliability 90, requestsPerMinute 5, delayBetweenRequests 12000ms
  - **Headers**: `X-Api-Key` from `RENTCAST_API_KEY` env var, `Accept: application/json`
  - **Primary Endpoint**: `GET /listings/rental/long-term` with params:
    - `city=Los Angeles`, `state=CA`
    - `limit=500` (max per request)
    - `bedrooms`, `bathrooms`, `priceMin`, `priceMax`
    - `latitude`, `longitude`, `radius` (miles) — for neighborhood targeting
  - **Secondary Endpoint**: `GET /avm/rent/long-term` for rent estimates (used for enrichment only)
  - **Mapping**: Transform JSON → `RawListing[]`
  - **isConfigured()**: Check `process.env.RENTCAST_API_KEY` is set
  - **Budget awareness**: Track calls remaining via response headers, log warnings at <10 remaining
- **Mirror**: `lib/crawl/adapters/zillow.ts:9-15` for config, `lib/services/resend.ts:3-7` for optional config pattern
- **Validate**: `pnpm run build`

### Task 5: Update Adapter Index Exports

- **File**: `lib/crawl/adapters/index.ts`
- **Action**: UPDATE
- **Implement**: Export the new API adapters alongside existing scraping adapters. Create two export groups:
  ```typescript
  // Existing scraping adapters (legacy)
  export { zillowAdapter } from './zillow';
  export { apartmentsComAdapter } from './apartments-com';
  export { rentComAdapter } from './rent-com';

  // API adapters (new)
  export { realtyInUsAdapter } from './realty-in-us';
  export { rentcastAdapter } from './rentcast';

  // Grouped collections
  export const scrapingAdapters: SourceAdapter[] = [...];
  export const apiAdapters: ApiSourceAdapter[] = [...];
  ```
- **Mirror**: `lib/crawl/adapters/index.ts` current structure
- **Validate**: `pnpm run build`

### Task 6: Create API Sync Engine

- **File**: `lib/crawl/sync-engine.ts`
- **Action**: CREATE
- **Implement**: New orchestrator that works with `ApiSourceAdapter` instead of `SourceAdapter + Firecrawl`. Follows the same pattern as `engine.ts` but calls `adapter.fetchListings()` directly instead of scraping.
  - **Class**: `ApiSyncEngine`
  - **Method**: `syncFromApi(adapter: ApiSourceAdapter, params: CrawlSearchParams): Promise<CrawlResult>`
    1. Check `adapter.isConfigured()` — skip with warning if not
    2. Call `adapter.fetchListings(params)` — returns `RawListing[]` directly
    3. Return `CrawlResult` with same shape as `engine.ts:20-51`
  - **Method**: `syncAllApis(params: CrawlSearchParams): Promise<SyncSummary>`
    1. Iterate over all configured API adapters
    2. Collect results, errors
    3. Return summary with per-source stats
  - No Firecrawl dependency — pure `fetch()` via `api-client.ts`
- **Mirror**: `lib/crawl/engine.ts:20-51` for result shape, `app/api/crawl/route.ts:59-81` for adapter loop pattern
- **Validate**: `pnpm run build`

### Task 7: Update Crawl Module Barrel Export

- **File**: `lib/crawl/index.ts`
- **Action**: UPDATE
- **Implement**: Add exports for new modules:
  ```typescript
  export { ApiSyncEngine } from './sync-engine';
  export { ApiClient } from './api-client';
  export { apiAdapters } from './adapters';
  export type { ApiSourceAdapter, ApiSourceResult } from './types';
  ```
- **Mirror**: `lib/crawl/index.ts` existing structure
- **Validate**: `pnpm run build`

### Task 8: Create Dedicated Sync API Route

- **File**: `app/api/sync/route.ts`
- **Action**: CREATE
- **Implement**: New API route for triggering API-based listing sync. Separate from the existing `/api/crawl` to allow independent operation.
  - **POST /api/sync**: Trigger sync from API sources
    - Auth check (mirror `app/api/crawl/route.ts:14-19`)
    - Request body: `{ sources?: string[], neighborhoods?: string[], maxPrice?, minPrice?, bedrooms? }`
    - Dynamic import of sync engine (mirror `app/api/crawl/route.ts:29`)
    - Loop adapters → for each listing: normalize → dedup → merge/persist (mirror `route.ts:59-81`)
    - Log to `crawl_runs` table with `source_name` = adapter name (mirror `route.ts:49-57`)
    - Return JSON: `{ syncRunId, listingsFound, listingsNew, listingsUpdated, errors, rateLimits }`
  - **GET /api/sync**: Return sync status / last run info
    - Query `crawl_runs` ordered by `created_at DESC`, limit 10
- **Mirror**: `app/api/crawl/route.ts` — full pattern
- **Validate**: `pnpm run build`

### Task 9: Update Environment Configuration

- **File**: `.env.example`
- **Action**: UPDATE
- **Implement**: Add new API key variables with documentation comments:
  ```bash
  # Real Estate API Keys
  # RapidAPI key for Realty in US API (500 free calls/mo on Basic plan)
  # Get yours at: https://rapidapi.com/apidojo/api/realty-in-us
  RAPIDAPI_KEY=

  # RentCast API key (50 free calls/mo)
  # Get yours at: https://developers.rentcast.io/
  RENTCAST_API_KEY=
  ```
- **File**: `.env.local`
- **Action**: UPDATE — add the same variables (user fills in actual keys)
- **Mirror**: `.env.example` existing section structure (lines 70-80)
- **Validate**: `pnpm run build`

### Task 10: Wire Up Sync Route + Integration Test

- **File**: `app/api/sync/route.ts` (verify)
- **Action**: VERIFY
- **Implement**: Manually test the full flow end-to-end:
  1. Set `RAPIDAPI_KEY` in `.env.local`
  2. Start dev server: `pnpm dev`
  3. Call `POST /api/sync` with `{ "sources": ["realty_in_us"] }`
  4. Verify listings appear in the `properties` table
  5. Verify `crawl_runs` has a new entry
  6. Verify deduplication works on second sync
- **Validate**: `pnpm run build && pnpm run lint`

---

## Validation

```bash
# Type check
pnpm run build

# Lint
pnpm run lint
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| RapidAPI response schema changes | Type-check API responses at adapter level; log unexpected shapes |
| Free tier exhaustion (500 calls/mo) | Track `rateLimitRemaining` in adapter, warn at <50, stop at 0 |
| API downtime | Graceful degradation — adapters return empty results, don't crash |
| Existing scraping adapters break | Keep them intact — no modifications to zillow/apartments-com/rent-com |
| Data quality differences between APIs | Normalization layer handles this — all data passes through same pipeline |

---

## Acceptance Criteria

- [ ] All tasks completed
- [ ] Type check passes (`pnpm run build`)
- [ ] Lint passes (`pnpm run lint`)
- [ ] New adapters follow existing `SourceAdapterConfig` pattern
- [ ] Existing crawl pipeline is untouched and still functional
- [ ] `POST /api/sync` returns listings from at least one API source
- [ ] Listings from API sync appear correctly in the `properties` table
- [ ] Rate limit tracking logs warnings when approaching free tier limits
- [ ] All new modules use `[ModuleName]` console logging prefix convention

---

## Future Enhancements (Not in Scope)

- **Scheduled sync via cron**: Add `vercel.json` or `next.config` cron to auto-sync every 6 hours
- **Homesage.ai adapter**: Third API source for property intelligence (add after validating first two)
- **API usage dashboard**: Track call counts per source in a new `api_usage` table
- **Webhook-based sync**: Listen for new listing notifications from APIs that support it
