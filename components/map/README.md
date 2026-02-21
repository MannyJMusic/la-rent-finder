# Mapbox Map Component

## Overview
Interactive map view for displaying rental listings in Los Angeles using Mapbox GL JS.

## Features Implemented
- **Dark Map Style**: Uses Mapbox dark theme for modern look
- **Score-based Pin Coloring**:
  - Green (70-100): High scoring listings
  - Yellow (40-69): Medium scoring listings
  - Red (0-39): Low scoring listings
  - Gray: No score available
- **Interactive Markers**: Click to select listings
- **Popups**: Hover to see listing details
- **Map Controls**: Zoom, pan, and navigation
- **Zoom to Fit**: Button to fit all listings in view
- **Bounds Change Detection**: Triggers when map moves (for filtering)
- **Demo Mode**: Graceful fallback when Mapbox token not configured

## Demo Mode
When `NEXT_PUBLIC_MAPBOX_TOKEN` is not configured, the component displays a demo mode with:
- Sample listing cards with score-based color indicators
- Click-to-select functionality
- Message prompting token configuration

## Configuration

### 1. Get Mapbox Token
Sign up at https://mapbox.com and create an access token at:
https://account.mapbox.com/access-tokens/

### 2. Add to Environment
Add to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

### 3. Restart Dev Server
```bash
npm run dev
```

## Component Usage

```tsx
import MapboxMap from '@/components/map/MapboxMap';
import { Listing } from '@/lib/types/listing';

function MyComponent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const handleListingSelect = (listing: Listing) => {
    setSelectedListing(listing);
    // Update detail panel, etc.
  };

  const handleBoundsChange = (bounds: MapBounds) => {
    // Filter listings by map bounds
    // Trigger API call to fetch listings in view
  };

  return (
    <MapboxMap
      listings={listings}
      selectedListing={selectedListing}
      onListingSelect={handleListingSelect}
      onBoundsChange={handleBoundsChange}
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `listings` | `Listing[]` | Array of listings to display |
| `selectedListing` | `Listing \| null` | Currently selected listing |
| `onListingSelect` | `(listing: Listing) => void` | Callback when listing is clicked |
| `onBoundsChange` | `(bounds: MapBounds) => void` | Callback when map bounds change |

## Listing Type

```typescript
interface Listing {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  score?: number; // 0-100
  imageUrl?: string;
  neighborhood?: string;
}
```

## Future Enhancements
- [ ] Clustering for dense areas (using Mapbox cluster layers)
- [ ] LA neighborhood boundaries overlay (GeoJSON data)
- [ ] Custom marker icons for different property types
- [ ] Street view integration
- [ ] Transit overlay
- [ ] Heat map for pricing
- [ ] 3D buildings

## Testing
Test page available at: `/map-demo` (no authentication required)

## Performance Notes
- Markers are recreated when listings change
- Map initialization is cached to prevent re-renders
- Consider implementing clustering for 1000+ listings
- Demo mode has minimal overhead when token not configured
