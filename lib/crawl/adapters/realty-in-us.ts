import type {
  ApiSourceAdapter,
  SourceAdapterConfig,
  CrawlSearchParams,
  RawListing,
  ApiSourceResult,
} from '../types';
import { ApiClient } from '../api-client';

// Upscale rdcpix.com thumbnail URLs from small (s.jpg) to large (l.jpg)
function upscalePhotoUrl(url: string): string {
  return url.replace(/s(\.\w+)$/, 'l$1');
}

// ─── Neighborhood-to-Zip Mapping (LA) ──────────────────────────

const LA_NEIGHBORHOOD_ZIPS: Record<string, string[]> = {
  'silver lake': ['90026', '90039'],
  'echo park': ['90026'],
  'los feliz': ['90027'],
  'hollywood': ['90028', '90038'],
  'east hollywood': ['90027', '90029'],
  'west hollywood': ['90046', '90048', '90069'],
  'santa monica': ['90401', '90402', '90403', '90404', '90405'],
  'venice': ['90291'],
  'culver city': ['90230', '90232'],
  'downtown': ['90012', '90013', '90014', '90015', '90017', '90021'],
  'koreatown': ['90004', '90005', '90006', '90020'],
  'mar vista': ['90066'],
  'westwood': ['90024', '90025'],
  'brentwood': ['90049'],
  'sherman oaks': ['91403', '91423'],
  'studio city': ['91604'],
  'north hollywood': ['91601', '91602', '91606'],
  'burbank': ['91501', '91502', '91504', '91505', '91506'],
  'glendale': ['91201', '91202', '91203', '91204', '91205', '91206'],
  'pasadena': ['91101', '91103', '91104', '91105', '91106', '91107'],
  'eagle rock': ['90041'],
  'highland park': ['90042'],
  'atwater village': ['90039'],
  'manhattan beach': ['90266'],
  'hermosa beach': ['90254'],
  'redondo beach': ['90277', '90278'],
  'long beach': [
    '90802', '90803', '90804', '90806', '90807', '90808',
    '90813', '90814', '90815',
  ],
};

function getZipsForNeighborhoods(neighborhoods: string[]): string[] {
  const zips = new Set<string>();
  for (const name of neighborhoods) {
    const key = name.toLowerCase().trim();
    const matched = LA_NEIGHBORHOOD_ZIPS[key];
    if (matched) {
      for (const z of matched) zips.add(z);
    }
  }
  return [...zips];
}

// ─── Response Types (RapidAPI Realty in US) ─────────────────────

interface RealtyPhoto {
  href?: string;
}

interface RealtyResult {
  property_id?: string;
  href?: string;
  photo_count?: number;
  primary_photo?: RealtyPhoto;
  location?: {
    address?: {
      line?: string;
      city?: string;
      state_code?: string;
      postal_code?: string;
      coordinate?: {
        lat?: number;
        lon?: number;
      };
    };
  };
  list_price?: number;
  list_price_min?: number;
  list_price_max?: number;
  description?: {
    beds?: number;
    baths?: number;
    sqft?: number;
    type?: string;
    text?: string;
  };
  pet_policy?: unknown;
  photos?: RealtyPhoto[];
}

interface RealtyApiResponse {
  data?: {
    home_search?: {
      results?: RealtyResult[];
      total?: number;
    };
  };
}

// ─── Detail Response Types ───────────────────────────────────────

interface RealtyDetailResult {
  property_id?: string;
  description?: {
    text?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    type?: string;
    year_built?: number;
    name?: string;
  };
  details?: Array<{
    category?: string;
    text?: string[];
  }>;
  photos?: Array<{ href?: string }>;
  pet_policy?: {
    cats?: boolean;
    dogs?: boolean;
    dogs_small?: boolean;
    dogs_large?: boolean;
  } | string;
}

interface RealtyDetailApiResponse {
  data?: {
    home?: RealtyDetailResult;
  };
}

export interface PropertyEnrichmentData {
  description: string | null;
  amenities: string[];
  photos: string[];
  pet_policy: string | null;
  landlord_name: string | null;
}

