// ─── Generic API Client with Rate Limiting & Retries ──────────

interface ApiClientOptions {
  defaultTimeout?: number;
  maxRetries?: number;
}

interface FetchJsonOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  adapterName?: string;
  delayBetweenRequests?: number;
}

interface FetchJsonResult<T> {
  data: T;
  rateLimitRemaining?: number;
  rateLimitReset?: string;
}

export class ApiClient {
  private defaultTimeout: number;
  private maxRetries: number;
  private rateLimiters: Map<string, { lastRequest: number; minDelay: number }>;

  constructor(options?: ApiClientOptions) {
    this.defaultTimeout = options?.defaultTimeout ?? 30000;
    this.maxRetries = options?.maxRetries ?? 2;
    this.rateLimiters = new Map();
  }

  async fetchJson<T>(
    url: string,
    options?: FetchJsonOptions,
  ): Promise<FetchJsonResult<T>> {
    const adapterName = options?.adapterName;
    const delayMs = options?.delayBetweenRequests;

    // Per-adapter rate limiting
    if (adapterName && delayMs) {
      await this.rateLimit(adapterName, delayMs);
    }

    return this.fetchWithRetry<T>(url, options, this.maxRetries);
  }

  private async fetchWithRetry<T>(
    url: string,
    options: FetchJsonOptions | undefined,
    retriesLeft: number,
  ): Promise<FetchJsonResult<T>> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: options?.method ?? 'GET',
        headers: options?.headers,
        signal: controller.signal,
      };

      if (options?.body) {
        fetchOptions.body = JSON.stringify(options.body);
        fetchOptions.headers = {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        };
      }

      console.log(`[ApiClient] ${fetchOptions.method} ${url}`);

      const response = await fetch(url, fetchOptions);

      // Read rate limit headers
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      if (!response.ok) {
        // Retry on 429 (rate limit) or 5xx (server error)
        if (retriesLeft > 0 && (response.status === 429 || response.status >= 500)) {
          const delay = Math.pow(2, this.maxRetries - retriesLeft) * 1000;
          console.warn(
            `[ApiClient] ${response.status} from ${url}, retrying in ${delay}ms (${retriesLeft} retries left)`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.fetchWithRetry<T>(url, options, retriesLeft - 1);
        }

        const body = await response.text().catch(() => '');
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ''}`,
        );
      }

      const data = (await response.json()) as T;

      if (rateLimitRemaining !== null) {
        const remaining = parseInt(rateLimitRemaining, 10);
        if (remaining < 10) {
          console.warn(
            `[ApiClient] Low rate limit for ${url}: ${remaining} requests remaining`,
          );
        }
      }

      return {
        data,
        rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : undefined,
        rateLimitReset: rateLimitReset ?? undefined,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`[ApiClient] Request to ${url} timed out after ${timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
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
