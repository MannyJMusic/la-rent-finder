import type {
  ApiSourceAdapter,
  CrawlSearchParams,
  CrawlResult,
  SyncSummary,
} from './types';

export class ApiSyncEngine {
  async syncFromApi(
    adapter: ApiSourceAdapter,
    params: CrawlSearchParams,
  ): Promise<CrawlResult> {
    const startedAt = new Date().toISOString();

    if (!adapter.isConfigured()) {
      console.warn(
        `[ApiSyncEngine] Skipping ${adapter.config.name} — not configured`,
      );
      return {
        source: adapter.config.name,
        params,
        listings: [],
        startedAt,
        completedAt: new Date().toISOString(),
        errors: [`${adapter.config.name} is not configured`],
      };
    }

    try {
      const result = await adapter.fetchListings(params);

      console.log(
        `[ApiSyncEngine] ${adapter.config.name}: ${result.listings.length} listings, ${result.errors.length} errors`,
      );

      return {
        source: adapter.config.name,
        params,
        listings: result.listings,
        startedAt,
        completedAt: new Date().toISOString(),
        errors: result.errors,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[ApiSyncEngine] ${adapter.config.name} failed:`,
        message,
      );
      return {
        source: adapter.config.name,
        params,
        listings: [],
        startedAt,
        completedAt: new Date().toISOString(),
        errors: [`${adapter.config.name}: ${message}`],
      };
    }
  }

  async syncAllApis(params: CrawlSearchParams): Promise<SyncSummary> {
    const startedAt = new Date().toISOString();
    const results: CrawlResult[] = [];
    const allErrors: string[] = [];
    let sourcesSucceeded = 0;

    const { apiAdapters } = await import('./adapters/index');

    for (const adapter of apiAdapters) {
      const result = await this.syncFromApi(adapter, params);
      results.push(result);

      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      }
      if (result.listings.length > 0) {
        sourcesSucceeded++;
      }
    }

    const totalListings = results.reduce(
      (sum, r) => sum + r.listings.length,
      0,
    );

    console.log(
      `[ApiSyncEngine] Sync complete: ${totalListings} listings from ${sourcesSucceeded}/${apiAdapters.length} sources`,
    );

    return {
      results,
      totalListings,
      errors: allErrors,
      sourcesAttempted: apiAdapters.length,
      sourcesSucceeded,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}

export const apiSyncEngine = new ApiSyncEngine();