// ─── Adapter ────────────────────────────────────────────────────

class RealtyInUsAdapter implements ApiSourceAdapter {
  config: SourceAdapterConfig = {
    name: 'realty_in_us',
    baseUrl: 'https://realty-in-us.p.rapidapi.com',
    reliability: 95,
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  };

  isConfigured(): boolean {
    return Boolean(process.env.RAPIDAPI_KEY);
  }

  async fetchListings(params: CrawlSearchParams): Promise<ApiSourceResult> {
    const errors: string[] = [];
    const allListings: RawListing[] = [];

    if (!this.isConfigured()) {
      errors.push('RAPIDAPI_KEY is not configured');
      return { listings: [], errors };
    }

    const client = new ApiClient();

    // Determine which zip codes to query
    const zips = params.neighborhoods?.length
      ? getZipsForNeighborhoods(params.neighborhoods)
      : [];

    // If neighborhoods were specified but no zips matched, fall back to city-wide
    if (params.neighborhoods?.length && zips.length === 0) {
      console.warn(
        '[RealtyInUs] No zip codes matched for neighborhoods:',
        params.neighborhoods,
      );
    }

    // Build requests — one per zip, or a default set of popular LA zips
    const DEFAULT_LA_ZIPS = ['90028', '90013'];
    const targets = zips.length > 0 ? zips : DEFAULT_LA_ZIPS;

    let rateLimitRemaining: number | undefined;
    let rateLimitReset: string | undefined;

    for (const zip of targets) {
      try {
        // v3/list is a POST endpoint with JSON body
        const requestBody: Record<string, unknown> = {
          status: ['for_rent'],
          limit: 50,
          offset: 0,
          postal_code: zip,
        };

        if (params.minPrice !== undefined || params.maxPrice !== undefined) {
          requestBody.list_price = {};
          if (params.minPrice !== undefined) {
            (requestBody.list_price as Record<string, number>).min = params.minPrice;
          }
          if (params.maxPrice !== undefined) {
            (requestBody.list_price as Record<string, number>).max = params.maxPrice;
          }
        }
        if (params.minBedrooms !== undefined) {
          requestBody.beds = { min: params.minBedrooms };
        }

        requestBody.sort = { direction: 'desc', field: 'list_date' };

        const url = `${this.config.baseUrl}/properties/v3/list`;

        const response = await client.fetchJson<RealtyApiResponse>(url, {
          method: 'POST',
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
            'X-RapidAPI-Host': 'realty-in-us.p.rapidapi.com',
          },
          body: requestBody,
          adapterName: 'RealtyInUs',
          delayBetweenRequests: this.config.delayBetweenRequests,
        });

        if (response.rateLimitRemaining !== undefined) {
          rateLimitRemaining = response.rateLimitRemaining;
        }
        if (response.rateLimitReset) {
          rateLimitReset = response.rateLimitReset;
        }

        const results = response.data?.data?.home_search?.results ?? [];
        const listings = this.transformResults(results);
        allListings.push(...listings);

        console.log(
          `[RealtyInUs] Fetched ${results.length} results for zip ${zip}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[RealtyInUs] Failed to fetch zip ${zip}:`, message);
        errors.push(`Failed to fetch listings for zip ${zip}: ${message}`);
      }
    }

