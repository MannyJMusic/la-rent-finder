import type {
  SourceAdapter,
  SourceAdapterConfig,
  CrawlSearchParams,
  RawListing,
} from '../types';

class ZillowAdapter implements SourceAdapter {
  config: SourceAdapterConfig = {
    name: 'zillow',
    baseUrl: 'https://www.zillow.com',
    reliability: 90,
    requestsPerMinute: 5,
    delayBetweenRequests: 12000,
  };

  buildSearchUrls(params: CrawlSearchParams): string[] {
    const neighborhoods = (params.neighborhoods ?? ['Los-Angeles']).slice(0, 5);
    const urls: string[] = [];

    for (const neighborhood of neighborhoods) {
      // Convert neighborhood name to URL slug: "Silver Lake" -> "Silver-Lake"
      const slug = neighborhood.replace(/\s+/g, '-');
      let url = `${this.config.baseUrl}/homes/for_rent/${slug}-Los-Angeles-CA/`;

      const queryParts: string[] = [];

      // Price range
      if (params.minPrice) {
        queryParts.push(`price%2F${params.minPrice}_`);
      }
      if (params.maxPrice) {
        queryParts.push(
          params.minPrice
            ? `${params.maxPrice}`
            : `price%2F_${params.maxPrice}`,
        );
      }

      // Bedrooms
      if (params.minBedrooms) {
        queryParts.push(`beds%2F${params.minBedrooms}-`);
      }

      // Property types
      if (params.propertyTypes?.length) {
        const typeMap: Record<string, string> = {
          apartment: 'apartment',
          house: 'house',
          condo: 'condo',
          townhouse: 'townhouse',
        };
        const types = params.propertyTypes
          .map((t) => typeMap[t])
          .filter(Boolean);
        if (types.length) {
          queryParts.push(`type%2F${types.join(',')}`);
        }
      }

      if (queryParts.length > 0) {
        url += `?searchQueryState=${encodeURIComponent(queryParts.join('_'))}`;
      }

      urls.push(url);
    }

    return urls;
  }

  extractListings(markdown: string, url: string): RawListing[] {
    const listings: RawListing[] = [];
    const now = new Date().toISOString();

    // Zillow markdown typically contains listing cards with patterns like:
    // **$2,500/mo** or $2,500+/mo
    // 2 bds | 1 ba | 850 sqft
    // Address text
    const listingBlocks = markdown.split(/(?=\$[\d,]+(?:\+)?\/mo)/);

    for (const block of listingBlocks) {
      if (block.length < 20) continue;

      try {
        const listing = this.parseListingBlock(block, url, now);
        if (listing) {
          listings.push(listing);
        }
      } catch {
        // Skip blocks that don't parse cleanly
      }
    }

    return listings;
  }

  private parseListingBlock(
    block: string,
    sourceUrl: string,
    crawledAt: string,
  ): RawListing | null {
    // Extract price: $2,500/mo or $2,500+/mo
    const priceMatch = block.match(/\$([\d,]+)\+?\/mo/);
    if (!priceMatch) return null;
    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);

    // Extract beds/baths/sqft: "2 bds | 1 ba | 850 sqft" or "2 bd | 1 ba"
    const bedMatch = block.match(/(\d+)\s*(?:bds?|beds?|br)/i);
    const bathMatch = block.match(/(\d+(?:\.\d+)?)\s*(?:ba|baths?)/i);
    const sqftMatch = block.match(/([\d,]+)\s*sqft/i);

    // Extract address — look for typical street address patterns
    const addressMatch = block.match(
      /(\d+\s+[A-Za-z0-9\s.]+(?:St|Ave|Blvd|Dr|Ln|Ct|Pl|Rd|Way|Circle|Pkwy)[^,\n]*(?:,\s*[A-Za-z\s]+)?)/i,
    );

    // Extract title — usually the first line or bold text
    const titleMatch = block.match(/\*\*(.+?)\*\*/);
    const title = titleMatch
      ? titleMatch[1]
      : addressMatch
        ? addressMatch[1].trim()
        : `Zillow Listing - $${price}/mo`;

    // Extract listing URL from markdown links
    const linkMatch = block.match(/\[.*?\]\((https:\/\/www\.zillow\.com\/[^\s)]+)\)/);

    // Extract photos from markdown images
    const photoMatches = [...block.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)];
    const photos = photoMatches.map((m) => m[1]);

    return {
      sourceId: linkMatch ? this.extractZillowId(linkMatch[1]) : null,
      sourceName: 'zillow',
      sourceUrl: linkMatch ? linkMatch[1] : sourceUrl,
      title,
      address: addressMatch ? addressMatch[1].trim() : null,
      price,
      bedrooms: bedMatch ? parseInt(bedMatch[1], 10) : null,
      bathrooms: bathMatch ? parseFloat(bathMatch[1]) : null,
      sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ''), 10) : null,
      description: block.slice(0, 500).trim(),
      photos,
      amenities: this.extractAmenities(block),
      petPolicy: this.extractPetPolicy(block),
      parking: this.extractParking(block),
      availableDate: this.extractDate(block),
      latitude: null,
      longitude: null,
      propertyType: this.extractPropertyType(block),
      crawledAt,
    };
  }

  private extractZillowId(url: string): string | null {
    const match = url.match(/\/(\d+)_zpid/);
    return match ? match[1] : null;
  }

  private extractAmenities(block: string): string[] {
    const amenities: string[] = [];
    const lower = block.toLowerCase();

    const keywords = [
      'dishwasher', 'laundry', 'parking', 'pool', 'gym',
      'air conditioning', 'hardwood', 'balcony', 'patio',
      'elevator', 'doorman', 'storage', 'ev charging',
      'washer', 'dryer', 'garage', 'rooftop',
    ];

    for (const kw of keywords) {
      if (lower.includes(kw)) amenities.push(kw);
    }

    return amenities;
  }

  private extractPetPolicy(block: string): string | null {
    const lower = block.toLowerCase();
    if (/no pets/i.test(lower)) return 'no pets';
    if (/pet[- ]?friendly/i.test(lower)) return 'pet friendly';
    if (/dogs?\s*(allowed|ok|welcome)/i.test(lower)) return 'dogs allowed';
    if (/cats?\s*(allowed|ok|welcome)/i.test(lower)) return 'cats allowed';
    return null;
  }

  private extractParking(block: string): string | null {
    const lower = block.toLowerCase();
    if (/garage/i.test(lower)) return 'garage';
    if (/parking\s*(included|available|spot)/i.test(lower)) return 'parking available';
    if (/no parking/i.test(lower)) return 'none';
    if (/street parking/i.test(lower)) return 'street parking';
    return null;
  }

  private extractDate(block: string): string | null {
    const dateMatch = block.match(
      /available\s*(?:from\s*)?(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    );
    if (!dateMatch) return null;

    const raw = dateMatch[1];
    if (raw.includes('-')) return raw;

    // Convert MM/DD/YYYY
    const parts = raw.split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }

    return null;
  }

  private extractPropertyType(block: string): string | null {
    const lower = block.toLowerCase();
    if (/\bhouse\b|\bsingle family\b/.test(lower)) return 'house';
    if (/\bcondo\b/.test(lower)) return 'condo';
    if (/\btownhouse\b|\btownhome\b/.test(lower)) return 'townhouse';
    if (/\broom\b/.test(lower)) return 'room';
    if (/\bapartment\b|\bapt\b/.test(lower)) return 'apartment';
    return null;
  }
}

export const zillowAdapter = new ZillowAdapter();
