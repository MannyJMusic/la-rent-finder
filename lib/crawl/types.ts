import type { PropertyType } from '@/lib/database.types';

// ─── Crawl Search Parameters ────────────────────────────────────

export interface CrawlSearchParams {
  neighborhoods?: string[];
  propertyTypes?: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
}

// ─── Raw Listing (before normalization) ─────────────────────────

export interface RawListing {
  sourceId: string | null;
  sourceName: string;
  sourceUrl: string;
  title: string;
  address: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  description: string | null;
  photos: string[];
  amenities: string[];
  petPolicy: string | null;
  parking: string | null;
  availableDate: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyType: string | null;
  rawData?: Record<string, unknown>;
  crawledAt: string;
}

// ─── Normalized Listing (ready for DB insert) ───────────────────

export interface NormalizedListing {
  title: string;
  description: string | null;
  address: string;
  location: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  amenities: string[];
  photos: string[];
  pet_policy: string | null;
  parking_available: boolean;
  available_date: string | null;
  listing_url: string | null;
  property_type: PropertyType;
  source_id: string | null;
  source_name: string;
  source_url: string;
  last_crawled_at: string;
  is_active: boolean;
  raw_data: Record<string, unknown> | null;
}

// ─── Crawl Result ───────────────────────────────────────────────

export interface CrawlResult {
  source: string;
  params: CrawlSearchParams;
  listings: RawListing[];
  startedAt: string;
  completedAt: string;
  errors: string[];
}

// ─── Source Adapter Configuration ───────────────────────────────

export interface SourceAdapterConfig {
  name: string;
  baseUrl: string;
  reliability: number;
  requestsPerMinute: number;
  delayBetweenRequests: number;
}

// ─── Source Adapter Interface ───────────────────────────────────

export interface SourceAdapter {
  config: SourceAdapterConfig;
  buildSearchUrls(params: CrawlSearchParams): string[];
  extractListings(markdown: string, url: string): RawListing[];
}

// ─── Deduplication Result ───────────────────────────────────────

export interface DuplicateMatch {
  existing: string;
  incoming: NormalizedListing;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface DeduplicationResult {
  unique: NormalizedListing[];
  duplicates: DuplicateMatch[];
}

// ─── API Source Adapter (structured JSON APIs) ──────────────────

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

// ─── Sync Summary ──────────────────────────────────────────────

export interface SyncSummary {
  results: CrawlResult[];
  totalListings: number;
  errors: string[];
  sourcesAttempted: number;
  sourcesSucceeded: number;
  startedAt: string;
  completedAt: string;
}
