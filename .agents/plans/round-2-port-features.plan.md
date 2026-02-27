# Plan: Round 2 — Port Features from larentals

## Summary

Port high-impact features from the larentals Python/Dash app into la-rent-finder: Mapbox marker clustering, expanded filter set (sqft, bathrooms, year built, date listed, laundry, furnished), noise score enrichment (HowLoud API), ISP speed data (CPUC ArcGIS), user reporting, and "include missing" filter toggles. The work is organized into 6 workstreams with a shared DB migration, progressing from foundational data model changes through UI and enrichment integrations.

## User Story

As a renter searching for apartments in LA,
I want richer filtering (sqft, year built, laundry, noise, internet speed), clustered map markers, and crowd-sourced freshness reporting,
So that I can find the right apartment faster with fewer false positives and better data quality.

## Metadata

| Field | Value |
|-------|-------|
| Type | ENHANCEMENT |
| Complexity | HIGH (multi-workstream, DB migration, 3rd-party APIs, map rewrite) |
| Systems Affected | DB schema, crawl pipeline, listings API, filter UI, map component, detail page, listing cards |
| Source Research | `.claude/research/larentals-comparison.md` |

---

## Patterns to Follow

### Filter Interface Extension
```typescript
// SOURCE: components/listings/FilterChips.tsx:6-13
export interface FilterValue {
  propertyType?: string[];
  neighborhood?: string[];
  priceRange?: { min: number; max: number };
  bedrooms?: number;
  pets?: boolean;
  parking?: boolean;
}
// PATTERN: Optional fields. Arrays for multi-select. Objects for ranges.
// Booleans for toggles. Single number for min-threshold pills.
```

### Range Filter UI (dual inputs)
```typescript
// SOURCE: components/SearchFilterPanel.tsx:170-217
// PATTERN: Two <Input type="number"> side-by-side with "—" separator.
// Local state for input values. Apply on blur or Enter.
// Display applied range below with "Clear" button.
```

### Pill Button Filter
```typescript
// SOURCE: components/SearchFilterPanel.tsx:219-236
// PATTERN: Array of { label, value } options. Button with variant
// conditional on current filter value. onClick spreads filters + new value.
const BEDROOM_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '1+', value: 1 },
  // ...
];
```

### Checkbox Multi-Select Filter
```typescript
// SOURCE: components/SearchFilterPanel.tsx:238-256
// PATTERN: Array.includes() for checked state. Toggle handler
// adds/removes from array, sets undefined if empty.
const togglePropertyType = (type: string, checked: boolean) => {
  const current = filters.propertyType ?? [];
  const updated = checked ? [...current, type] : current.filter((t) => t !== type);
  onFiltersChange({ ...filters, propertyType: updated.length > 0 ? updated : undefined });
};
```

### Toggle Switch Filter
```typescript
// SOURCE: components/SearchFilterPanel.tsx:288-332
// PATTERN: Custom switch with role="switch", aria-checked.
// Toggles between true and undefined (NOT false).
onClick={() => onFiltersChange({ ...filters, pets: filters.pets ? undefined : true })
```

### FilterChips Label Generation
```typescript
// SOURCE: components/listings/FilterChips.tsx:21-78
// PATTERN: Build chips array conditionally. Each chip has { key, label }.
// Render pill with X button calling onRemove(key). "Clear all" if 2+ chips.
```

### URL Param Mapping (FilterValue -> API)
```typescript
// SOURCE: components/MapListingsPanel.tsx:66-98
// PATTERN: Each FilterValue field maps to a URL param via URLSearchParams.
// Ranges: min_X, max_X. Arrays: comma-separated. Booleans: stringified.
if (filters.priceRange) {
  params.set('min_price', filters.priceRange.min.toString());
  params.set('max_price', filters.priceRange.max.toString());
}
```

### Supabase Query Building
```typescript
// SOURCE: app/api/listings/route.ts:26-99
// PATTERN: Chain .gte()/.lte() for ranges. .eq() for exact.
// .in() for multi-value. .not('col', 'is', null) for existence.
// .ilike() for text search. Always default is_active=true.
if (price_min) query = query.gte('price', parseFloat(price_min));
if (price_max) query = query.lte('price', parseFloat(price_max));
```

### DB Migration Naming
```
// SOURCE: supabase/migrations/
// PATTERN: YYYYMMDDHHMMSS_snake_case_description.sql
// 20260211000001_initial_schema.sql
// 20260211000002_add_missing_tables.sql
// 20260212000001_add_communications_and_chat_messages.sql
```

