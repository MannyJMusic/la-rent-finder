'use client';

import { Map, List, Filter, Grid3x3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback, useEffect } from 'react';
import MapboxMap from '@/components/map/MapboxMap';
import { Listing, MapBounds } from '@/lib/types/listing';
import ListingGrid from '@/components/listings/ListingGrid';
import SortDropdown, { SortOption } from '@/components/listings/SortDropdown';
import FilterChips, { FilterValue } from '@/components/listings/FilterChips';

interface MapListingsPanelProps {
  /** Listings received from chat SSE events, to be merged with API results */
  chatListings?: Listing[];
  /** Callback when a listing is selected */
  onListingSelect?: (listing: Listing) => void;
  /** Currently selected listing */
  selectedListing?: Listing | null;
}

// Map SortOption to API sort param
const sortOptionToApi: Record<SortOption, string> = {
  score: 'score',
  price: 'price_asc',
  date: 'date',
  distance: 'score', // fallback: no distance sort on API
};

export default function MapListingsPanel({
  chatListings,
  onListingSelect: onListingSelectProp,
  selectedListing: selectedListingProp,
}: MapListingsPanelProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('map');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [filters, setFilters] = useState<FilterValue>({});
  const [displayedCount, setDisplayedCount] = useState(20);

  // API data state
  const [apiListings, setApiListings] = useState<Listing[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Use prop-controlled selected listing or internal state
  const activeSelectedListing = selectedListingProp !== undefined ? selectedListingProp : selectedListing;

  // Fetch listings from real API
  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      // Apply filters
      if (filters.priceRange) {
        params.set('min_price', filters.priceRange.min.toString());
        params.set('max_price', filters.priceRange.max.toString());
      }
      if (filters.bedrooms !== undefined) {
        params.set('min_bedrooms', filters.bedrooms.toString());
      }
      if (filters.neighborhood && filters.neighborhood.length > 0) {
        params.set('neighborhood', filters.neighborhood.join(','));
      }
      if (filters.pets !== undefined) {
        params.set('pet_friendly', filters.pets.toString());
      }
      if (filters.parking !== undefined) {
        params.set('parking', filters.parking.toString());
      }
      if (filters.propertyType && filters.propertyType.length > 0) {
        params.set('property_type', filters.propertyType.join(','));
      }

      // Apply sort
      params.set('sort', sortOptionToApi[sortBy] || 'score');

      // Pagination
      params.set('limit', '100');
      params.set('offset', '0');

      const res = await fetch(`/api/listings?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        console.error('Failed to fetch listings:', res.status);
        return;
      }

      const data = await res.json();
      const listings: Listing[] = (data.listings || []).map((l: Listing) => ({
        ...l,
        imageUrl: l.imageUrl || l.image_url,
      }));

      setApiListings(listings);
      setTotalListings(data.total || listings.length);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy]);

  // Fetch on mount and when filters/sort change
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Merge API listings with chat listings (chat listings take precedence/are appended)
  const allListings = useMemo(() => {
    if (!chatListings || chatListings.length === 0) {
      return apiListings;
    }

    // Merge: chat listings are shown first (they are the most relevant),
    // then API listings that aren't duplicates
    const chatIds = new Set(chatListings.map((l) => l.id));
    const uniqueApiListings = apiListings.filter((l) => !chatIds.has(l.id));
    return [...chatListings, ...uniqueApiListings];
  }, [apiListings, chatListings]);

  // Client-side filter for neighborhood (if API doesn't support multi-value)
  const filteredListings = useMemo(() => {
    let result = [...allListings];

    // Additional client-side filtering if needed
    if (filters.neighborhood && filters.neighborhood.length > 0) {
      result = result.filter((l) =>
        filters.neighborhood?.includes(l.neighborhood || '')
      );
    }

    return result;
  }, [allListings, filters]);

  // Sort listings based on selected sort option
  const sortedListings = useMemo(() => {
    const result = [...filteredListings];

    switch (sortBy) {
      case 'score':
        result.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'date':
        result.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'distance':
        result.sort((a, b) => a.latitude - b.latitude);
        break;
    }

    return result;
  }, [filteredListings, sortBy]);

  // Paginated listings for infinite scroll
  const displayedListings = useMemo(() => {
    return sortedListings.slice(0, displayedCount);
  }, [sortedListings, displayedCount]);

  const hasMore = displayedCount < sortedListings.length;

  const handleListingSelect = (listing: Listing) => {
    setSelectedListing(listing);
    onListingSelectProp?.(listing);
  };

  const handleBoundsChange = (bounds: MapBounds) => {
    setMapBounds(bounds);
  };

  const handleLoadMore = useCallback(() => {
    setDisplayedCount((prev) => Math.min(prev + 20, sortedListings.length));
  }, [sortedListings.length]);

  const handleRemoveFilter = (key: keyof FilterValue) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const handleClearAllFilters = () => {
    setFilters({});
  };

  // Demo function to apply sample filters (for testing)
  const applySampleFilters = () => {
    setFilters({
      neighborhood: ['Santa Monica', 'Venice'],
      priceRange: { min: 2000, max: 4000 },
      bedrooms: 2,
      propertyType: ['house'],
    });
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Toolbar */}
      <div className="border-b p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <Map className="h-4 w-4 mr-1" />
              Map
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                `${sortedListings.length} listings`
              )}
            </span>
            {(viewMode === 'grid' || viewMode === 'list') && (
              <SortDropdown value={sortBy} onChange={setSortBy} />
            )}
            <Button variant="outline" size="sm" onClick={applySampleFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </div>
        </div>

        {/* Filter Chips */}
        <FilterChips
          filters={filters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading && !hasLoadedOnce ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading listings...</p>
            </div>
          </div>
        ) : viewMode === 'map' ? (
          <MapboxMap
            listings={sortedListings}
            selectedListing={activeSelectedListing}
            onListingSelect={handleListingSelect}
            onBoundsChange={handleBoundsChange}
          />
        ) : viewMode === 'grid' ? (
          <ListingGrid
            listings={displayedListings}
            selectedListing={activeSelectedListing}
            onListingSelect={handleListingSelect}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
              {displayedListings.map((listing) => (
                <div
                  key={listing.id}
                  className={`border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors ${
                    activeSelectedListing?.id === listing.id
                      ? 'bg-accent border-primary'
                      : ''
                  }`}
                  onClick={() => handleListingSelect(listing)}
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-muted rounded-md flex-shrink-0 overflow-hidden">
                      {listing.imageUrl ? (
                        <img
                          src={listing.imageUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {listing.bedrooms} bed &bull; {listing.bathrooms} bath &bull;{' '}
                        {listing.sqft} sqft
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        ${listing.price.toLocaleString()}/mo
                      </p>
                      {listing.score !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Score: {listing.score}/100
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Infinite scroll for list view */}
            {hasMore && (
              <div className="flex justify-center py-8">
                <Button variant="outline" size="sm" onClick={handleLoadMore}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
