import type {
  ApiSourceAdapter,
  SourceAdapterConfig,
  CrawlSearchParams,
  RawListing,
  ApiSourceResult,
} from '../types';
import { ApiClient } from '../api-client';

// ─── Neighborhood-to-Coordinates Mapping (LA) ──────────────────

const LA_NEIGHBORHOOD_COORDS: Record<string, { lat: number; lon: number }> = {
  'silver lake': { lat: 34.0869, lon: -118.2702 },
  'echo park': { lat: 34.0781, lon: -118.2606 },
  'los feliz': { lat: 34.1083, lon: -118.2881 },
  'hollywood': { lat: 34.0928, lon: -118.3287 },
  'east hollywood': { lat: 34.0917, lon: -118.2948 },
  'west hollywood': { lat: 34.0900, lon: -118.3617 },
  'santa monica': { lat: 34.0195, lon: -118.4912 },
  'venice': { lat: 33.9850, lon: -118.4695 },
  'culver city': { lat: 34.0211, lon: -118.3965 },
  'downtown': { lat: 34.0407, lon: -118.2468 },
  'koreatown': { lat: 34.0578, lon: -118.3005 },
  'mar vista': { lat: 34.0026, lon: -118.4280 },
  'westwood': { lat: 34.0590, lon: -118.4452 },
  'brentwood': { lat: 34.0594, lon: -118.4766 },
  'sherman oaks': { lat: 34.1508, lon: -118.4490 },
  'studio city': { lat: 34.1486, lon: -118.3965 },
  'north hollywood': { lat: 34.1870, lon: -118.3813 },
  'burbank': { lat: 34.1808, lon: -118.3090 },
  'glendale': { lat: 34.1425, lon: -118.2551 },
  'pasadena': { lat: 34.1478, lon: -118.1445 },
  'eagle rock': { lat: 34.1364, lon: -118.2144 },
  'highland park': { lat: 34.1117, lon: -118.1920 },
  'atwater village': { lat: 34.1170, lon: -118.2592 },
  'manhattan beach': { lat: 33.8847, lon: -118.4109 },
  'hermosa beach': { lat: 33.8622, lon: -118.3995 },
  'redondo beach': { lat: 33.8492, lon: -118.3884 },
  'long beach': { lat: 33.7701, lon: -118.1937 },
};

// Default radius in miles for neighborhood searches
const DEFAULT_RADIUS_MILES = 3;

// ─── Response Types (RentCast API) ──────────────────────────────

interface RentCastListing {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  propertyType?: string;
  listingType?: string;
  listedDate?: string;
  latitude?: number;
  longitude?: number;
  daysOnMarket?: number;
}

// ─── Adapter ────────────────────────────────────────────────────

class RentCastAdapter implements ApiSourceAdapter {
  config: SourceAdapterConfig = {
    name: 'rentcast',
    baseUrl: 'https://api.rentcast.io/v1',
    reliability: 90,
    requestsPerMinute: 5,
    delayBetweenRequests: 12000,
  };

  isConfigured(): boolean {
    return Boolean(process.env.RENTCAST_API_KEY);
  }

