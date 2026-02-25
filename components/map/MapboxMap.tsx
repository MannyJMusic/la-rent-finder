'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Listing, MapBounds } from '@/lib/types/listing';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapboxMapProps {
  listings: Listing[];
  selectedListing?: Listing | null;
  onListingSelect?: (listing: Listing) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

// LA center coordinates
const LA_CENTER: [number, number] = [-118.2437, 34.0522];
const DEFAULT_ZOOM = 11;

// Score-based color mapping
const getScoreColor = (score?: number): string => {
  if (!score) return '#6B7280'; // gray for no score
  if (score >= 70) return '#10B981'; // green for high score
  if (score >= 40) return '#F59E0B'; // yellow for medium score
  return '#EF4444'; // red for low score
};

export default function MapboxMap({
  listings,
  selectedListing,
  onListingSelect,
  onBoundsChange,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!mapboxToken || mapboxToken === 'your-mapbox-token-here') {
      setMapError('Mapbox token not configured');
      console.warn('NEXT_PUBLIC_MAPBOX_TOKEN not set. Using mock map view.');
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: LA_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('moveend', () => {
        if (map.current && onBoundsChange) {
          const bounds = map.current.getBounds();
          if (bounds) {
            onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            });
          }
        }
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onBoundsChange]);

  // Update markers when listings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add new markers
    listings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;

      const color = getScoreColor(listing.score);

      // Create marker element — outer el is positioned by Mapbox (don't touch its transform)
      const el = document.createElement('div');
      el.className = 'listing-marker';
      el.style.cssText = 'cursor: pointer;';

      // Inner div holds all visual styles + hover scale (safe from Mapbox's transform)
      const inner = document.createElement('div');
      const imageUrl = listing.imageUrl || listing.photos?.[0];

      if (imageUrl) {
        inner.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-image: url('${imageUrl}');
          background-size: cover;
          background-position: center;
          border: 3px solid ${color};
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          transition: transform 0.2s;
        `;
      } else {
        inner.style.cssText = `
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        `;
      }

      el.appendChild(inner);

      // Hover effect on inner div (not the Mapbox-positioned outer el)
      inner.addEventListener('mouseenter', () => {
        inner.style.transform = 'scale(1.2)';
      });
      inner.addEventListener('mouseleave', () => {
        inner.style.transform = 'scale(1)';
      });

      // Create marker
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 20 }).setHTML(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: bold; margin: 0 0 4px 0;">${listing.title}</h3>
              <p style="margin: 4px 0; font-size: 14px; color: #666;">${listing.address}</p>
              <p style="margin: 4px 0; font-size: 14px;">
                ${listing.bedrooms} bed • ${listing.bathrooms} bath • ${listing.sqft} sqft
              </p>
              <p style="margin: 4px 0; font-weight: bold; font-size: 16px; color: ${color};">
                $${listing.price.toLocaleString()}/mo
              </p>
              ${listing.score ? `<p style="margin: 4px 0; font-size: 12px;">Score: ${listing.score}/100</p>` : ''}
            </div>
          `)
        )
        .addTo(map.current!);

      // Click handler
      el.addEventListener('click', () => {
        if (onListingSelect) {
          onListingSelect(listing);
        }
      });

      markers.current.push(marker);
    });
  }, [listings, mapLoaded, onListingSelect]);

  // Handle selected listing
  useEffect(() => {
    if (!map.current || !selectedListing) return;

    // Fly to selected listing
    if (selectedListing.latitude && selectedListing.longitude) {
      map.current.flyTo({
        center: [selectedListing.longitude, selectedListing.latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [selectedListing]);

  // Zoom to fit all listings
  const zoomToFitListings = () => {
    if (!map.current || listings.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    listings.forEach((listing) => {
      if (listing.latitude && listing.longitude) {
        bounds.extend([listing.longitude, listing.latitude]);
      }
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    });
  };

  // Mock map view when token is not configured
  if (mapError) {
    return (
      <div className="relative h-full w-full bg-slate-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-lg font-semibold mb-2">Map View (Demo Mode)</p>
              <p className="text-sm">Configure NEXT_PUBLIC_MAPBOX_TOKEN in .env.local for interactive map</p>
            </div>
            <div className="mt-6 space-y-2">
              {listings.slice(0, 3).map((listing, i) => (
                <div
                  key={listing.id}
                  className="bg-slate-700 p-3 rounded cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={() => onListingSelect?.(listing)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getScoreColor(listing.score) }}
                    />
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium text-white">{listing.title}</p>
                      <p className="text-xs text-slate-400">${listing.price.toLocaleString()}/mo</p>
                    </div>
                  </div>
                </div>
              ))}
              {listings.length > 3 && (
                <p className="text-xs text-slate-500">+ {listings.length - 3} more listings</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {mapLoaded && listings.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomToFitListings}
            className="shadow-lg"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Fit All Listings
          </Button>
        </div>
      )}

      {mapLoaded && (
        <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>High Score (70+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Medium Score (40-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Low Score (&lt;40)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
