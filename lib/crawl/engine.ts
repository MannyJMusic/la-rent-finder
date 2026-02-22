import Firecrawl from '@mendable/firecrawl-js';
import type {
  SourceAdapter,
  CrawlSearchParams,
  CrawlResult,
  RawListing,
} from './types';

class CrawlEngine {
  private firecrawl: Firecrawl;
  private rateLimiters: Map<string, { lastRequest: number; minDelay: number }>;

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY environment variable is required');
    this.firecrawl = new Firecrawl({ apiKey });
    this.rateLimiters = new Map();
  }

  async crawlSearchResults(
    adapter: SourceAdapter,
    params: CrawlSearchParams,
  ): Promise<CrawlResult> {
    const startedAt = new Date().toISOString();
    const allListings: RawListing[] = [];
    const errors: string[] = [];

    const urls = adapter.buildSearchUrls(params);

    for (const url of urls) {
      try {
        await this.rateLimit(adapter.config.name, adapter.config.delayBetweenRequests);
        const markdown = await this.crawlListingPage(url);
        const listings = adapter.extractListings(markdown, url);
        allListings.push(...listings);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[CrawlEngine] Error crawling ${url}:`, message);
        errors.push(`Failed to crawl ${url}: ${message}`);
      }
    }

    return {
      source: adapter.config.name,
      params,
      listings: allListings,
      startedAt,
      completedAt: new Date().toISOString(),
      errors,
    };
  }

  async crawlListingPage(url: string): Promise<string> {
    const doc = await this.firecrawl.scrape(url, {
      formats: ['markdown'],
    });

    return doc.markdown ?? '';
  }

  private async rateLimit(adapterName: string, delayMs: number): Promise<void> {
    const limiter = this.rateLimiters.get(adapterName);
    const now = Date.now();

    if (limiter) {
      const elapsed = now - limiter.lastRequest;
      if (elapsed < limiter.minDelay) {
        await new Promise((resolve) => setTimeout(resolve, limiter.minDelay - elapsed));
      }
      limiter.lastRequest = Date.now();
    } else {
      this.rateLimiters.set(adapterName, {
        lastRequest: now,
        minDelay: delayMs,
      });
    }
  }
}

export const crawlEngine = new CrawlEngine();
