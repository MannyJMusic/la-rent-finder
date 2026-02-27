'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl, { GeoJSONSource } from 'mapbox-gl';
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

function listingsToGeoJSON(listings: Listing[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: listings
      .filter((l) => l.latitude && l.longitude)
      .map((l) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [l.longitude, l.latitude],
        },
        properties: {
          id: l.id,
          title: l.title,
          price: l.price,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          sqft: l.sqft,
          score: l.score ?? 0,
          imageUrl: l.imageUrl || l.photos?.[0] || '',
          address: l.address,
        },
      })),
  };
}

export default function MapboxMap({
  listings,
  selectedListing,
  onListingSelect,
  onBoundsChange,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Store callbacks in refs to avoid re-registering map events
  const onListingSelectRef = useRef(onListingSelect);
  onListingSelectRef.current = onListingSelect;
  const listingsRef = useRef(listings);
  listingsRef.current = listings;

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

      // Create reusable popup for hover
      popup.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
      });

      map.current.on('load', () => {
        const m = map.current!;

        // Add GeoJSON source with clustering
        m.addSource('listings', {
          type: 'geojson',
          data: listingsToGeoJSON(listingsRef.current),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster circles layer
        m.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'listings',
          filter: ['has', 'point_count'],
          paint: {
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              18, // default radius
              10, 24, // radius at 10+ points
              50, 32, // radius at 50+ points
            ],
            'circle-color': '#4f46e5',
            'circle-opacity': [
              'step',
              ['get', 'point_count'],
              0.7, // default opacity
              10, 0.8,
              50, 0.9,
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.3)',
          },
        });

        // Cluster count labels
        m.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'listings',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 13,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });

        // Individual unclustered points
        m.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'listings',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'step',
              ['get', 'score'],
              '#6B7280', // gray for score < 40
              40, '#F59E0B', // yellow for 40-69
              70, '#10B981', // green for 70+
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // --- Event Handlers ---

        // Click on cluster -> expand
        m.on('click', 'clusters', async (e) => {
          const features = m.queryRenderedFeatures(e.point, {
            layers: ['clusters'],
          });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          if (clusterId == null) return;
          const source = m.getSource('listings') as GeoJSONSource;
          try {
            const center = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return;
              m.easeTo({ center, zoom });
            });
          } catch {
            // ignore cluster expansion errors
          }
        });

        // Click on unclustered point -> select listing
        m.on('click', 'unclustered-point', (e) => {
          const props = e.features?.[0]?.properties;
          if (props && onListingSelectRef.current) {
            const listing = listingsRef.current.find(
              (l) => l.id === props.id
            );
            if (listing) onListingSelectRef.current(listing);
          }
        });

        // Hover on unclustered point -> show popup
        m.on('mouseenter', 'unclustered-point', (e) => {
          m.getCanvas().style.cursor = 'pointer';
          const props = e.features?.[0]?.properties;
          if (!props || !popup.current) return;
          const coords = (
            e.features![0].geometry as GeoJSON.Point
          ).coordinates.slice() as [number, number];
          popup.current
            .setLngLat(coords)
            .setHTML(
              `<div style="padding: 8px; min-width: 200px;">
                <h3 style="font-weight: bold; margin: 0 0 4px;">${props.title}</h3>
                <p style="margin: 4px 0; font-size: 14px; color: #999;">${props.address}</p>
                <p style="margin: 4px 0; font-size: 14px;">${props.bedrooms} bed &middot; ${props.bathrooms} bath &middot; ${props.sqft} sqft</p>
                <p style="margin: 4px 0; font-weight: bold; font-size: 16px; color: #10B981;">$${Number(props.price).toLocaleString()}/mo</p>
                ${props.score ? `<p style="margin: 4px 0; font-size: 12px;">Score: ${props.score}/100</p>` : ''}
              </div>`
            )
            .addTo(m);
        });

        m.on('mouseleave', 'unclustered-point', () => {
          m.getCanvas().style.cursor = '';
          popup.current?.remove();
        });

        // Cursor on clusters
        m.on('mouseenter', 'clusters', () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', 'clusters', () => {
          m.getCanvas().style.cursor = '';
        });

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
      popup.current?.remove();
      popup.current = null;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON data when listings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('listings') as GeoJSONSource | undefined;
    if (source) {
      source.setData(listingsToGeoJSON(listings));
    }
  }, [listings, mapLoaded]);

  // Handle selected listing
  useEffect(() => {
    if (!map.current || !selectedListing) return;

    if (selectedListing.latitude && selectedListing.longitude) {
      map.current.flyTo({
        center: [selectedListing.longitude, selectedListing.latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [selectedListing]);

  // Zoom to fit all listings
  const zoomToFitListings = useCallback(() => {
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
  }, [listings]);

  // Mock map view when token is not configured
  if (mapError) {
    return (
      <div className="relative h-full w-full bg-slate-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-slate-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="text-lg font-semibold mb-2">
                Map View (Demo Mode)
              </p>
              <p className="text-sm">
                Configure NEXT_PUBLIC_MAPBOX_TOKEN in .env.local for interactive
                map
              </p>
            </div>
            <div className="mt-6 space-y-2">
              {listings.slice(0, 3).map((listing) => (
                <div
                  key={listing.id}
                  className="bg-slate-700 p-3 rounded cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={() => onListingSelect?.(listing)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: getScoreColor(listing.score),
                      }}
                    />
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium text-white">
                        {listing.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        ${listing.price.toLocaleString()}/mo
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {listings.length > 3 && (
                <p className="text-xs text-slate-500">
                  + {listings.length - 3} more listings
                </p>
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
