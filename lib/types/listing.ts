export interface Listing {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  score?: number; // AI-generated score 0-100
  scoring?: Record<string, unknown>;
  imageUrl?: string;
  image_url?: string;
  photos?: string[];
  neighborhood?: string;
  description?: string;
  pet_friendly?: boolean;
  parking?: boolean;
  property_type?: 'apartment' | 'house' | 'condo' | 'townhouse' | 'room';
  available_date?: string;
  created_at?: string;
  amenities?: string[];
  pet_policy?: string;
  source_name?: string;
  source_id?: string;
  landlord_name?: string;
  square_feet?: number;
  location?: string;
  year_built?: number;
  laundry_category?: string;
  noise_score?: number;
  noise_text?: string;
  isp_download_mbps?: number;
  isp_upload_mbps?: number;
  listed_date?: string;
  reported_as_inactive?: boolean;
}

export interface ListingCluster {
  id: string;
  latitude: number;
  longitude: number;
  point_count: number;
  listings: Listing[];
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
