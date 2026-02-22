/**
 * Market Researcher Agent
 *
 * Receives search criteria from the orchestrator and:
 *  1. Queries the properties table for matching active listings
 *  2. If insufficient results, fetches from API sources (Realty in US, RentCast)
 *  3. Falls back to Firecrawl scrapers if API sources yield < 5 results
 *  4. Scores each listing (1-100) based on user preferences
 *  5. Returns scored, ranked listings
 *
 * Falls back to Claude web_search when all crawl infrastructure is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAgent,
  getAnthropicClient,
  MODELS,
  streamText,
} from './framework';
import type {
  AgentConfig,
  AgentListing,
  ExtractedParams,
  ScoringResult,
  StreamEvent,
  SubAgentContext,
  UserPreferencesData,
} from './types';
import { createClient } from '@/lib/supabase/server';
import type { Json, PropertyType } from '@/lib/database.types';
import type { CrawlSearchParams } from '@/lib/crawl';

// ─── Configuration ──────────────────────────────────────────────

const MARKET_RESEARCHER_CONFIG: AgentConfig = {
  name: 'MarketResearcher',
  model: MODELS.SONNET,
  systemPrompt: MARKET_RESEARCHER_SYSTEM_PROMPT(),
  maxTokens: 4096,
  temperature: 0.2,
  timeoutMs: 60_000, // Longer timeout for web search
};

function MARKET_RESEARCHER_SYSTEM_PROMPT(): string {
  return `You are a real estate research agent specializing in Los Angeles rental properties. Your job is to search the web for available rental listings that match the user's criteria.

When searching, focus on:
- Major LA rental listing sites (apartments.com, zillow.com, trulia.com, hotpads.com, westsiderentals.com, craigslist.org)
- The specific neighborhoods, budget range, and bedroom count the user wants
- Current availability (listings posted within the last 30 days)

After finding listings, you must return a JSON array of listings with this exact shape:

[
  {
    "title": "string - descriptive title",
    "address": "string - full street address",
    "location": "string - neighborhood/area name",
    "price": number,
    "bedrooms": number,
    "bathrooms": number,
    "square_feet": number | null,
    "amenities": ["string"] | null,
    "parking_available": boolean,
    "pet_policy": "string" | null,
    "available_date": "YYYY-MM-DD" | null,
    "latitude": number | null,
    "longitude": number | null,
    "listing_url": "string" | null,
    "description": "string - brief description",
    "source": "string - website name",
    "property_type": "apartment" | "house" | "condo" | "townhouse" | "room"
  }
]

Return ONLY the JSON array, no markdown or explanations. If you cannot find real listings, return an empty array [].`;
}

// ─── Market Researcher Agent ────────────────────────────────────

export class MarketResearcherAgent extends BaseAgent {
  private client: Anthropic;

  constructor() {
    super(MARKET_RESEARCHER_CONFIG);
    this.client = getAnthropicClient();
  }

  async *execute(context: SubAgentContext): AsyncGenerator<StreamEvent> {
    const params = context.extractedParams;
    const preferences = context.preferences;

    yield this.statusEvent('searching');
    yield* streamText('Searching for properties...', this.name, 20);

    // Step 1: Query existing listings from the database
    let listings = await this.queryExistingListings(params, preferences);

    // Step 2: If insufficient results, trigger on-demand crawl
    if (listings.length < 5) {
      yield this.statusEvent('searching');
      yield* streamText(
        '\n\nSearching rental sites for new listings...',
        this.name,
        20,
      );

      try {
        await this.crawlOnDemand(params, preferences);
        // Re-query to get fresh + existing results
        listings = await this.queryExistingListings(params, preferences);
      } catch (err) {
        console.error('[MarketResearcher] On-demand crawl failed:', err);
        // Continue with whatever listings we have
      }
    }

    yield this.statusEvent('analyzing');
    yield* streamText(
      `\n\nFound ${listings.length} listings. Scoring and ranking them based on your preferences...`,
      this.name,
      20,
    );

    // Step 3: Score and rank all results
    const scoredListings = this.scoreListings(listings, context);
    scoredListings.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Persist scores to listing_scores table
    await this.persistScores(scoredListings, context);

    // Step 4: Emit listings event
    yield {
      type: 'listings',
      listings: scoredListings,
      agentName: this.name,
    };

    // Step 5: Stream summary
    const summary = this.generateSummaryText(scoredListings, context);
    yield* streamText(summary, this.name, 20);
  }

  // ─── Search Query Builder ───────────────────────────────────

  private buildSearchQuery(context: SubAgentContext): string {
    const params = context.extractedParams;
    const prefs = context.preferences;

    // Determine property types
    const propertyTypes =
      params.propertyTypes?.length
        ? params.propertyTypes
        : prefs?.property_types?.length
          ? prefs.property_types
          : ['house'];

    const typeLabel = propertyTypes.length === 1
      ? `${propertyTypes[0]}s`
      : propertyTypes.map(t => `${t}s`).join(' or ');

    const parts: string[] = [`${typeLabel} for rent in`];

    // Neighborhoods
    const neighborhoods =
      params.neighborhoods?.length
        ? params.neighborhoods
        : prefs?.neighborhoods?.length
          ? prefs.neighborhoods
          : ['Los Angeles'];
    parts.push(neighborhoods.join(', '));

    // Budget
    const maxBudget = params.maxBudget ?? prefs?.max_budget;
    const minBudget = params.minBudget ?? prefs?.min_budget;
    if (maxBudget) {
      parts.push(`under $${maxBudget}/month`);
    } else if (minBudget) {
      parts.push(`starting at $${minBudget}/month`);
    }

    // Bedrooms
    const minBed = params.minBedrooms ?? prefs?.min_bedrooms;
    if (minBed) {
      parts.push(`${minBed}+ bedrooms`);
    }

    // Pet friendly
    if (params.petFriendly || prefs?.pet_friendly) {
      parts.push('pet friendly');
    }

    // Parking
    if (params.parkingRequired || prefs?.parking_required) {
      parts.push('with parking');
    }

    // Free-form query
    if (params.searchQuery) {
      parts.push(params.searchQuery);
    }

    return parts.join(' ');
  }

  // ─── Web Search via Claude ────────────────────────────────────

  private async searchListings(
    query: string,
    context: SubAgentContext,
  ): Promise<AgentListing[]> {
    const searchMessages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Search for: ${query}\n\nUser preferences: ${JSON.stringify(context.preferences || {})}\n\nExtracted parameters: ${JSON.stringify(context.extractedParams)}\n\nPlease search for available rental listings matching these criteria and return them as a JSON array.`,
      },
    ];

    // Use Claude with web_search tool
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      tools: [
        {
          type: 'web_search' as 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        } as Anthropic.WebSearchTool20250305,
      ],
      messages: searchMessages,
    });

    // Extract text content from the response
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    const fullText = textBlocks.map((b) => b.text).join('\n');

    return this.parseListingsFromResponse(fullText);
  }

  // ─── Database Query ─────────────────────────────────────────────

  /**
   * Query listings with progressive filter relaxation.
   * If strict filters yield 0 results, relaxes filters in stages:
   *   1. Full filters (type + price + bedrooms + neighborhood)
   *   2. Drop property_type filter
   *   3. Drop neighborhood filter
   *   4. Drop bedroom filter
   *   5. Only price ceiling (no min price)
   *   6. All active listings (no filters)
   */
  private async queryExistingListings(
    params: ExtractedParams,
    preferences: UserPreferencesData | null | undefined,
  ): Promise<AgentListing[]> {
    // Try strict first, then progressively relax
    const result = await this.queryWithFilters(params, preferences, 'strict');
    if (result.length > 0) return result;

    // Relax: drop property type
    const noType = await this.queryWithFilters(params, preferences, 'no_type');
    if (noType.length > 0) return noType;

    // Relax: drop neighborhood
    const noNeighborhood = await this.queryWithFilters(params, preferences, 'no_neighborhood');
    if (noNeighborhood.length > 0) return noNeighborhood;

    // Relax: drop bedrooms
    const noBedrooms = await this.queryWithFilters(params, preferences, 'no_bedrooms');
    if (noBedrooms.length > 0) return noBedrooms;

    // Relax: only max budget
    const onlyMaxPrice = await this.queryWithFilters(params, preferences, 'only_max_price');
    if (onlyMaxPrice.length > 0) return onlyMaxPrice;

    // Final: all active listings
    return this.queryWithFilters(params, preferences, 'none');
  }

  private async queryWithFilters(
    params: ExtractedParams,
    preferences: UserPreferencesData | null | undefined,
    level: 'strict' | 'no_type' | 'no_neighborhood' | 'no_bedrooms' | 'only_max_price' | 'none',
  ): Promise<AgentListing[]> {
    const supabase = await createClient();

    let query = supabase.from('properties').select('*').eq('is_active', true);

    if (level === 'none') {
      // No additional filters
    } else if (level === 'only_max_price') {
      const maxBudget = params.maxBudget ?? preferences?.max_budget;
      if (maxBudget) query = query.lte('price', maxBudget);
    } else {
      // Filter by property type (skip for no_type and below)
      if (level === 'strict') {
        const propertyTypes = params.propertyTypes?.length
          ? params.propertyTypes
          : preferences?.property_types?.length
            ? preferences.property_types
            : null;
        if (propertyTypes && propertyTypes.length > 0) {
          query = query.in('property_type', propertyTypes);
        }
      }

      // Filter by price
      const maxBudget = params.maxBudget ?? preferences?.max_budget;
      const minBudget = params.minBudget ?? preferences?.min_budget;
      if (maxBudget) query = query.lte('price', maxBudget);
      if (minBudget) query = query.gte('price', minBudget);

      // Filter by bedrooms (skip for no_bedrooms and below)
      if (level === 'strict' || level === 'no_type' || level === 'no_neighborhood') {
        const minBed = params.minBedrooms ?? preferences?.min_bedrooms;
        if (minBed) query = query.gte('bedrooms', minBed);
      }

      // Filter by neighborhood (skip for no_neighborhood and below)
      if (level === 'strict' || level === 'no_type') {
        const neighborhoods = params.neighborhoods?.length
          ? params.neighborhoods
          : preferences?.neighborhoods?.length
            ? preferences.neighborhoods
            : null;
        if (neighborhoods && neighborhoods.length > 0) {
          const neighborhoodFilter = neighborhoods.map(n => `location.ilike.%${n}%`).join(',');
          query = query.or(neighborhoodFilter);
        }
      }
    }

    query = query.order('created_at', { ascending: false }).limit(20);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      title: row.title,
      address: row.address,
      location: row.location,
      price: row.price,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      square_feet: row.square_feet,
      photos: row.photos ?? [],
      amenities: Array.isArray(row.amenities) ? row.amenities as string[] : [],
      parking_available: row.parking_available ?? false,
      pet_policy: row.pet_policy,
      available_date: row.available_date,
      latitude: row.latitude,
      longitude: row.longitude,
      listing_url: row.listing_url,
      description: row.description,
      source: row.source_name ?? 'database',
      property_type: row.property_type,
    }));
  }

  // ─── On-Demand Crawl ─────────────────────────────────────────────

  private async crawlOnDemand(
    params: ExtractedParams,
    preferences: UserPreferencesData | null | undefined,
  ): Promise<AgentListing[]> {
    const { normalizeRawListing, findDuplicates, mergeWithExisting, persistNewListing } = await import('@/lib/crawl');
    const supabase = await createClient();

    const crawlParams: CrawlSearchParams = {
      neighborhoods: params.neighborhoods?.length
        ? params.neighborhoods
        : preferences?.neighborhoods ?? undefined,
      propertyTypes: (params.propertyTypes?.length
        ? params.propertyTypes
        : preferences?.property_types?.length
          ? preferences.property_types
          : undefined) as PropertyType[] | undefined,
      minPrice: params.minBudget ?? preferences?.min_budget ?? undefined,
      maxPrice: params.maxBudget ?? preferences?.max_budget ?? undefined,
      minBedrooms: params.minBedrooms ?? preferences?.min_bedrooms ?? undefined,
    };

    const newListings: AgentListing[] = [];

    const processRawListings = async (listings: import('@/lib/crawl').RawListing[]) => {
      for (const rawListing of listings) {
        const normalized = normalizeRawListing(rawListing);
        const duplicate = await findDuplicates(normalized, supabase);

        if (duplicate) {
          await mergeWithExisting(duplicate.existing, normalized, supabase);
        } else {
          const newId = await persistNewListing(normalized, supabase);
          newListings.push({
            id: newId,
            title: normalized.title,
            address: normalized.address,
            location: normalized.location,
            price: normalized.price,
            bedrooms: normalized.bedrooms,
            bathrooms: normalized.bathrooms,
            square_feet: normalized.square_feet,
            photos: normalized.photos,
            amenities: normalized.amenities,
            parking_available: normalized.parking_available,
            pet_policy: normalized.pet_policy,
            available_date: normalized.available_date,
            latitude: normalized.latitude,
            longitude: normalized.longitude,
            listing_url: normalized.listing_url,
            description: normalized.description,
            source: normalized.source_name,
            property_type: normalized.property_type,
          });
        }
      }
    };

    // 1. Try API adapters first (faster, structured data)
    try {
      const { apiAdapters } = await import('@/lib/crawl/adapters/index');
      for (const adapter of apiAdapters) {
        if (!adapter.isConfigured()) continue;
        try {
          const result = await adapter.fetchListings(crawlParams);
          await processRawListings(result.listings);
          console.log(`[MarketResearcher] API sync ${adapter.config.name}: ${result.listings.length} listings`);
        } catch (err) {
          console.error(`[MarketResearcher] API sync failed for ${adapter.config.name}:`, err);
        }
      }
    } catch (err) {
      console.error('[MarketResearcher] API adapters import failed:', err);
    }

    // 2. Fall back to Firecrawl scrapers if API yielded few results
    if (newListings.length < 5) {
      try {
        const { crawlEngine, allAdapters } = await import('@/lib/crawl');
        for (const adapter of allAdapters) {
          try {
            const result = await crawlEngine.crawlSearchResults(adapter, crawlParams);
            await processRawListings(result.listings);
          } catch (err) {
            console.error(`[MarketResearcher] Crawl failed for ${adapter.config.name}:`, err);
          }
        }
      } catch (err) {
        console.error('[MarketResearcher] Firecrawl fallback failed:', err);
      }
    }

    return newListings;
  }

  // ─── Response Parser ──────────────────────────────────────────

  private parseListingsFromResponse(responseText: string): AgentListing[] {
    // Try to find a JSON array in the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    try {
      const rawArray = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(rawArray)) return [];

      return rawArray.map((item: Record<string, unknown>, index: number) =>
        this.normalizeListing(item, index),
      );
    } catch {
      console.error('[MarketResearcher] Failed to parse listings JSON');
      return [];
    }
  }

  private normalizeListing(
    raw: Record<string, unknown>,
    index: number,
  ): AgentListing {
    return {
      id: `search-${Date.now()}-${index}`,
      title: String(raw.title || 'Untitled Listing'),
      address: String(raw.address || 'Address unavailable'),
      location: String(raw.location || raw.neighborhood || 'Los Angeles'),
      price: Number(raw.price) || 0,
      bedrooms: Number(raw.bedrooms) || 0,
      bathrooms: Number(raw.bathrooms) || 1,
      square_feet: raw.square_feet != null ? Number(raw.square_feet) : null,
      photos: Array.isArray(raw.photos) ? raw.photos.map(String) : [],
      amenities: Array.isArray(raw.amenities) ? raw.amenities.map(String) : null,
      parking_available: Boolean(raw.parking_available),
      pet_policy: raw.pet_policy != null ? String(raw.pet_policy) : null,
      available_date: raw.available_date != null ? String(raw.available_date) : null,
      latitude: raw.latitude != null ? Number(raw.latitude) : null,
      longitude: raw.longitude != null ? Number(raw.longitude) : null,
      listing_url: raw.listing_url != null ? String(raw.listing_url) : null,
      description: raw.description != null ? String(raw.description) : null,
      source: raw.source != null ? String(raw.source) : 'web_search',
      property_type: raw.property_type != null ? String(raw.property_type) : undefined,
    };
  }

  // ─── Listing Scoring ──────────────────────────────────────────

  private scoreListings(
    listings: AgentListing[],
    context: SubAgentContext,
  ): AgentListing[] {
    const prefs = context.preferences;
    const params = context.extractedParams;

    return listings.map((listing) => {
      const scoring = this.scoreListing(listing, prefs, params);
      return {
        ...listing,
        score: scoring.overall_score,
        scoring,
      };
    });
  }

  private scoreListing(
    listing: AgentListing,
    prefs: UserPreferencesData | null | undefined,
    params: ExtractedParams,
  ): ScoringResult {
    const scores = {
      price_score: this.scorePriceMatch(listing, prefs, params),
      location_score: this.scoreLocationMatch(listing, prefs, params),
      size_score: this.scoreSizeMatch(listing, prefs, params),
      amenity_score: this.scoreAmenityMatch(listing, prefs, params),
      quality_score: this.scoreListingQuality(listing),
      freshness_score: this.scoreFreshness(listing),
      source_reliability_score: this.scoreSourceReliability(listing),
      property_type_score: this.scorePropertyTypeMatch(listing, prefs, params),
    };

    // Weighted average (prices matter most in LA)
    const weights = {
      price_score: 0.25,
      location_score: 0.20,
      size_score: 0.12,
      amenity_score: 0.08,
      quality_score: 0.07,
      freshness_score: 0.06,
      source_reliability_score: 0.04,
      property_type_score: 0.18,
    };

    const overall_score = Math.round(
      Object.entries(weights).reduce(
        (sum, [key, weight]) => sum + scores[key as keyof typeof scores] * weight,
        0,
      ),
    );

    // Generate pros and cons
    const pros: string[] = [];
    const cons: string[] = [];

    if (scores.price_score >= 80) pros.push('Great price for the area');
    if (scores.price_score < 40) cons.push('Above typical budget range');
    if (scores.location_score >= 80) pros.push('Ideal neighborhood match');
    if (scores.amenity_score >= 70) pros.push('Good amenity match');
    if (listing.parking_available) pros.push('Parking included');
    if (listing.pet_policy && listing.pet_policy !== 'no pets') pros.push('Pet-friendly');
    if (!listing.parking_available && (prefs?.parking_required || params.parkingRequired)) {
      cons.push('No parking available');
    }

    return {
      overall_score,
      ...scores,
      reasoning: `Score: ${overall_score}/100 based on price (${scores.price_score}), location (${scores.location_score}), size (${scores.size_score}), amenities (${scores.amenity_score})`,
      pros,
      cons,
    };
  }

  private scorePriceMatch(
    listing: AgentListing,
    prefs: UserPreferencesData | null | undefined,
    params: ExtractedParams,
  ): number {
    const maxBudget = params.maxBudget ?? prefs?.max_budget;
    const minBudget = params.minBudget ?? prefs?.min_budget;

    if (!maxBudget && !minBudget) return 70; // No preference, neutral score

    if (maxBudget && listing.price <= maxBudget) {
      // Under budget is great. Closer to budget = higher score
      // (too cheap might indicate issues)
      const ratio = listing.price / maxBudget;
      if (ratio >= 0.7 && ratio <= 1.0) return 95;
      if (ratio >= 0.5) return 80;
      return 65;
    }

    if (maxBudget && listing.price > maxBudget) {
      // Over budget
      const overBy = (listing.price - maxBudget) / maxBudget;
      if (overBy <= 0.1) return 50; // Slightly over
      if (overBy <= 0.2) return 30;
      return 10;
    }

    return 70;
  }

  private scoreLocationMatch(
    listing: AgentListing,
    prefs: UserPreferencesData | null | undefined,
    params: ExtractedParams,
  ): number {
    const targetNeighborhoods = [
      ...(params.neighborhoods || []),
      ...(prefs?.neighborhoods || []),
    ].map((n) => n.toLowerCase());

    if (targetNeighborhoods.length === 0) return 70;

    const listingLocation = listing.location.toLowerCase();
    const listingAddress = listing.address.toLowerCase();

    // Exact neighborhood match
    for (const target of targetNeighborhoods) {
      if (listingLocation.includes(target) || listingAddress.includes(target)) {
        return 95;
      }
    }

    // Check for adjacent/related neighborhoods (simplified)
    const laNeighborhoodGroups: Record<string, string[]> = {
      'downtown': ['dtla', 'arts district', 'little tokyo', 'chinatown', 'financial district'],
      'westside': ['santa monica', 'venice', 'mar vista', 'culver city', 'west la', 'brentwood', 'westwood'],
      'hollywood': ['west hollywood', 'east hollywood', 'hollywood hills', 'los feliz', 'silver lake'],
      'south bay': ['manhattan beach', 'hermosa beach', 'redondo beach', 'torrance', 'el segundo'],
      'valley': ['sherman oaks', 'studio city', 'north hollywood', 'burbank', 'glendale', 'encino'],
      'eastside': ['eagle rock', 'highland park', 'echo park', 'atwater village', 'glassell park'],
      'koreatown': ['ktown', 'mid-wilshire', 'wilshire center'],
      'pasadena': ['south pasadena', 'altadena', 'san marino'],
    };

    for (const target of targetNeighborhoods) {
      for (const [, group] of Object.entries(laNeighborhoodGroups)) {
        const inSameGroup =
          group.some((n) => target.includes(n) || n.includes(target)) &&
          group.some(
            (n) =>
              listingLocation.includes(n) || listingAddress.includes(n),
          );
        if (inSameGroup) return 70;
      }
    }

    return 40;
  }

  private scoreSizeMatch(
    listing: AgentListing,
    prefs: UserPreferencesData | null | undefined,
    params: ExtractedParams,
  ): number {
    const minBed = params.minBedrooms ?? prefs?.min_bedrooms;
    const maxBed = params.maxBedrooms ?? prefs?.max_bedrooms;

    if (!minBed && !maxBed) return 70;

    if (minBed && listing.bedrooms >= minBed) {
      if (maxBed && listing.bedrooms <= maxBed) return 95;
      if (!maxBed) return 90;
      // Over max bedrooms
      return 60;
    }

    if (minBed && listing.bedrooms < minBed) {
      return listing.bedrooms === minBed - 1 ? 40 : 15;
    }

    return 70;
  }

  private scoreAmenityMatch(
    listing: AgentListing,
    prefs: UserPreferencesData | null | undefined,
    params: ExtractedParams,
  ): number {
    const wantedAmenities = [
      ...(params.amenities || []),
      ...(prefs?.amenities || []),
    ].map((a) => a.toLowerCase());

    if (wantedAmenities.length === 0) return 70;

    const listingAmenities = (listing.amenities || []).map((a) =>
      a.toLowerCase(),
    );

    if (listingAmenities.length === 0) return 50; // Can't evaluate

    let matches = 0;
    for (const wanted of wantedAmenities) {
      if (listingAmenities.some((a) => a.includes(wanted) || wanted.includes(a))) {
        matches++;
      }
    }

    const ratio = matches / wantedAmenities.length;
    return Math.round(40 + ratio * 60); // 40-100 range

  }

  private scoreListingQuality(listing: AgentListing): number {
    let score = 50;
    if (listing.photos.length > 0) score += 15;
    if (listing.description) score += 10;
    if (listing.square_feet) score += 10;
    if (listing.listing_url) score += 5;
    if (listing.available_date) score += 5;
    if (listing.latitude && listing.longitude) score += 5;
    return Math.min(score, 100);
  }

  private scoreFreshness(listing: AgentListing): number {
    if (!listing.available_date) return 60;
    const availDate = new Date(listing.available_date);
    const now = new Date();
    const daysUntil = (availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil < 0) return 30; // Already passed
    if (daysUntil <= 14) return 95;
    if (daysUntil <= 30) return 80;
    if (daysUntil <= 60) return 65;
    return 50;
  }

  private scoreSourceReliability(listing: AgentListing): number {
    const reliableSources = [
      'apartments.com', 'zillow', 'trulia', 'realtor.com',
      'hotpads', 'westsiderentals', 'rent.com',
    ];
    const source = (listing.source || '').toLowerCase();
    if (reliableSources.some((rs) => source.includes(rs))) return 90;
    if (source === 'craigslist' || source.includes('craigslist')) return 50;
    return 65;
  }

  private scorePropertyTypeMatch(
    listing: AgentListing,
    prefs: UserPreferencesData | null | undefined,
    params: ExtractedParams,
  ): number {
    const wantedTypes = [
      ...(params.propertyTypes || []),
      ...(prefs?.property_types || []),
    ].map(t => t.toLowerCase());

    if (wantedTypes.length === 0) return 70;

    const listingType = (listing.property_type || 'apartment').toLowerCase();
    if (wantedTypes.includes(listingType)) return 95;
    return 30;
  }

  // ─── Persistence ────────────────────────────────────────────────

  /**
   * Persists discovered listings to the properties table via upsert.
   * Returns listings with real DB-assigned UUIDs.
   */
  private async persistListings(listings: AgentListing[]): Promise<AgentListing[]> {
    try {
      const supabase = await createClient();
      const persisted: AgentListing[] = [];

      for (const listing of listings) {
        const { data, error } = await supabase
          .from('properties')
          .upsert(
            {
              title: listing.title,
              address: listing.address,
              location: listing.location,
              price: listing.price,
              bedrooms: listing.bedrooms,
              bathrooms: listing.bathrooms,
              square_feet: listing.square_feet,
              amenities: (listing.amenities ?? []) as unknown as Json,
              photos: listing.photos,
              parking_available: listing.parking_available,
              pet_policy: listing.pet_policy,
              available_date: listing.available_date,
              latitude: listing.latitude,
              longitude: listing.longitude,
              listing_url: listing.listing_url ?? null,
              description: listing.description ?? null,
              property_type: (listing.property_type ?? 'apartment') as PropertyType,
            },
            { onConflict: 'title,address' }
          )
          .select()
          .single();

        if (data && !error) {
          persisted.push({ ...listing, id: data.id });
        } else {
          // If upsert fails (e.g. no unique constraint), still include the listing
          persisted.push(listing);
        }
      }

      return persisted;
    } catch (err) {
      console.error('[MarketResearcher] Failed to persist listings:', err);
      return listings; // Return originals on failure
    }
  }

  /**
   * Persists listing scores to the listing_scores table.
   */
  private async persistScores(
    listings: AgentListing[],
    context: SubAgentContext,
  ): Promise<void> {
    try {
      const supabase = await createClient();

      for (const listing of listings) {
        if (!listing.scoring || listing.id.startsWith('search-') || listing.id.startsWith('mock-')) {
          continue; // Skip non-persisted listings
        }

        await supabase.from('listing_scores').insert({
          listing_id: listing.id,
          user_id: context.userId,
          overall_score: listing.scoring.overall_score,
          price_score: listing.scoring.price_score,
          location_score: listing.scoring.location_score,
          size_score: listing.scoring.size_score,
          amenities_score: listing.scoring.amenity_score,
          reasoning: listing.scoring.reasoning ?? null,
          pros: listing.scoring.pros ?? [],
          cons: listing.scoring.cons ?? [],
        });
      }
    } catch (err) {
      console.error('[MarketResearcher] Failed to persist scores:', err);
      // Non-fatal
    }
  }

  // ─── Summary Text Generator ───────────────────────────────────

  private generateSummaryText(
    listings: AgentListing[],
    context: SubAgentContext,
  ): string {
    if (listings.length === 0) {
      return "\n\nI couldn't find any listings matching your criteria. Try broadening your search by increasing your budget, adding more neighborhoods, or reducing bedroom requirements.";
    }

    const top = listings.slice(0, 3);
    const parts: string[] = ['\n\nHere are the top matches:\n'];

    top.forEach((listing, i) => {
      parts.push(
        `\n${i + 1}. **${listing.title}** - $${listing.price.toLocaleString()}/mo`,
      );
      parts.push(`   ${listing.address}, ${listing.location}`);
      parts.push(`   ${listing.bedrooms}BR/${listing.bathrooms}BA`);
      if (listing.square_feet) parts.push(` | ${listing.square_feet} sq ft`);
      parts.push(`   Score: ${listing.score}/100`);
      if (listing.scoring?.pros?.length) {
        parts.push(`   Pros: ${listing.scoring.pros.join(', ')}`);
      }
    });

    if (listings.length > 3) {
      parts.push(
        `\n\n...and ${listings.length - 3} more listings. Would you like to see all results, refine your search, get a cost estimate, or schedule a viewing?`,
      );
    } else {
      parts.push(
        '\n\nWould you like a cost estimate for any of these, or would you like to schedule a viewing?',
      );
    }

    return parts.join('');
  }

}
