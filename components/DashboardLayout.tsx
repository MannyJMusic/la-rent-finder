'use client';

import { User } from '@supabase/supabase-js';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Map, SlidersHorizontal } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import MapListingsPanel from './MapListingsPanel';
import SearchFilterPanel from './SearchFilterPanel';
import FloatingChatWidget from './FloatingChatWidget';
import { Button } from './ui/button';
import { Listing } from '@/lib/types/listing';
import { FilterValue } from './listings/FilterChips';

interface DashboardLayoutProps {
  user: User;
}

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Shared state for communication between panels
  const [chatListings, setChatListings] = useState<Listing[]>([]);
  const [filters, setFilters] = useState<FilterValue>({});

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle listings received from the chat SSE stream
  const handleListingsReceived = useCallback((listings: Listing[]) => {
    setChatListings(listings);
  }, []);

  // Handle listing selection — navigate to dedicated property page
  const handleListingSelect = useCallback(
    (listing: Listing) => {
      router.push(`/properties/${listing.id}`);
    },
    [router]
  );

  return (
    <div className="h-screen flex flex-col">
      <DashboardHeader user={user} />

      {/* Mobile Toggle Buttons */}
      {isMobile && (
        <div className="flex items-center gap-2 p-2 border-b bg-background">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <Button
            variant={!showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(false)}
          >
            <Map className="h-4 w-4 mr-1" />
            Map
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          // Mobile: single panel — filter sidebar OR map
          <div className="h-full">
            {showFilters ? (
              <SearchFilterPanel filters={filters} onFiltersChange={setFilters} />
            ) : (
              <MapListingsPanel
                chatListings={chatListings}
                onListingSelect={handleListingSelect}
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}
          </div>
        ) : (
          // Desktop: two-column layout — filter sidebar + map/listings
          <div className="flex h-full">
            {/* Left Panel: Search & Filters */}
            <div className="w-[25%] min-w-[280px] max-w-[420px] h-full overflow-hidden border-r border-border">
              <SearchFilterPanel filters={filters} onFiltersChange={setFilters} />
            </div>

            {/* Center Panel: Map/Listings — full remaining width */}
            <div className="flex-1 min-w-0 h-full">
              <MapListingsPanel
                chatListings={chatListings}
                onListingSelect={handleListingSelect}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Widget — fixed position, outside layout flow */}
      <FloatingChatWidget onListingsReceived={handleListingsReceived} />
    </div>
  );
}
