'use client';

import MapListingsPanel from '@/components/MapListingsPanel';

export default function MapDemoPage() {
  return (
    <div className="h-screen w-screen bg-background">
      <div className="h-full w-full p-4">
        <div className="h-full border rounded-lg overflow-hidden">
          <MapListingsPanel />
        </div>
      </div>
    </div>
  );
}
