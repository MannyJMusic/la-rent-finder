'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterValue } from '@/components/listings/FilterChips';
import { laNeighborhoods } from '@/lib/data/la-neighborhoods';

const NEIGHBORHOOD_NAMES = laNeighborhoods.features
  .map((f) => f.properties.name)
  .sort();

const PROPERTY_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'room'] as const;

const BEDROOM_OPTIONS = [
  { label: 'Any', value: undefined as number | undefined },
  { label: '1+', value: 1 },
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
];

interface SearchFilterPanelProps {
  filters: FilterValue;
  onFiltersChange: (filters: FilterValue) => void;
}

export default function SearchFilterPanel({ filters, onFiltersChange }: SearchFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [priceMinInput, setPriceMinInput] = useState(
    filters.priceRange ? String(filters.priceRange.min) : ''
  );
  const [priceMaxInput, setPriceMaxInput] = useState(
    filters.priceRange ? String(filters.priceRange.max) : ''
  );
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync price inputs when filters reset externally
  useEffect(() => {
    if (!filters.priceRange) {
      setPriceMinInput('');
      setPriceMaxInput('');
    }
  }, [filters.priceRange]);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length > 0) {
      const matches = NEIGHBORHOOD_NAMES.filter((n) =>
        n.toLowerCase().includes(value.toLowerCase())
      );
      setSearchSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const addNeighborhoodFromSearch = (name: string) => {
    const current = filters.neighborhood ?? [];
    if (!current.includes(name)) {
      onFiltersChange({ ...filters, neighborhood: [...current, name] });
    }
    setSearchQuery('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  const applyPriceRange = () => {
    const min = parseInt(priceMinInput, 10);
    const max = parseInt(priceMaxInput, 10);
    if (!isNaN(min) && !isNaN(max) && min >= 0 && max > min) {
      onFiltersChange({ ...filters, priceRange: { min, max } });
    } else if (priceMinInput === '' && priceMaxInput === '') {
      const { priceRange: _removed, ...rest } = filters;
      onFiltersChange(rest);
    }
  };

  const togglePropertyType = (type: string, checked: boolean) => {
    const current = filters.propertyType ?? [];
    const updated = checked ? [...current, type] : current.filter((t) => t !== type);
    onFiltersChange({ ...filters, propertyType: updated.length > 0 ? updated : undefined });
  };

  const toggleNeighborhood = (name: string, checked: boolean) => {
    const current = filters.neighborhood ?? [];
    const updated = checked ? [...current, name] : current.filter((n) => n !== name);
    onFiltersChange({ ...filters, neighborhood: updated.length > 0 ? updated : undefined });
  };

  const clearFilter = (key: keyof FilterValue) => {
    const updated = { ...filters };
    delete updated[key];
    onFiltersChange(updated);
  };

  const hasAnyFilter =
    (filters.propertyType?.length ?? 0) > 0 ||
    (filters.neighborhood?.length ?? 0) > 0 ||
    !!filters.priceRange ||
    filters.bedrooms !== undefined ||
    !!filters.pets ||
    !!filters.parking;

  return (
    <div className="flex flex-col h-full bg-card border-r overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Search &amp; Filters</h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Search with autocomplete */}
        <div ref={searchRef} className="relative">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Search Neighborhood
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Type a neighborhood..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchSuggestions.length > 0) setShowSuggestions(true);
              }}
              className="pl-9"
            />
          </div>
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-card shadow-lg max-h-48 overflow-y-auto">
              {searchSuggestions.map((name) => (
                <button
                  key={name}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    addNeighborhoodFromSearch(name);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price Range */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Price Range ($/mo)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={priceMinInput}
              onChange={(e) => setPriceMinInput(e.target.value)}
              onBlur={applyPriceRange}
              onKeyDown={(e) => e.key === 'Enter' && applyPriceRange()}
              min={0}
              step={100}
              className="w-full"
            />
            <span className="text-muted-foreground text-sm flex-shrink-0">—</span>
            <Input
              type="number"
              placeholder="Max"
              value={priceMaxInput}
              onChange={(e) => setPriceMaxInput(e.target.value)}
              onBlur={applyPriceRange}
              onKeyDown={(e) => e.key === 'Enter' && applyPriceRange()}
              min={0}
              step={100}
              className="w-full"
            />
          </div>
          {filters.priceRange && (
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                ${filters.priceRange.min.toLocaleString()} – ${filters.priceRange.max.toLocaleString()}
              </p>
              <button
                onClick={() => {
                  clearFilter('priceRange');
                  setPriceMinInput('');
                  setPriceMaxInput('');
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Bedrooms */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Bedrooms
          </label>
          <div className="flex gap-2 flex-wrap">
            {BEDROOM_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                variant={filters.bedrooms === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onFiltersChange({ ...filters, bedrooms: opt.value })}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Property Type
          </label>
          <div className="space-y-2">
            {PROPERTY_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.propertyType?.includes(type) ?? false}
                  onChange={(e) => togglePropertyType(type, e.target.checked)}
                  className="rounded border-input h-4 w-4 accent-primary"
                />
                <span className="text-sm capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Neighborhoods */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Neighborhoods
            </label>
            {(filters.neighborhood?.length ?? 0) > 0 && (
              <button
                onClick={() => clearFilter('neighborhood')}
                className="text-xs text-primary hover:underline"
              >
                Clear ({filters.neighborhood!.length})
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
            {NEIGHBORHOOD_NAMES.map((name) => (
              <label key={name} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="checkbox"
                  checked={filters.neighborhood?.includes(name) ?? false}
                  onChange={(e) => toggleNeighborhood(name, e.target.checked)}
                  className="rounded border-input h-4 w-4 accent-primary"
                />
                <span className="text-sm">{name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pet-Friendly Toggle */}
        <div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium">Pet-Friendly</span>
            <button
              role="switch"
              aria-checked={filters.pets ?? false}
              onClick={() =>
                onFiltersChange({ ...filters, pets: filters.pets ? undefined : true })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filters.pets ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  filters.pets ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Parking Toggle */}
        <div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium">Parking Included</span>
            <button
              role="switch"
              aria-checked={filters.parking ?? false}
              onClick={() =>
                onFiltersChange({ ...filters, parking: filters.parking ? undefined : true })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                filters.parking ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  filters.parking ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Clear All */}
        {hasAnyFilter && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onFiltersChange({});
              setPriceMinInput('');
              setPriceMaxInput('');
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </div>
    </div>
  );
}
