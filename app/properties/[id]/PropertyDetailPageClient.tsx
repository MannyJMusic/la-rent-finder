'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DetailPanel from '@/components/DetailPanel';
import { Listing } from '@/lib/types/listing';

interface PropertyDetailPageClientProps {
  id: string;
}

export default function PropertyDetailPageClient({ id }: PropertyDetailPageClientProps) {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch(`/api/listings/${id}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Property not found');
        return res.json();
      })
      .then((data) => {
        const l = data.listing;
        setListing({
          ...l,
          imageUrl: l.photos?.[0] || l.imageUrl || l.image_url,
          photos: l.photos,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load property'))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <div className="h-screen flex flex-col">
      {/* Page header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 bg-background flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        {listing && (
          <h1 className="text-base font-semibold truncate text-foreground">{listing.title}</h1>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto h-full overflow-y-auto">
            <DetailPanel listing={listing} />
          </div>
        )}
      </div>
    </div>
  );
}