    return {
      listings: allListings,
      errors,
      rateLimitRemaining,
      rateLimitReset,
    };
  }

  async fetchPropertyDetail(propertyId: string): Promise<PropertyEnrichmentData | null> {
    if (!this.isConfigured()) {
      console.error('[RealtyInUs] RAPIDAPI_KEY is not configured for detail fetch');
      return null;
    }

    const client = new ApiClient();
    const url = `${this.config.baseUrl}/properties/v3/detail?property_id=${encodeURIComponent(propertyId)}`;

    try {
      const response = await client.fetchJson<RealtyDetailApiResponse>(url, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'realty-in-us.p.rapidapi.com',
        },
        adapterName: 'RealtyInUsDetail',
        delayBetweenRequests: 1000,
      });

      const home = response.data?.data?.home;
      if (!home) {
        console.warn(`[RealtyInUs] No detail data for property ${propertyId}`);
        return null;
      }

      // Extract description
      const description = home.description?.text ?? null;

      // Extract amenities from details[] categories
      const amenities: string[] = [];
      if (home.details && Array.isArray(home.details)) {
        for (const detail of home.details) {
          if (detail.text && Array.isArray(detail.text)) {
            amenities.push(...detail.text);
          }
        }
      }

      // Extract photos (cap at 30 to avoid DB bloat), upscale to large
      const photos = (home.photos ?? [])
        .map((p) => p.href)
        .filter((h): h is string => Boolean(h))
        .map(upscalePhotoUrl)
        .slice(0, 30);

      // Extract pet_policy
      let petPolicy: string | null = null;
      if (home.pet_policy) {
        if (typeof home.pet_policy === 'string') {
          petPolicy = home.pet_policy;
        } else {
          const pp = home.pet_policy;
          const parts: string[] = [];
          if (pp.cats) parts.push('Cats allowed');
          if (pp.dogs || pp.dogs_small || pp.dogs_large) {
            if (pp.dogs_large) parts.push('Dogs allowed (large)');
            else if (pp.dogs_small) parts.push('Dogs allowed (small)');
            else parts.push('Dogs allowed');
          }
          petPolicy = parts.length > 0 ? parts.join(', ') : 'No pets';
        }
      }

      const landlordName = home.description?.name ?? null;

      return {
        description,
        amenities,
        photos,
        pet_policy: petPolicy,
        landlord_name: landlordName,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[RealtyInUs] Failed to fetch detail for ${propertyId}:`, message);
      return null;
    }
  }

  private transformResults(results: RealtyResult[]): RawListing[] {
    const now = new Date().toISOString();
    const listings: RawListing[] = [];

    for (const result of results) {
      try {
        const addr = result.location?.address;
        const addressParts = [
          addr?.line,
          addr?.city,
          addr?.state_code,
          addr?.postal_code,
        ].filter(Boolean);

        // Photos: use full photos[] if available, otherwise primary_photo
        const fullPhotos = (result.photos ?? [])
          .map((p) => p.href)
          .filter((h): h is string => Boolean(h))
          .map(upscalePhotoUrl);
        const photos = fullPhotos.length > 0
          ? fullPhotos
          : result.primary_photo?.href
            ? [upscalePhotoUrl(result.primary_photo.href)]
            : [];

        // Price: list_price, or midpoint of min/max range
        const price = result.list_price
          ?? (result.list_price_min && result.list_price_max
            ? Math.round((result.list_price_min + result.list_price_max) / 2)
            : result.list_price_min ?? result.list_price_max ?? null);

        const listing: RawListing = {
          sourceId: result.property_id ?? null,
          sourceName: 'realty_in_us',
          sourceUrl: result.href ?? `https://www.realtor.com/realestateandhomes-detail/${result.property_id ?? ''}`,
          title: addr?.line ?? `Rental in ${addr?.city ?? 'Los Angeles'}`,
          address: addressParts.length > 0 ? addressParts.join(', ') : null,
          price,
          bedrooms: result.description?.beds ?? null,
          bathrooms: result.description?.baths ?? null,
          sqft: result.description?.sqft ?? null,
          description: result.description?.text ?? null,
          photos,
          amenities: [],
          petPolicy: typeof result.pet_policy === 'string'
            ? result.pet_policy
            : result.pet_policy != null
              ? JSON.stringify(result.pet_policy)
              : null,
          parking: null,
          availableDate: null,
          latitude: addr?.coordinate?.lat ?? null,
          longitude: addr?.coordinate?.lon ?? null,
          propertyType: result.description?.type ?? null,
          rawData: result as unknown as Record<string, unknown>,
          crawledAt: now,
        };

        listings.push(listing);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[RealtyInUs] Failed to transform result:', message);
      }
    }

    return listings;
  }
}

export const realtyInUsAdapter = new RealtyInUsAdapter();
