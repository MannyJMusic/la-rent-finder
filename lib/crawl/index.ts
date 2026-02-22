export { crawlEngine } from './engine';
export { normalizeRawListing } from './normalize';
export { findDuplicates, mergeWithExisting, persistNewListing } from './dedup';
export { markStaleListings, purgeExpiredListings, getLifecycleStats } from './lifecycle';
export { zillowAdapter } from './adapters/zillow';
export { apartmentsComAdapter } from './adapters/apartments-com';
export { rentComAdapter } from './adapters/rent-com';
export { allAdapters } from './adapters/base';
export type {
  SourceAdapter,
  RawListing,
  NormalizedListing,
  CrawlSearchParams,
  CrawlResult,
  CrawlResult as CrawlRunResult,
  DeduplicationResult,
  DuplicateMatch,
  SourceAdapterConfig,
  ApiSourceAdapter,
  ApiSourceResult,
  SyncSummary,
} from './types';
export { ApiSyncEngine, apiSyncEngine } from './sync-engine';
export { ApiClient } from './api-client';
export { apiAdapters } from './adapters/index';
