import type {
  SourceAdapter,
  SourceAdapterConfig,
  CrawlSearchParams,
  RawListing,
} from '../types';

class RentComAdapter implements SourceAdapter {
  config: SourceAdapterConfig = {
    name: 'rent_com',
    baseUrl: 'https://www.rent.com',
    reliability: 80,
    requestsPerMinute: 8,
    delayBetweenRequests: 8000,
  };

  buildSearchUrls(params: CrawlSearchParams): string[] {
    const neighborhoods = (params.neighborhoods ?? []).slice(0, 5);
    const urls: string[] = [];

    if (neighborhoods.length === 0) {
      // Default to general LA search
      let url = `${this.config.baseUrl}/california/los-angeles-apartments/`;
      const queryParts = this.buildQueryParts(params);
      if (queryParts.length > 0) {
        url += `?${queryParts.join('&')}`;
      }
      urls.push(url);
      return urls;
    }

    for (const neighborhood of neighborhoods) {
      const slug = neighborhood.toLowerCase().replace(/\s+/g, '-');
      let url = `${this.config.baseUrl}/california/los-angeles-${slug}-apartments/`;

      const queryParts = this.buildQueryParts(params);
      if (queryParts.length > 0) {
        url += `?${queryParts.join('&')}`;
      }

      urls.push(url);
    }

    return urls;
  }

  private buildQueryParts(params: CrawlSearchParams): string[] {
    const queryParts: string[] = [];

    if (params.minPrice) queryParts.push(`price_min=${params.minPrice}`);
    if (params.maxPrice) queryParts.push(`price_max=${params.maxPrice}`);
    if (params.minBedrooms) queryParts.push(`bedrooms=${params.minBedrooms}`);

    if (params.propertyTypes?.length) {
      queryParts.push(`property_type=${params.propertyTypes.join(',')}`);
    }

    return queryParts;
  }

  extractListings(markdown: string, url: string): RawListing[] {
    const listings: RawListing[] = [];
    const now = new Date().toISOString();

    // Rent.com markdown format: split on price patterns
    const listingBlocks = markdown.split(/(?=\$[\d,]+(?:\s*-\s*\$[\d,]+)?)/);

    for (const block of listingBlocks) {
      if (block.length < 20) continue;

      try {
        const listing = this.parseListingBlock(block, url, now);
        if (listing) {
          listings.push(listing);
        }
      } catch {
        // Skip unparseable blocks
      }
    }

    return listings;
  }

  private parseListingBlock(
    block: string,
    sourceUrl: string,
    crawledAt: string,
  ): RawListing | null {
    // Extract price
    const priceMatch = block.match(/\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/);
    if (!priceMatch) return null;

    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (isNaN(price) || price < 100) return null;

    // Extract beds/baths/sqft
    const bedMatch = block.match(/(\d+)\s*(?:bds?|beds?|br|bedroom)/i);
    const bathMatch = block.match(/(\d+(?:\.\d+)?)\s*(?:ba|baths?|bathroom)/i);
    const sqftMatch = block.match(/([\d,]+)\s*(?:sqft|sq\s*ft|square\s*feet)/i);

    // Extract address
    const addressMatch = block.match(
      /(\d+\s+[A-Za-z0-9\s.]+(?:St|Ave|Blvd|Dr|Ln|Ct|Pl|Rd|Way|Circle|Pkwy)[^,\n]*)/i,
    );

    // Extract title
    const titleMatch = block.match(/\*\*(.+?)\*\*/);
    const title = titleMatch
      ? titleMatch[1]
      : addressMatch
        ? addressMatch[1].trim()
        : `Rent.com Listing - $${price}/mo`;

    // Extract listing URL
    const linkMatch = block.match(
      /\[.*?\]\((https:\/\/www\.rent\.com\/[^\s)]+)\)/,
    );

    // Extract photos
    const photoMatches = [...block.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)];
    const photos = photoMatches.map((m) => m[1]);

    return {
      sourceId: null,
      sourceName: 'rent_com',
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

  private extractAmenities(block: string): string[] {
    const amenities: string[] = [];
    const lower = block.toLowerCase();

    const keywords = [
      'dishwasher', 'laundry', 'parking', 'pool', 'gym',
      'fitness', 'air conditioning', 'hardwood', 'balcony',
      'patio', 'elevator', 'concierge', 'storage',
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

export const rentComAdapter = new RentComAdapter();
