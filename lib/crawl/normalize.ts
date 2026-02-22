import type { PropertyType } from '@/lib/database.types';
import { LA_NEIGHBORHOODS } from '@/lib/constants';
import type { RawListing, NormalizedListing } from './types';

// ─── Address Normalization ──────────────────────────────────────

const ABBREVIATION_MAP: Record<string, string> = {
  'st': 'Street',
  'st.': 'Street',
  'ave': 'Avenue',
  'ave.': 'Avenue',
  'blvd': 'Boulevard',
  'blvd.': 'Boulevard',
  'dr': 'Drive',
  'dr.': 'Drive',
  'ln': 'Lane',
  'ln.': 'Lane',
  'ct': 'Court',
  'ct.': 'Court',
  'pl': 'Place',
  'pl.': 'Place',
  'rd': 'Road',
  'rd.': 'Road',
  'pkwy': 'Parkway',
  'cir': 'Circle',
  'hwy': 'Highway',
  'apt': 'Apt',
  'ste': 'Suite',
};

export function normalizeAddress(raw: string): string {
  let address = raw.trim();

  // Title case each word, expanding abbreviations
  address = address
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase().replace(/[.,]$/, '');
      if (ABBREVIATION_MAP[lower]) {
        return ABBREVIATION_MAP[lower];
      }
      // Title case: capitalize first letter
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // Ensure Los Angeles, CA suffix if not present
  const hasCity = /los angeles/i.test(address) || /,\s*ca\b/i.test(address);
  if (!hasCity) {
    // Remove trailing zip code if present to re-append cleanly
    address = address.replace(/\s*\d{5}(-\d{4})?\s*$/, '');
    address = `${address}, Los Angeles, CA`;
  }

  return address;
}

// ─── Neighborhood Extraction ────────────────────────────────────

export function extractNeighborhood(
  address: string,
  description?: string | null,
): string {
  const combined = `${address} ${description || ''}`.toLowerCase();

  // Check each known LA neighborhood against address + description
  for (const neighborhood of LA_NEIGHBORHOODS) {
    if (combined.includes(neighborhood.toLowerCase())) {
      return neighborhood;
    }
  }

  // Check common aliases
  const aliases: Record<string, string> = {
    'dtla': 'Downtown LA',
    'downtown los angeles': 'Downtown LA',
    'weho': 'West Hollywood',
    'noho': 'North Hollywood',
    'k-town': 'Koreatown',
    'ktown': 'Koreatown',
    'marina del rey': 'Marina del Rey',
    'playa del rey': 'Playa Vista',
  };

  for (const [alias, neighborhood] of Object.entries(aliases)) {
    if (combined.includes(alias)) {
      return neighborhood;
    }
  }

  return 'Los Angeles';
}

// ─── Property Type Inference ────────────────────────────────────

export function inferPropertyType(
  title: string,
  description?: string | null,
): PropertyType {
  const text = `${title} ${description || ''}`.toLowerCase();

  if (/\bhouse\b|\bsingle[- ]?family\b|\bbungalow\b|\bcottage\b/.test(text)) {
    return 'house';
  }
  if (/\bcondo\b|\bcondominium\b/.test(text)) {
    return 'condo';
  }
  if (/\btownhouse\b|\btownhome\b|\btown home\b/.test(text)) {
    return 'townhouse';
  }
  if (/\broom\b|\bshared\b|\broommate\b/.test(text)) {
    return 'room';
  }

  return 'apartment';
}

// ─── Price Validation ───────────────────────────────────────────

export function validatePrice(
  price: number,
): { valid: boolean; reason?: string } {
  if (price < 200) {
    return { valid: false, reason: 'Price below $200 is suspiciously low' };
  }
  if (price > 50000) {
    return { valid: false, reason: 'Price above $50,000 is suspiciously high' };
  }
  return { valid: true };
}

// ─── Amenity Normalization ──────────────────────────────────────

