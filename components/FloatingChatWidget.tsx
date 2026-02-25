'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { Listing } from '@/lib/types/listing';

interface FloatingChatWidgetProps {
  onListingsReceived: (listings: Listing[]) => void;
}

export default function FloatingChatWidget({ onListingsReceived }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {/* Chat overlay */}
      {isOpen && (
        <div
          className={
            isMobile
              ? 'fixed inset-0 top-16 z-50 flex flex-col bg-card shadow-2xl'
              : 'fixed bottom-20 right-4 z-50 w-[380px] h-[600px] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden'
          }
        >
          {/* Close button row */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-card flex-shrink-0">
            <span className="text-sm font-semibold">AI Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-accent transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ChatPanel fills the rest */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel onListingsReceived={onListingsReceived} />
          </div>
        </div>
      )}

      {/* FAB — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </>
  );
}
