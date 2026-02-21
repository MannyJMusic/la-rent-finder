'use client';

import { Listing } from '@/lib/types/listing';
import { cn } from '@/lib/utils';
import { Bed, Bath, Maximize, MapPin } from 'lucide-react';

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function ListingCard({ listing, onClick, isSelected }: ListingCardProps) {
  // Calculate score badge color
  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:shadow-lg cursor-pointer',
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <MapPin className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Score Badge */}
        {listing.score !== undefined && (
          <div className="absolute top-2 right-2">
            <div
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-lg',
                getScoreColor(listing.score)
              )}
            >
              {listing.score}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="mb-2">
          <span className="text-2xl font-bold text-primary">
            ${listing.price.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>

        {/* Title */}
        <h3 className="mb-2 line-clamp-1 text-base font-semibold">
          {listing.title}
        </h3>

        {/* Details */}
        <div className="mb-2 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{listing.bedrooms} bd</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{listing.bathrooms} ba</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="h-4 w-4" />
            <span>{listing.sqft} sqft</span>
          </div>
        </div>

        {/* Neighborhood */}
        {listing.neighborhood && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{listing.neighborhood}</span>
          </div>
        )}
      </div>
    </div>
  );
}