const AMENITY_MAP: Record<string, string> = {
  'w/d': 'In-Unit Laundry',
  'washer/dryer': 'In-Unit Laundry',
  'washer dryer': 'In-Unit Laundry',
  'in-unit laundry': 'In-Unit Laundry',
  'in unit laundry': 'In-Unit Laundry',
  'laundry in unit': 'In-Unit Laundry',
  'on-site laundry': 'On-Site Laundry',
  'onsite laundry': 'On-Site Laundry',
  'laundry room': 'On-Site Laundry',
  'a/c': 'Air Conditioning',
  'ac': 'Air Conditioning',
  'central air': 'Air Conditioning',
  'air conditioning': 'Air Conditioning',
  'central a/c': 'Air Conditioning',
  'dishwasher': 'Dishwasher',
  'dw': 'Dishwasher',
  'hardwood': 'Hardwood Floors',
  'hardwood floors': 'Hardwood Floors',
  'wood floors': 'Hardwood Floors',
  'pool': 'Pool',
  'swimming pool': 'Pool',
  'gym': 'Gym',
  'fitness center': 'Gym',
  'fitness': 'Gym',
  'workout room': 'Gym',
  'parking': 'Parking',
  'garage': 'Garage Parking',
  'garage parking': 'Garage Parking',
  'ev charging': 'EV Charging',
  'electric vehicle charging': 'EV Charging',
  'balcony': 'Balcony',
  'patio': 'Patio',
  'private patio': 'Patio',
  'rooftop': 'Rooftop Deck',
  'rooftop deck': 'Rooftop Deck',
  'roof deck': 'Rooftop Deck',
  'doorman': 'Doorman',
  'concierge': 'Concierge',
  'elevator': 'Elevator',
  'storage': 'Storage',
  'storage unit': 'Storage',
  'gated': 'Gated Entry',
  'gated entry': 'Gated Entry',
  'security': 'Security',
  'stainless steel': 'Stainless Steel Appliances',
  'stainless steel appliances': 'Stainless Steel Appliances',
  'walk-in closet': 'Walk-In Closet',
  'walk in closet': 'Walk-In Closet',
  'furnished': 'Furnished',
  'pet friendly': 'Pet Friendly',
  'cats allowed': 'Cats Allowed',
  'dogs allowed': 'Dogs Allowed',
};

export function normalizeAmenities(raw: string[]): string[] {
  const normalized = new Set<string>();

  for (const amenity of raw) {
    const lower = amenity.toLowerCase().trim();
    const canonical = AMENITY_MAP[lower];
    if (canonical) {
      normalized.add(canonical);
    } else {
      // Title case unrecognized amenities
      const titleCased = lower
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      normalized.add(titleCased);
    }
  }

  return Array.from(normalized).sort();
}

// ─── Master Normalization Function ──────────────────────────────

export function normalizeRawListing(raw: RawListing): NormalizedListing {
  const address = raw.address
    ? normalizeAddress(raw.address)
    : 'Address Unknown, Los Angeles, CA';

  const location = extractNeighborhood(address, raw.description);

  const propertyType: PropertyType = raw.propertyType
    ? inferPropertyType(raw.propertyType, raw.description)
    : inferPropertyType(raw.title, raw.description);

  const price = raw.price ?? 0;
  const priceValidation = validatePrice(price);
  if (!priceValidation.valid) {
    console.error(
      `[normalize] Suspicious price $${price} for "${raw.title}": ${priceValidation.reason}`,
    );
  }

  const parkingAvailable =
    raw.parking != null
      ? !/\bno\b|\bnone\b|\bn\/a\b/i.test(raw.parking)
      : false;

  return {
    title: raw.title.trim(),
    description: raw.description?.trim() ?? null,
    address,
    location,
    price,
    latitude: raw.latitude,
    longitude: raw.longitude,
    bedrooms: raw.bedrooms ?? 0,
    bathrooms: raw.bathrooms ?? 1,
    square_feet: raw.sqft,
    amenities: normalizeAmenities(raw.amenities),
    photos: raw.photos,
    pet_policy: raw.petPolicy?.trim() ?? null,
    parking_available: parkingAvailable,
    available_date: raw.availableDate,
    listing_url: raw.sourceUrl,
    property_type: propertyType,
    source_id: raw.sourceId,
    source_name: raw.sourceName,
    source_url: raw.sourceUrl,
    last_crawled_at: raw.crawledAt,
    is_active: true,
    raw_data: raw.rawData ?? null,
  };
}
