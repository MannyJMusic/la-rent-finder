'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterValue {
  neighborhood?: string[];
  priceRange?: { min: number; max: number };
  bedrooms?: number;
  pets?: boolean;
  parking?: boolean;
}

interface FilterChipsProps {
  filters: FilterValue;
  onRemove: (key: keyof FilterValue) => void;
  onClearAll: () => void;
}

export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const chips: { key: keyof FilterValue; label: string }[] = [];

  // Build chips from active filters
  if (filters.neighborhood && filters.neighborhood.length > 0) {
    chips.push({ key: 'neighborhood', label: filters.neighborhood.join(', ') });
  }
  if (filters.priceRange) {
    chips.push({
      key: 'priceRange',
      label: `$${filters.priceRange.min.toLocaleString()} - $${filters.priceRange.max.toLocaleString()}`,
    });
  }
  if (filters.bedrooms !== undefined) {
    chips.push({ key: 'bedrooms', label: `${filters.bedrooms}+ beds` });
  }
  if (filters.pets) {
    chips.push({ key: 'pets', label: 'Pet-friendly' });
  }
  if (filters.parking) {
    chips.push({ key: 'parking', label: 'Parking' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <div
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          <span>{chip.label}</span>
          <button
            onClick={() => onRemove(chip.key)}
            className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-auto py-1 text-xs"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
