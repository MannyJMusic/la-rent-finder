'use client';

import { User } from '@supabase/supabase-js';
import { useState, useCallback, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { MessageSquare, Map, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import ChatPanel from './ChatPanel';
import MapListingsPanel from './MapListingsPanel';
import DetailPanel from './DetailPanel';
import { Button } from './ui/button';
import { Listing } from '@/lib/types/listing';

interface DashboardLayoutProps {
  user: User;
}

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  const [showChat, setShowChat] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Shared state for communication between panels
  const [chatListings, setChatListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

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

  // Handle listing selection from the map/grid
  const handleListingSelect = useCallback((listing: Listing) => {
    setSelectedListing(listing);
    // On mobile, show the details panel when a listing is selected
    if (isMobile) {
      setShowDetails(true);
      setShowChat(false);
    }
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col">
      <DashboardHeader user={user} />

      {/* Mobile Toggle Buttons */}
      {isMobile && (
        <div className="flex items-center gap-2 p-2 border-b bg-background">
          <Button
            variant={showChat ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) setShowDetails(false);
            }}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
          <Button
            variant={!showChat && !showDetails ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowChat(false);
              setShowDetails(false);
            }}
          >
            <Map className="h-4 w-4 mr-1" />
            Map
          </Button>
          <Button
            variant={showDetails ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowDetails(!showDetails);
              if (!showDetails) setShowChat(false);
            }}
          >
            <Info className="h-4 w-4 mr-1" />
            Details
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          // Mobile: Single panel view
          <div className="h-full">
            {showChat && (
              <ChatPanel onListingsReceived={handleListingsReceived} />
            )}
            {!showChat && !showDetails && (
              <MapListingsPanel
                chatListings={chatListings}
                onListingSelect={handleListingSelect}
                selectedListing={selectedListing}
              />
            )}
            {showDetails && <DetailPanel listing={selectedListing} />}
          </div>
        ) : (
          // Desktop: Resizable panels
          <Group orientation="horizontal" className="h-full">
            {/* Left Panel: Chat */}
            {showChat && (
              <>
                <Panel defaultSize={25} minSize={20} maxSize={35}>
                  <ChatPanel onListingsReceived={handleListingsReceived} />
                </Panel>
                <Separator className="w-1 bg-border hover:bg-primary transition-colors" />
              </>
            )}

            {/* Center Panel: Map/Listings */}
            <Panel defaultSize={showChat && showDetails ? 50 : showChat || showDetails ? 75 : 100} minSize={30}>
              <div className="relative h-full">
                <MapListingsPanel
                  chatListings={chatListings}
                  onListingSelect={handleListingSelect}
                  selectedListing={selectedListing}
                />

                {/* Toggle buttons for side panels */}
                {!showChat && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-2 z-10"
                    onClick={() => setShowChat(true)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {!showDetails && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-2 z-10"
                    onClick={() => setShowDetails(true)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Panel>

            {/* Right Panel: Details */}
            {showDetails && (
              <>
                <Separator className="w-1 bg-border hover:bg-primary transition-colors" />
                <Panel defaultSize={25} minSize={20} maxSize={35}>
                  <DetailPanel listing={selectedListing} />
                </Panel>
              </>
            )}
          </Group>
        )}
      </div>
    </div>
  );
}