  async fetchListings(params: CrawlSearchParams): Promise<ApiSourceResult> {
    const errors: string[] = [];
    const allListings: RawListing[] = [];

    if (!this.isConfigured()) {
      errors.push('RENTCAST_API_KEY is not configured');
      return { listings: [], errors };
    }

    const client = new ApiClient();

    // Determine search targets — coordinate-based for neighborhoods, city-wide otherwise
    const targets = this.buildSearchTargets(params);

    let rateLimitRemaining: number | undefined;
    let rateLimitReset: string | undefined;

    for (const target of targets) {
      try {
        const searchParams = new URLSearchParams({
          limit: '500',
        });

        if (target.type === 'coordinates') {
          searchParams.set('latitude', String(target.lat));
          searchParams.set('longitude', String(target.lon));
          searchParams.set('radius', String(DEFAULT_RADIUS_MILES));
        } else {
          searchParams.set('city', 'Los Angeles');
          searchParams.set('state', 'CA');
        }

        if (params.minPrice !== undefined) {
          searchParams.set('priceMin', String(params.minPrice));
        }
        if (params.maxPrice !== undefined) {
          searchParams.set('priceMax', String(params.maxPrice));
        }
        if (params.minBedrooms !== undefined) {
          searchParams.set('bedrooms', String(params.minBedrooms));
        }

        const url = `${this.config.baseUrl}/listings/rental/long-term?${searchParams.toString()}`;

        const response = await client.fetchJson<RentCastListing[]>(url, {
          headers: {
            'X-Api-Key': process.env.RENTCAST_API_KEY!,
            Accept: 'application/json',
          },
          adapterName: 'RentCast',
          delayBetweenRequests: this.config.delayBetweenRequests,
        });

        if (response.rateLimitRemaining !== undefined) {
          rateLimitRemaining = response.rateLimitRemaining;
          if (response.rateLimitRemaining < 10) {
            console.warn(
              `[RentCast] Low API budget: ${response.rateLimitRemaining} calls remaining`,
            );
          }
        }
        if (response.rateLimitReset) {
          rateLimitReset = response.rateLimitReset;
        }

        const results = Array.isArray(response.data) ? response.data : [];
        const listings = this.transformResults(results);
        allListings.push(...listings);

        const label = target.type === 'coordinates' ? target.name : 'city-wide';
        console.log(`[RentCast] Fetched ${results.length} results (${label})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const label = target.type === 'coordinates' ? target.name : 'city-wide';
        console.error(`[RentCast] Failed to fetch (${label}):`, message);
        errors.push(`Failed to fetch listings (${label}): ${message}`);
      }
    }

    return {
      listings: allListings,
      errors,
      rateLimitRemaining,
      rateLimitReset,
    };
  }

  private buildSearchTargets(
    params: CrawlSearchParams,
  ): Array<
    | { type: 'coordinates'; name: string; lat: number; lon: number }
    | { type: 'city' }
  > {
    if (!params.neighborhoods?.length) {
      return [{ type: 'city' }];
    }

    const targets: Array<
      | { type: 'coordinates'; name: string; lat: number; lon: number }
      | { type: 'city' }
    > = [];

    for (const name of params.neighborhoods) {
      const key = name.toLowerCase().trim();
      const coords = LA_NEIGHBORHOOD_COORDS[key];
      if (coords) {
        targets.push({ type: 'coordinates', name: key, lat: coords.lat, lon: coords.lon });
      } else {
        console.warn(`[RentCast] No coordinates for neighborhood: ${name}`);
      }
    }

    // Fall back to city-wide if no neighborhoods matched
    if (targets.length === 0) {
      return [{ type: 'city' }];
    }

    return targets;
  }

  private transformResults(results: RentCastListing[]): RawListing[] {
    const now = new Date().toISOString();
    const listings: RawListing[] = [];

    for (const result of results) {
      try {
        const addressParts = [
          result.addressLine1,
          result.city,
          result.state,
          result.zipCode,
        ].filter(Boolean);

        const listing: RawListing = {
          sourceId: result.id ?? null,
          sourceName: 'rentcast',
          sourceUrl: `https://app.rentcast.io/listing/${result.id ?? ''}`,
          title: result.formattedAddress ?? result.addressLine1 ?? 'RentCast Listing',
          address: addressParts.length > 0 ? addressParts.join(', ') : null,
          price: result.price ?? null,
          bedrooms: result.bedrooms ?? null,
          bathrooms: result.bathrooms ?? null,
          sqft: result.squareFootage ?? null,
          description: null,
          photos: [],
          amenities: [],
          petPolicy: null,
          parking: null,
          availableDate: result.listedDate ?? null,
          latitude: result.latitude ?? null,
          longitude: result.longitude ?? null,
          propertyType: result.propertyType ?? null,
          rawData: result as unknown as Record<string, unknown>,
          crawledAt: now,
        };

        listings.push(listing);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[RentCast] Failed to transform result:', message);
      }
    }

    return listings;
  }
}

export const rentcastAdapter = new RentCastAdapter();