### Normalization Function
```typescript
// SOURCE: lib/crawl/normalize.ts:190-209
// PATTERN: Map of raw strings -> canonical names.
// Export a dedicated normalize function. Used during crawl + during enrichment.
const AMENITY_MAP: Record<string, string> = {
  'w/d': 'In-Unit Laundry',
  'washer/dryer': 'In-Unit Laundry',
  // ...
};
```

### Detail Panel Section
```typescript
// SOURCE: components/DetailPanel.tsx:365-413
// PATTERN: <div> with label + icon in muted foreground.
// Grid layout (grid-cols-2 or grid-cols-3). Conditional rendering.
// Green/blue/amber color coding for status badges.
```

---

## Files to Change

### New Files

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260224000001_add_round2_columns.sql` | CREATE | Add year_built, laundry_category, noise_score, isp_download, isp_upload, reported_inactive columns |
| `lib/crawl/normalize-laundry.ts` | CREATE | Laundry category normalization (In Unit, Shared, Hookups, etc.) |
| `lib/services/howloud.ts` | CREATE | HowLoud API client for noise score enrichment |
| `lib/services/cpuc-broadband.ts` | CREATE | CPUC ArcGIS query for ISP speed data |
| `app/api/listings/[id]/report/route.ts` | CREATE | User report endpoint (mark as inactive) |

### Modified Files

| File | Action | Purpose |
|------|--------|---------|
| `lib/database.types.ts` | UPDATE | Regenerate types after migration (or manually add new columns) |
| `lib/types/listing.ts` | UPDATE | Add new fields to Listing interface |
| `components/listings/FilterChips.tsx` | UPDATE | Extend FilterValue with new filter fields + chip labels |
| `components/SearchFilterPanel.tsx` | UPDATE | Add new filter controls (sqft, bathrooms, year built, date listed, laundry, furnished) |
| `components/MapListingsPanel.tsx` | UPDATE | Map new FilterValue fields to URL params |
| `app/api/listings/route.ts` | UPDATE | Handle new filter params in Supabase queries |
| `components/map/MapboxMap.tsx` | UPDATE | Rewrite marker creation to use Mapbox native clustering |
| `components/DetailPanel.tsx` | UPDATE | Add noise score, ISP speed, laundry, year built sections |
| `components/listings/ListingCard.tsx` | UPDATE | Optionally surface year built and laundry badges |
| `lib/crawl/types.ts` | UPDATE | Add new fields to RawListing and NormalizedListing |
| `lib/crawl/normalize.ts` | UPDATE | Import + call laundry normalizer, extract year_built |
| `lib/crawl/adapters/realty-in-us.ts` | UPDATE | Extract year_built from API response |
| `app/api/listings/[id]/route.ts` | UPDATE | Trigger noise + ISP enrichment on first detail view |

---

## Workstreams

### Overview

| # | Workstream | Tasks | Dependencies |
|---|------------|-------|--------------|
| WS1 | DB Migration & Types | 1-3 | None |
| WS2 | Marker Clustering | 4-5 | None |
| WS3 | Expanded Filters | 6-12 | WS1 (types) |
| WS4 | Data Enrichment (Noise + ISP) | 13-16 | WS1 (columns) |
| WS5 | Detail & Card Enhancements | 17-19 | WS1, WS4 |
| WS6 | User Reporting | 20-21 | WS1 |

---

## Tasks

### WS1: Database Migration & Type Updates

#### Task 1: Create DB Migration

- **File**: `supabase/migrations/20260224000001_add_round2_columns.sql`
- **Action**: CREATE
- **Implement**:
  ```sql
  -- New columns on properties (apartments) table
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS year_built INTEGER;
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS laundry_category VARCHAR(50);
  -- laundry_category values: 'in_unit', 'shared', 'hookups', 'included_appliances', 'none', 'unknown'
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_score INTEGER;
  -- noise_score: 0-100 from HowLoud API (higher = quieter)
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_traffic INTEGER;
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_airports INTEGER;
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_local INTEGER;
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_text VARCHAR(50);
  -- noise_text: HowLoud category ('Quiet', 'Moderate', 'Noisy', etc.)
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS isp_download_mbps NUMERIC(8,2);
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS isp_upload_mbps NUMERIC(8,2);
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS reported_as_inactive BOOLEAN DEFAULT false;
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE apartments ADD COLUMN IF NOT EXISTS listed_date TIMESTAMP WITH TIME ZONE;

  -- Indexes for new filterable columns
  CREATE INDEX IF NOT EXISTS idx_apartments_year_built ON apartments (year_built);
  CREATE INDEX IF NOT EXISTS idx_apartments_laundry ON apartments (laundry_category);
  CREATE INDEX IF NOT EXISTS idx_apartments_noise_score ON apartments (noise_score);
  CREATE INDEX IF NOT EXISTS idx_apartments_isp_download ON apartments (isp_download_mbps);
  CREATE INDEX IF NOT EXISTS idx_apartments_listed_date ON apartments (listed_date);
  CREATE INDEX IF NOT EXISTS idx_apartments_reported ON apartments (reported_as_inactive) WHERE reported_as_inactive = true;
  ```
- **Mirror**: `supabase/migrations/20260211000001_initial_schema.sql:33-73` — follow column naming and type conventions
- **Validate**: Run migration in Supabase SQL editor, verify columns exist

#### Task 2: Update Database TypeScript Types

- **File**: `lib/database.types.ts`
- **Action**: UPDATE
- **Implement**: Add new columns to the `properties` table Row, Insert, and Update types:
  - `year_built: number | null`
  - `laundry_category: string | null`
  - `noise_score: number | null`
  - `noise_traffic: number | null`
  - `noise_airports: number | null`
  - `noise_local: number | null`
  - `noise_text: string | null`
  - `isp_download_mbps: number | null`
  - `isp_upload_mbps: number | null`
  - `reported_as_inactive: boolean | null`
  - `reported_at: string | null`
  - `listed_date: string | null`
- **Mirror**: `lib/database.types.ts:575-684` — follow existing Row/Insert/Update pattern
- **Validate**: `npm run build` (type check catches mismatches)

#### Task 3: Update Listing Interface

- **File**: `lib/types/listing.ts`
- **Action**: UPDATE
- **Implement**: Add to `Listing` interface:
  ```typescript
  year_built?: number;
  laundry_category?: string;
  noise_score?: number;
  noise_text?: string;
  isp_download_mbps?: number;
  isp_upload_mbps?: number;
  listed_date?: string;
  reported_as_inactive?: boolean;
  ```
- **Mirror**: `lib/types/listing.ts:1-30` — follow existing optional field pattern
- **Validate**: `npm run build`

---

### WS2: Marker Clustering

#### Task 4: Rewrite MapboxMap to Use Native Clustering

- **File**: `components/map/MapboxMap.tsx`
- **Action**: UPDATE (major rewrite of marker rendering)
- **Implement**:
  1. **On map load**, add a GeoJSON source with clustering enabled:
     ```typescript
     map.addSource('listings', {
       type: 'geojson',
       data: listingsToGeoJSON(listings),
       cluster: true,
       clusterMaxZoom: 14,
       clusterRadius: 50,
     });
     ```
  2. **Add 3 layers**:
     - `clusters` layer: circle symbols for cluster points, sized by `point_count` (small/medium/large), colored by average score
     - `cluster-count` layer: symbol layer showing count text inside clusters
     - `unclustered-point` layer: circle markers for individual listings, colored by score (reuse `getScoreColor`)
  3. **Click handlers**:
     - Click on cluster → `map.getSource('listings').getClusterExpansionZoom(clusterId)` → `map.easeTo({ center, zoom })`
     - Click on unclustered point → call `onListingSelect` with the listing data from feature properties
  4. **Popup on hover** for unclustered points: show title, price, beds/baths/sqft (reuse existing popup HTML pattern)
  5. **Remove** all `mapboxgl.Marker` DOM element creation (lines 96-182 current)
  6. **Keep** `flyTo` for `selectedListing` and `fitBounds` for "Fit All"
  7. **Update data** on listings change: `(map.getSource('listings') as GeoJSONSource).setData(listingsToGeoJSON(newListings))`

  Helper function:
  ```typescript
  function listingsToGeoJSON(listings: Listing[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: listings
        .filter(l => l.latitude && l.longitude)
        .map(l => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [l.longitude, l.latitude] },
          properties: {
            id: l.id,
            title: l.title,
            price: l.price,
            bedrooms: l.bedrooms,
            bathrooms: l.bathrooms,
            sqft: l.sqft,
            score: l.score ?? 0,
            imageUrl: l.imageUrl || l.photos?.[0] || '',
          },
        })),
    };
  }
  ```

- **Mirror**: Mapbox GL JS clustering example (built-in API); existing marker patterns at `components/map/MapboxMap.tsx:96-182`
- **Validate**: Visual test — map should show numbered cluster circles that expand on click. Individual markers should show popups on hover and trigger listing selection on click. `npm run build`

#### Task 5: Cluster Styling Refinement

- **File**: `components/map/MapboxMap.tsx`
- **Action**: UPDATE (within Task 4's new code)
- **Implement**:
  - Cluster circle sizes: `['step', ['get', 'point_count'], 20, 10, 30, 50, 40]` (20px for <10, 30px for <50, 40px for 50+)
  - Cluster colors: use score-based gradient or neutral dark theme colors to match `dark-v11` style
  - Unclustered point size: 12px circle with 2px white border, score-based fill color
  - Cursor: `pointer` on both clusters and points (`map.on('mouseenter', 'clusters', ...)`)
  - **Selected listing highlight**: when `selectedListing` changes, use a paint property filter or separate highlight layer
- **Mirror**: `components/map/MapboxMap.tsx:21-26` — existing `getScoreColor()` for color mapping
- **Validate**: Visual test + `npm run build`

---

### WS3: Expanded Filters

#### Task 6: Extend FilterValue Interface

- **File**: `components/listings/FilterChips.tsx`
- **Action**: UPDATE
- **Implement**: Add new fields to `FilterValue`:
  ```typescript
  export interface FilterValue {
    propertyType?: string[];
    neighborhood?: string[];
    priceRange?: { min: number; max: number };
    bedrooms?: number;
    bathrooms?: number;                              // NEW — pill buttons like bedrooms
    sqftRange?: { min: number; max: number };        // NEW — dual number inputs
    yearBuiltRange?: { min: number; max: number };   // NEW — dual number inputs
    dateListedAfter?: string;                        // NEW — ISO date string
    laundry?: string[];                              // NEW — checkbox multi-select
    furnished?: boolean;                             // NEW — toggle switch
    includeMissingSqft?: boolean;                    // NEW — companion toggle
    includeMissingYearBuilt?: boolean;               // NEW — companion toggle
    pets?: boolean;
    parking?: boolean;
  }
  ```
  Also add chip label generation for each new field in the `FilterChips` component body.
- **Mirror**: `components/listings/FilterChips.tsx:21-78` — follow existing chip generation pattern
- **Validate**: `npm run build`

#### Task 7: Add Bathrooms Filter (Pill Buttons)

- **File**: `components/SearchFilterPanel.tsx`
- **Action**: UPDATE
- **Implement**: Add bathrooms pill buttons directly below bedrooms. Use exact same pattern as `BEDROOM_OPTIONS`:
  ```typescript
  const BATHROOM_OPTIONS = [
    { label: 'Any', value: undefined as number | undefined },
    { label: '1+', value: 1 },
    { label: '2+', value: 2 },
    { label: '3+', value: 3 },
  ];
  ```
  Render identically to bedrooms pills (lines 219-236).
- **Mirror**: `components/SearchFilterPanel.tsx:16-22` (BEDROOM_OPTIONS) and `components/SearchFilterPanel.tsx:219-236` (bedrooms UI)
- **Validate**: `npm run build`

#### Task 8: Add Sqft Range Filter (Dual Inputs)

- **File**: `components/SearchFilterPanel.tsx`
- **Action**: UPDATE
- **Implement**: Add sqft range dual number inputs below bathrooms. Follow exact price range pattern:
  - Local state: `sqftMinInput`, `sqftMaxInput`
  - `applySqftRange()` function validates min < max, updates `filters.sqftRange`
  - Trigger on blur and Enter key
  - Display applied range with "Clear" button
  - Step: 100, placeholder "Min sqft" / "Max sqft"
  - Add companion "Include unknown sqft" toggle below (maps to `filters.includeMissingSqft`)
- **Mirror**: `components/SearchFilterPanel.tsx:170-217` (price range UI pattern)
- **Validate**: `npm run build`

#### Task 9: Add Year Built Range Filter (Dual Inputs)

- **File**: `components/SearchFilterPanel.tsx`
- **Action**: UPDATE
- **Implement**: Add year built range dual inputs. Same pattern as sqft range:
  - Local state: `yearMinInput`, `yearMaxInput`
  - Step: 1, placeholder "From year" / "To year"
  - Companion "Include unknown year" toggle (maps to `filters.includeMissingYearBuilt`)
- **Mirror**: `components/SearchFilterPanel.tsx:170-217` (price range UI)
- **Validate**: `npm run build`

#### Task 10: Add Date Listed Filter (Preset Buttons)

- **File**: `components/SearchFilterPanel.tsx`
- **Action**: UPDATE
- **Implement**: Add "Listed Within" section with preset pill buttons:
  ```typescript
  const DATE_LISTED_OPTIONS = [
    { label: 'Any', value: undefined as string | undefined },
    { label: '24h', value: daysAgo(1) },
    { label: '1 week', value: daysAgo(7) },
    { label: '2 weeks', value: daysAgo(14) },
    { label: '1 month', value: daysAgo(30) },
  ];
  // Helper:
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
  ```
  Use bedrooms pill button pattern. Maps to `filters.dateListedAfter`.
- **Mirror**: `components/SearchFilterPanel.tsx:219-236` (pill button pattern)
- **Validate**: `npm run build`

#### Task 11: Add Laundry and Furnished Filters

- **File**: `components/SearchFilterPanel.tsx`
- **Action**: UPDATE
- **Implement**:
  - **Laundry** — checkbox multi-select (like property type):
    ```typescript
    const LAUNDRY_OPTIONS = ['in_unit', 'shared', 'hookups', 'included_appliances', 'none'];
    const LAUNDRY_LABELS: Record<string, string> = {
      in_unit: 'In Unit', shared: 'Shared', hookups: 'Hookups',
      included_appliances: 'Included Appliances', none: 'None',
    };
    ```
    Toggle handler mirrors `togglePropertyType()`.
  - **Furnished** — toggle switch (same as pet-friendly pattern). Maps to `filters.furnished`.
- **Mirror**: `components/SearchFilterPanel.tsx:238-256` (checkboxes) and `components/SearchFilterPanel.tsx:288-332` (toggle)
- **Validate**: `npm run build`

#### Task 12: Wire New Filters to API

- **File 1**: `components/MapListingsPanel.tsx`
- **Action**: UPDATE
- **Implement**: In `fetchListings()`, add URL param mapping for new filters:
  ```typescript
  if (filters.bathrooms !== undefined)
    params.set('min_bathrooms', filters.bathrooms.toString());
  if (filters.sqftRange) {
    params.set('min_sqft', filters.sqftRange.min.toString());
    params.set('max_sqft', filters.sqftRange.max.toString());
  }
  if (filters.includeMissingSqft)
    params.set('include_missing_sqft', 'true');
  if (filters.yearBuiltRange) {
    params.set('min_year', filters.yearBuiltRange.min.toString());
    params.set('max_year', filters.yearBuiltRange.max.toString());
  }
  if (filters.includeMissingYearBuilt)
    params.set('include_missing_year', 'true');
  if (filters.dateListedAfter)
    params.set('listed_after', filters.dateListedAfter);
  if (filters.laundry && filters.laundry.length > 0)
    params.set('laundry', filters.laundry.join(','));
  if (filters.furnished !== undefined)
    params.set('furnished', filters.furnished.toString());
  ```
- **Mirror**: `components/MapListingsPanel.tsx:72-91` — existing param mapping

- **File 2**: `app/api/listings/route.ts`
- **Action**: UPDATE
- **Implement**: Parse new URL params and add Supabase query clauses:
  ```typescript
  const min_sqft = searchParams.get('min_sqft');
  const max_sqft = searchParams.get('max_sqft');
  const include_missing_sqft = searchParams.get('include_missing_sqft');
  const min_year = searchParams.get('min_year');
  const max_year = searchParams.get('max_year');
  const include_missing_year = searchParams.get('include_missing_year');
  const listed_after = searchParams.get('listed_after');
  const laundry = searchParams.get('laundry');
  const furnished = searchParams.get('furnished');
  const min_bathrooms = searchParams.get('min_bathrooms');

  // Sqft range (with "include missing" support)
  if (min_sqft || max_sqft) {
    if (include_missing_sqft === 'true') {
      // OR: sqft in range OR sqft is null
      const conditions: string[] = [];
      if (min_sqft) conditions.push(`square_feet.gte.${min_sqft}`);
      if (max_sqft) conditions.push(`square_feet.lte.${max_sqft}`);
      query = query.or(`and(${conditions.join(',')}),square_feet.is.null`);
    } else {
      if (min_sqft) query = query.gte('square_feet', parseInt(min_sqft, 10));
      if (max_sqft) query = query.lte('square_feet', parseInt(max_sqft, 10));
    }
  }

  // Year built range
  if (min_year || max_year) {
    if (include_missing_year === 'true') {
      const conditions: string[] = [];
      if (min_year) conditions.push(`year_built.gte.${min_year}`);
      if (max_year) conditions.push(`year_built.lte.${max_year}`);
      query = query.or(`and(${conditions.join(',')}),year_built.is.null`);
    } else {
      if (min_year) query = query.gte('year_built', parseInt(min_year, 10));
      if (max_year) query = query.lte('year_built', parseInt(max_year, 10));
    }
  }

  // Date listed (listed_date or created_at fallback)
  if (listed_after) {
    query = query.gte('listed_date', listed_after);
  }

  // Bathrooms (min threshold)
  if (min_bathrooms) {
    query = query.gte('bathrooms', parseInt(min_bathrooms, 10));
  }

  // Laundry category
  if (laundry) {
    const categories = laundry.split(',').map(s => s.trim()).filter(Boolean);
    if (categories.length === 1) {
      query = query.eq('laundry_category', categories[0]);
    } else if (categories.length > 1) {
      query = query.in('laundry_category', categories);
    }
  }

  // Furnished
  if (furnished === 'true') {
    query = query.eq('furnished', true);
  }
  ```
- **Mirror**: `app/api/listings/route.ts:35-73` — existing query builder pattern
- **Validate**: `npm run build`

---

### WS4: Data Enrichment (Noise + ISP)

#### Task 13: Create Laundry Normalization Module

- **File**: `lib/crawl/normalize-laundry.ts`
- **Action**: CREATE
- **Implement**:
  ```typescript
  export type LaundryCategory = 'in_unit' | 'shared' | 'hookups' | 'included_appliances' | 'none' | 'unknown';

  const LAUNDRY_PATTERNS: Array<{ pattern: RegExp; category: LaundryCategory }> = [
    { pattern: /in[- ]?unit|in[- ]?home|washer.*dryer.*in|w\/d in/i, category: 'in_unit' },
    { pattern: /shared|community|common|on[- ]?site/i, category: 'shared' },
    { pattern: /hookup|hook[- ]?up|connection/i, category: 'hookups' },
    { pattern: /included|provided|comes with/i, category: 'included_appliances' },
    { pattern: /no laundry|none|not available/i, category: 'none' },
  ];

  export function normalizeLaundryCategory(amenities: string[], description?: string | null): LaundryCategory {
    // Check amenities array first, then description text
    // Return 'unknown' if no match
  }
  ```
- **Mirror**: `lib/crawl/normalize.ts:190-209` — amenity normalization pattern
- **Validate**: `npm run build`

#### Task 14: Update Crawl Pipeline for New Fields

- **File 1**: `lib/crawl/types.ts`
- **Action**: UPDATE
- **Implement**: Add to `RawListing`:
  ```typescript
  yearBuilt: number | null;
  laundryText: string | null;  // Raw laundry string for normalization
  listedDate: string | null;   // ISO date string
  ```
  Add to `NormalizedListing`:
  ```typescript
  year_built: number | null;
  laundry_category: string | null;
  listed_date: string | null;
  ```
- **Mirror**: `lib/crawl/types.ts:1-136` — existing field patterns

- **File 2**: `lib/crawl/adapters/realty-in-us.ts`
- **Action**: UPDATE
- **Implement**: Extract `year_built` from API response `description.year_built` (field is available at line 118 response structure but not currently extracted). Map it to `rawListing.yearBuilt`.
- **Mirror**: `lib/crawl/adapters/realty-in-us.ts:370-390` — existing field extraction

- **File 3**: `lib/crawl/normalize.ts`
- **Action**: UPDATE
- **Implement**: In `normalizeRawListing()`, add:
  ```typescript
  import { normalizeLaundryCategory } from './normalize-laundry';
  // ...
  year_built: raw.yearBuilt,
  laundry_category: normalizeLaundryCategory(raw.amenities, raw.description),
  listed_date: raw.listedDate,
  ```
- **Mirror**: `lib/crawl/normalize.ts:213-262` — existing normalization function

- **Validate**: `npm run build`

#### Task 15: Create HowLoud API Service

- **File**: `lib/services/howloud.ts`
- **Action**: CREATE
- **Implement**:
  ```typescript
  interface NoiseData {
    score: number;           // 0-100 (higher = quieter)
    traffic: number;
    airports: number;
    local: number;
    text: string;            // 'Quiet', 'Moderate', 'Noisy', etc.
  }

  export async function fetchNoiseScore(lat: number, lon: number): Promise<NoiseData | null> {
    // GET https://howloud.com/api/scores?lat={lat}&lng={lon}
    // Parse response, return null on error
    // Rate limit: respect API limits with delay
  }
  ```
  **Note**: HowLoud API may require an API key. Check their docs. If free tier doesn't exist, gate behind `HOWLOUD_API_KEY` env var.
- **Mirror**: `lib/services/resend.ts` — existing service pattern (export async function, env var check, error handling)
- **Validate**: `npm run build`

#### Task 16: Create CPUC Broadband Service

- **File**: `lib/services/cpuc-broadband.ts`
- **Action**: CREATE
- **Implement**:
  ```typescript
  interface BroadbandData {
    downloadMbps: number;
    uploadMbps: number;
  }

  export async function fetchBroadbandSpeed(lat: number, lon: number): Promise<BroadbandData | null> {
    // Query CPUC ArcGIS endpoint:
    // https://cpuc2016.westus.cloudapp.azure.com/arcgis/rest/services/CPUC/CPUC_EOY_2023_Provider_Identify/MapServer/0/query
    // Parameters: geometry={lon},{lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects
    //             &outFields=DBA_Name,MaxAdDown,MaxAdUp&f=json
    // Parse results, return best download/upload speeds across all providers
  }
  ```
- **Mirror**: `lib/services/howloud.ts` (Task 15 pattern)
- **Validate**: `npm run build`

---

### WS5: Detail & Card Enhancements

#### Task 17: Integrate Enrichment in Detail API

- **File**: `app/api/listings/[id]/route.ts`
- **Action**: UPDATE
- **Implement**: After existing Realty in US enrichment (lines 32-95), add noise + ISP enrichment:
  ```typescript
  // Enrich noise score if missing
  if (listing.noise_score === null && listing.latitude && listing.longitude) {
    const noiseData = await fetchNoiseScore(listing.latitude, listing.longitude);
    if (noiseData) {
      await adminClient.from('properties').update({
        noise_score: noiseData.score,
        noise_traffic: noiseData.traffic,
        noise_airports: noiseData.airports,
        noise_local: noiseData.local,
        noise_text: noiseData.text,
      }).eq('id', listing.id);
      // Merge into response
      listing = { ...listing, ...noiseData fields };
    }
  }

  // Enrich ISP speed if missing
  if (listing.isp_download_mbps === null && listing.latitude && listing.longitude) {
    const broadband = await fetchBroadbandSpeed(listing.latitude, listing.longitude);
    if (broadband) {
      await adminClient.from('properties').update({
        isp_download_mbps: broadband.downloadMbps,
        isp_upload_mbps: broadband.uploadMbps,
      }).eq('id', listing.id);
      listing = { ...listing, isp_download_mbps: broadband.downloadMbps, isp_upload_mbps: broadband.uploadMbps };
    }
  }
  ```
- **Mirror**: `app/api/listings/[id]/route.ts:32-95` — existing on-demand enrichment pattern (null check → fetch → store → merge)
- **Validate**: `npm run build`

#### Task 18: Add New Sections to DetailPanel

- **File**: `components/DetailPanel.tsx`
- **Action**: UPDATE
- **Implement**: Add new sections after the existing amenities section:

  **Livability Scores Section** (noise + ISP):
  ```
  ┌─────────────────────────────────────────┐
  │ Livability                              │
  ├──────────────┬──────────────────────────┤
  │ Noise Level  │ 72/100 (Moderate)   🔇   │
  │ Internet     │ ↓ 940 Mbps ↑ 35 Mbps    │
  ├──────────────┴──────────────────────────┤
  │ Year Built: 1985 | Laundry: In Unit     │
  └─────────────────────────────────────────┘
  ```

  - Noise: Score badge (green ≥70, yellow 40-69, red <40) + text category
  - ISP: Download/upload speeds with arrow icons
  - Year Built: Simple text display
  - Laundry: Capitalized category with icon

  Use existing grid pattern from lines 365-413. Conditional rendering — only show if data exists or is being enriched (show spinner while loading).

- **Mirror**: `components/DetailPanel.tsx:365-413` (key details grid) and `components/DetailPanel.tsx:415-442` (pet/parking badges)
- **Validate**: Visual test + `npm run build`

#### Task 19: Surface Key Data on ListingCard

- **File**: `components/listings/ListingCard.tsx`
- **Action**: UPDATE
- **Implement**: Add optional badges/indicators below the beds/baths/sqft row:
  - If `year_built` exists: small text "Built {year}"
  - If `laundry_category === 'in_unit'`: small badge "W/D"
  - Keep it minimal — 1 line max, muted foreground text

  Only add if data is present (conditional rendering). Don't clutter the card.
- **Mirror**: `components/listings/ListingCard.tsx:86-99` (existing detail row pattern)
- **Validate**: Visual test + `npm run build`

---

### WS6: User Reporting

#### Task 20: Create Report API Endpoint

- **File**: `app/api/listings/[id]/report/route.ts`
- **Action**: CREATE
- **Implement**:
  ```typescript
  export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { reason } = body; // 'rented', 'sold', 'unavailable', 'incorrect'

    const { error } = await supabase
      .from('properties')
      .update({
        reported_as_inactive: true,
        reported_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  ```
- **Mirror**: `app/api/listings/[id]/route.ts` — existing dynamic route pattern (params typed as `Promise<{ id: string }>` for Next.js 15+)
- **Validate**: `npm run build`

#### Task 21: Add Report Button to DetailPanel

- **File**: `components/DetailPanel.tsx`
- **Action**: UPDATE
- **Implement**: Add "Report Listing" button near the action buttons section (lines 541-613). On click:
  1. Show a small dropdown/dialog with reason options: Rented, Sold, Unavailable, Incorrect Info
  2. POST to `/api/listings/{id}/report` with selected reason
  3. Show success toast/confirmation
  4. Optionally dim the listing card to indicate reported status
- **Mirror**: `components/DetailPanel.tsx:541-613` (action button pattern) — use same Button component and layout
- **Validate**: Visual test + `npm run build`

---

## Validation

```bash
# Type check (catches all interface mismatches)
npm run build

# Lint
npm run lint

# Visual testing checklist (manual on localhost:3000/dashboard)
# - [ ] Map shows cluster circles that expand on click
# - [ ] Individual markers show popup on hover
# - [ ] New filter controls render in SearchFilterPanel
# - [ ] Filters update listings in real-time
# - [ ] "Include missing" toggles work correctly
# - [ ] DetailPanel shows noise/ISP/year/laundry sections
# - [ ] Report button triggers API call
# - [ ] Filter chips show labels for all new filters
```

---

## Acceptance Criteria

- [ ] DB migration adds all new columns with proper indexes
- [ ] `FilterValue` extended with 8 new fields
- [ ] SearchFilterPanel renders all new filter controls
- [ ] API route handles all new filter params with correct Supabase queries
- [ ] "Include missing" toggles use `.or()` to include NULL values
- [ ] MapboxMap uses native Mapbox clustering (no DOM markers)
- [ ] Cluster click expands to show individual listings
- [ ] HowLoud API service created and wired to detail enrichment
- [ ] CPUC broadband service created and wired to detail enrichment
- [ ] DetailPanel shows livability section (noise, ISP, year built, laundry)
- [ ] ListingCard shows year built and laundry badge when available
- [ ] Report endpoint stores user reports
- [ ] Report button available on property detail page
- [ ] Crawl pipeline extracts year_built from Realty in US
- [ ] Laundry normalization categorizes amenity strings
- [ ] All tasks pass `npm run build` and `npm run lint`
- [ ] No TypeScript errors after all changes

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| HowLoud API may require paid plan or be unavailable | Gate behind `HOWLOUD_API_KEY` env var. If API unavailable, noise section simply doesn't render. No blocking dependency. |
| CPUC ArcGIS endpoint may be slow or rate-limited | Cache results in DB (only fetch once per property). Timeout after 5s and fail gracefully. |
| Migration could fail on production Supabase | All columns use `ADD COLUMN IF NOT EXISTS`. No destructive changes. Test on dev project first. |
| Cluster rewrite breaks existing map interactions | Keep `selectedListing` flyTo behavior. Test click/hover on both clusters and individual points. Fallback: revert to DOM markers if layer approach has issues. |
| "Include missing" OR queries may be slow | New indexes on `year_built` and `square_feet` columns help. Monitor query plans. |
| Database types file goes out of sync | After migration, regenerate types with `npx supabase gen types typescript` or manually update to match. |
