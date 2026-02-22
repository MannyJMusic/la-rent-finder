'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Scale,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardHeader from '@/components/DashboardHeader';
import CostComparison, { type PropertyEstimate } from '@/components/costs/CostComparison';
import CostBreakdown, { type CostEstimate } from '@/components/costs/CostBreakdown';

interface SavedListing {
  id: string;
  apartment_id: string;
  properties: {
    id: string;
    title: string;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    neighborhood?: string;
    image_url?: string;
  };
}

export default function ComparePage() {
  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [estimates, setEstimates] = useState<Record<string, CostEstimate>>({});
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // Fetch saved listings
  const fetchSavedListings = useCallback(async () => {
    try {
      setLoadingSaved(true);
      setError(null);
      const res = await fetch('/api/listings/saved');
      if (!res.ok) throw new Error('Failed to fetch saved listings');
      const data = await res.json();
      setSavedListings(data.saved ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved listings');
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedListings();
  }, [fetchSavedListings]);

  // Toggle listing selection
  const toggleSelection = (apartmentId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(apartmentId)) {
        return prev.filter((id) => id !== apartmentId);
      }
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, apartmentId];
    });
    // Reset comparison view when selection changes
    setShowComparison(false);
  };

  // Fetch estimates for selected listings
  const fetchEstimates = useCallback(async () => {
    if (selectedIds.length < 2) return;

    setLoadingEstimates(true);
    setError(null);

    try {
      // First try fetching existing estimates from the compare endpoint
      const compareRes = await fetch(
        `/api/estimates/compare?apartment_ids=${selectedIds.join(',')}`
      );

      let existingEstimates: Record<string, CostEstimate> = {};

      if (compareRes.ok) {
        const compareData = await compareRes.json();
        for (const est of compareData.estimates ?? []) {
          if (est.listing_id) {
            existingEstimates[est.listing_id] = est;
          }
        }
      }

      // Generate estimates for any listings that don't have one yet
      const missingIds = selectedIds.filter((id) => !existingEstimates[id]);

      const newEstimatePromises = missingIds.map(async (apartmentId) => {
        const res = await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apartment_id: apartmentId }),
        });
        if (!res.ok) {
          throw new Error(`Failed to generate estimate for ${apartmentId}`);
        }
        const data = await res.json();
        return { apartmentId, estimate: data.estimate as CostEstimate };
      });

      const newEstimates = await Promise.all(newEstimatePromises);

      const allEstimates: Record<string, CostEstimate> = { ...existingEstimates };
      for (const { apartmentId, estimate } of newEstimates) {
        allEstimates[apartmentId] = estimate;
      }

      setEstimates(allEstimates);
      setShowComparison(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cost estimates');
    } finally {
      setLoadingEstimates(false);
    }
  }, [selectedIds]);

  // Filter saved listings by search
  const filteredListings = savedListings.filter((item) => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    const apt = item.properties;
    return (
      apt.title?.toLowerCase().includes(search) ||
      apt.address?.toLowerCase().includes(search) ||
      apt.neighborhood?.toLowerCase().includes(search)
    );
  });

  // Build comparison data
  const comparisonProperties = selectedIds.reduce<PropertyEstimate[]>((acc, id) => {
    const saved = savedListings.find((s) => s.properties.id === id);
    const estimate = estimates[id];
    if (saved && estimate) {
      acc.push({
        id: saved.properties.id,
        title: saved.properties.title,
        address: saved.properties.address,
        price: saved.properties.price,
        estimate,
      });
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Dashboard
                </a>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Compare Costs</h1>
                <p className="text-muted-foreground mt-1">
                  Select 2-4 saved properties to compare side-by-side costs
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-400 hover:text-red-300"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Selection Status Bar */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        selectedIds.length >= 2
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                      }
                    >
                      {selectedIds.length} / 4 selected
                    </Badge>
                    {selectedIds.length < 2 && (
                      <span className="text-xs text-muted-foreground">
                        Select at least 2 to compare
                      </span>
                    )}
                  </div>
                  {selectedIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        setSelectedIds([]);
                        setShowComparison(false);
                      }}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <Button
                  disabled={selectedIds.length < 2 || loadingEstimates}
                  onClick={fetchEstimates}
                >
                  {loadingEstimates ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating estimates...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4 mr-2" />
                      Compare ({selectedIds.length})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {showComparison && comparisonProperties.length >= 2 && (
            <div className="mb-8">
              <div className="hidden md:block">
                <CostComparison properties={comparisonProperties} />
              </div>
              {/* On mobile, show individual breakdowns stacked */}
              <div className="md:hidden space-y-6">
                {comparisonProperties.map((prop) => (
                  <CostBreakdown
                    key={prop.id}
                    estimate={prop.estimate}
                    title={prop.title}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Listing Selection Grid */}
          {!showComparison && (
            <>
              {/* Search Filter */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search saved listings..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loadingSaved ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-lg border bg-card animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredListings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h2 className="text-lg font-semibold mb-2">
                      {savedListings.length === 0
                        ? 'No saved listings yet'
                        : 'No results match your search'}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {savedListings.length === 0
                        ? 'Save some properties from the dashboard first, then come back here to compare their costs.'
                        : 'Try a different search term.'}
                    </p>
                    {savedListings.length === 0 && (
                      <Button className="mt-4" asChild>
                        <a href="/dashboard">Browse Listings</a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredListings.map((item) => {
                    const apt = item.properties;
                    const isSelected = selectedIds.includes(apt.id);
                    const isDisabled = !isSelected && selectedIds.length >= 4;

                    return (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-2 ring-primary border-primary bg-primary/5'
                            : isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => !isDisabled && toggleSelection(apt.id)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center gap-4">
                            {/* Selection Indicator */}
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>

                            {/* Image Thumbnail */}
                            {apt.image_url ? (
                              <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
                                <img
                                  src={apt.image_url}
                                  alt={apt.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                                <Scale className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                            )}

                            {/* Listing Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm truncate">
                                  {apt.title}
                                </h3>
                                {apt.neighborhood && (
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                                    {apt.neighborhood}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {apt.address}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{apt.bedrooms} bd</span>
                                <span>{apt.bathrooms} ba</span>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="flex-shrink-0 text-right">
                              <p className="text-lg font-bold text-primary">
                                ${apt.price.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">/mo</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Back to selection button when showing comparison */}
          {showComparison && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setShowComparison(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Change selection
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
