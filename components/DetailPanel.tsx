'use client';

import { useState, useEffect } from 'react';
import {
  Info,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  Heart,
  HeartOff,
  Mail,
  Loader2,
  Bed,
  Bath,
  Maximize,
  Clock,
  CheckCircle,
  XCircle,
  PawPrint,
  Car,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Listing } from '@/lib/types/listing';
import { CostEstimate } from '@/lib/types/chat';

interface DetailPanelProps {
  listing?: Listing | null;
}

export default function DetailPanel({ listing }: DetailPanelProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enrichment state
  const [enrichedListing, setEnrichedListing] = useState<Record<string, unknown> | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Reset state when listing changes
  const [lastListingId, setLastListingId] = useState<string | null>(null);
  if (listing && listing.id !== lastListingId) {
    setLastListingId(listing.id);
    setIsSaved(false);
    setCostEstimate(null);
    setScheduleSuccess(false);
    setEmailSuccess(false);
    setError(null);
    setEnrichedListing(null);
    setPhotoIndex(0);
  }

  // Fetch enriched data from API when listing changes
  useEffect(() => {
    if (!listing?.id) return;

    let cancelled = false;
    setIsEnriching(true);

    fetch(`/api/listings/${listing.id}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch listing details');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setEnrichedListing(data.listing ?? null);
        setIsSaved(!!data.is_saved);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[DetailPanel] Enrichment fetch failed:', err);
      })
      .finally(() => {
        if (!cancelled) setIsEnriching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listing?.id]);

  // Save / Unsave listing
  const handleToggleSave = async () => {
    if (!listing) return;
    setIsSaving(true);
    setError(null);

    try {
      if (isSaved) {
        const res = await fetch(`/api/listings/${listing.id}/save`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok && res.status !== 204) throw new Error('Failed to unsave');
        setIsSaved(false);
      } else {
        const res = await fetch(`/api/listings/${listing.id}/save`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to save');
        setIsSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing');
    } finally {
      setIsSaving(false);
    }
  };

  // Schedule viewing
  const handleScheduleViewing = async () => {
    if (!listing) return;
    setIsScheduling(true);
    setError(null);
    setScheduleSuccess(false);

    try {
      // Schedule for tomorrow at 10 AM as a reasonable default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          apartment_id: listing.id,
          scheduled_time: tomorrow.toISOString(),
          notes: `Viewing request for ${listing.title}`,
        }),
      });

      if (!res.ok) throw new Error('Failed to schedule viewing');
      setScheduleSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule viewing');
    } finally {
      setIsScheduling(false);
    }
  };

  // Get cost estimate
  const handleGetEstimate = async () => {
    if (!listing) return;
    setIsEstimating(true);
    setError(null);

    try {
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ apartment_id: listing.id }),
      });

      if (!res.ok) throw new Error('Failed to get cost estimate');

      const data = await res.json();
      const raw = data.estimate;
      // Transform flat DB estimate into CostEstimate shape
      setCostEstimate({
        moveIn: {
          'First Month': raw.first_month_rent ?? 0,
          'Last Month': raw.last_month_rent ?? 0,
          'Security Deposit': raw.security_deposit ?? 0,
          ...(raw.pet_deposit ? { 'Pet Deposit': raw.pet_deposit } : {}),
          'Application Fee': raw.application_fee ?? 0,
          ...(raw.broker_fee ? { 'Broker Fee': raw.broker_fee } : {}),
          'Total': raw.move_in_total ?? 0,
        },
        monthly: {
          'Rent': raw.monthly_rent ?? 0,
          'Utilities': raw.utilities_estimate ?? 0,
          ...(raw.parking_fee ? { 'Parking': raw.parking_fee } : {}),
          ...(raw.pet_rent ? { 'Pet Rent': raw.pet_rent } : {}),
          'Insurance': raw.renters_insurance ?? 0,
          'Total': raw.monthly_total ?? 0,
        },
        moving: {
          'Movers': raw.moving_company_quote ?? 0,
          'Packing': raw.packing_materials ?? 0,
          ...(raw.storage_costs ? { 'Storage': raw.storage_costs } : {}),
          'Total': raw.moving_total ?? 0,
        },
        grandTotal: (raw.move_in_total ?? 0) + (raw.moving_total ?? 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get estimate');
    } finally {
      setIsEstimating(false);
    }
  };

  // Contact via email
  const handleContactEmail = async () => {
    if (!listing) return;
    setIsSendingEmail(true);
    setError(null);
    setEmailSuccess(false);

    try {
      const res = await fetch('/api/communications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          apartment_id: listing.id,
          subject: `Inquiry about ${listing.title}`,
          body: `Hi, I am interested in the property at ${listing.address} listed at $${listing.price.toLocaleString()}/mo. Could you please provide more information and availability for a viewing? Thank you.`,
        }),
      });

      if (!res.ok) throw new Error('Failed to send email');
      setEmailSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!listing) {
    return (
      <div className="flex flex-col h-full bg-card border-l">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Property Details</h2>
          </div>
        </div>

        {/* Empty Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center text-muted-foreground py-8">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select a property to view details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Property Details</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSave}
            disabled={isSaving}
            title={isSaved ? 'Unsave property' : 'Save property'}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSaved ? (
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            ) : (
              <HeartOff className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Photo carousel */}
        {(() => {
          const enrichedPhotos = enrichedListing?.photos as string[] | undefined;
          const photos: string[] = (enrichedPhotos?.length ? enrichedPhotos : listing.photos) ?? [];
          // Fall back to single hero image
          if (photos.length === 0) {
            const fallback = listing.imageUrl || listing.image_url;
            if (fallback) photos.push(fallback);
          }
          const total = photos.length;
          const safeIndex = total > 0 ? Math.min(photoIndex, total - 1) : 0;

          return (
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
              {total > 0 ? (
                <>
                  <img
                    src={photos[safeIndex]}
                    alt={`${listing.title} - Photo ${safeIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {total > 1 && (
                    <>
                      <button
                        onClick={() => setPhotoIndex(safeIndex === 0 ? total - 1 : safeIndex - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPhotoIndex(safeIndex === total - 1 ? 0 : safeIndex + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {safeIndex + 1} / {total}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
            </div>
          );
        })()}

        {/* Title and address */}
        <div>
          <h3 className="text-xl font-bold mb-2">{listing.title}</h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            <span>{listing.address}</span>
          </div>
        </div>

        {/* Score badge */}
        {listing.score !== undefined && (
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                listing.score >= 80
                  ? 'bg-green-500'
                  : listing.score >= 60
                  ? 'bg-blue-500'
                  : listing.score >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            >
              Score: {listing.score}/100
            </div>
          </div>
        )}

        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Rent</span>
            </div>
            <p className="font-bold">${listing.price.toLocaleString()}/mo</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Home className="h-4 w-4" />
              <span className="text-xs">Neighborhood</span>
            </div>
            <p className="font-bold text-sm">{listing.neighborhood || 'N/A'}</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bed className="h-4 w-4" />
              <span className="text-xs">Bedrooms</span>
            </div>
            <p className="font-bold">{listing.bedrooms}</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Bath className="h-4 w-4" />
              <span className="text-xs">Bathrooms</span>
            </div>
            <p className="font-bold">{listing.bathrooms}</p>
          </div>
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Maximize className="h-4 w-4" />
              <span className="text-xs">Size</span>
            </div>
            <p className="font-bold">{listing.sqft} sqft</p>
          </div>
          {listing.available_date && (
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Available</span>
              </div>
              <p className="font-bold text-sm">
                {new Date(listing.available_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Pet Policy & Parking */}
        {(() => {
          const petPolicy = (enrichedListing?.pet_policy as string) || listing.pet_policy;
          return (
            <div className="flex flex-wrap gap-2">
              {petPolicy ? (
                <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                  <PawPrint className="h-3 w-3" />
                  {petPolicy}
                </div>
              ) : listing.pet_friendly ? (
                <div className="flex items-center gap-1 text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                  <PawPrint className="h-3 w-3" />
                  Pet-Friendly
                </div>
              ) : null}
              {listing.parking && (
                <div className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                  <Car className="h-3 w-3" />
                  Parking
                </div>
              )}
            </div>
          );
        })()}

        {/* Amenities */}
        {(() => {
          const amenities = (enrichedListing?.amenities as string[]) || listing.amenities;
          if (!amenities || amenities.length === 0) return null;
          return (
            <div>
              <h4 className="font-semibold text-sm mb-2">Amenities</h4>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((amenity: string, i: number) => (
                  <span
                    key={`${amenity}-${i}`}
                    className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Description */}
        {(() => {
          const description = (enrichedListing?.description as string) || listing.description;
          return (
            <div>
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                Description
                {isEnriching && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </h4>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : isEnriching ? (
                <p className="text-sm text-muted-foreground italic">Loading details...</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available</p>
              )}
            </div>
          );
        })()}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Cost Estimate Section */}
        {costEstimate && (
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Cost Estimate
            </h4>

            {costEstimate.moveIn && Object.keys(costEstimate.moveIn).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Move-In Costs</p>
                {Object.entries(costEstimate.moveIn).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span>${(value as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {costEstimate.monthly && Object.keys(costEstimate.monthly).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Monthly Costs</p>
                {Object.entries(costEstimate.monthly).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span>${(value as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Grand Total</span>
              <span className="text-primary">
                ${costEstimate.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            className="w-full"
            onClick={handleScheduleViewing}
            disabled={isScheduling || scheduleSuccess}
          >
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : scheduleSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Viewing Scheduled
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Viewing
              </>
            )}
          </Button>

          <Button
            className="w-full"
            variant="outline"
            onClick={handleGetEstimate}
            disabled={isEstimating || costEstimate !== null}
          >
            {isEstimating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Estimating...
              </>
            ) : costEstimate ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Estimate Ready
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Get Cost Estimate
              </>
            )}
          </Button>

          <Button
            className="w-full"
            variant="outline"
            onClick={handleContactEmail}
            disabled={isSendingEmail || emailSuccess}
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : emailSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Email Sent
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Contact via Email
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
