'use client';

import { Listing } from '@/lib/types/listing';
import ListingCard from './ListingCard';
import { useEffect, useRef, useState } from 'react';

interface ListingGridProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingSelect?: (listing: Listing) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function ListingGrid({
  listings,
  selectedListing,
  onListingSelect,
  onLoadMore,
  hasMore = false,
}: ListingGridProps) {
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && onLoadMore) {
          setIsLoading(true);
          onLoadMore();
          // Reset loading state after a delay
          setTimeout(() => setIsLoading(false), 1000);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  if (listings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No listings found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Responsive grid: 1 col mobile, 2 col tablet, 3+ col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => onListingSelect?.(listing)}
              isSelected={selectedListing?.id === listing.id}
            />
          ))}
        </div>

        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-8">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Loading more...</span>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
