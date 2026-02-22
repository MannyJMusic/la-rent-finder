'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, Building, Rows3, DoorOpen, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PROPERTY_TYPE_OPTIONS, LA_NEIGHBORHOODS, TOP_NEIGHBORHOODS } from '@/lib/constants';
import type { PropertyType } from '@/lib/database.types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Building2,
  Building,
  Rows3,
  DoorOpen,
};

const TOTAL_STEPS = 3;

const BEDROOM_OPTIONS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);

  // Step 2 state
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [bedrooms, setBedrooms] = useState<number | null>(null);

  // Step 3 state
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [showAllNeighborhoods, setShowAllNeighborhoods] = useState(false);

  const toggleType = useCallback((typeId: PropertyType) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  }, []);

  const toggleNeighborhood = useCallback((neighborhood: string) => {
    setSelectedNeighborhoods((prev) =>
      prev.includes(neighborhood)
        ? prev.filter((n) => n !== neighborhood)
        : [...prev, neighborhood]
    );
  }, []);

  const goNext = () => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const savePreferences = async (skipped: boolean) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        onboarding_completed: true,
      };

      if (!skipped) {
        if (selectedTypes.length > 0) {
          body.property_types = selectedTypes;
        }
        if (minBudget) {
          body.min_budget = Number(minBudget);
        }
        if (maxBudget) {
          body.max_budget = Number(maxBudget);
        }
        if (bedrooms !== null) {
          body.min_bedrooms = bedrooms;
        }
        if (selectedNeighborhoods.length > 0) {
          body.neighborhoods = selectedNeighborhoods;
        }
      }

      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      router.push('/dashboard');
    } catch {
      setSaving(false);
    }
  };

  const displayedNeighborhoods = showAllNeighborhoods ? LA_NEIGHBORHOODS : TOP_NEIGHBORHOODS;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? 'w-8 bg-primary'
                  : i + 1 < step
                    ? 'w-2.5 bg-primary/60'
                    : 'w-2.5 bg-muted-foreground/25'
              }`}
            />
          ))}
        </div>

        {/* Step content with animation */}
        <div className="relative overflow-hidden min-h-[460px]">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <StepPropertyType
                  selectedTypes={selectedTypes}
                  onToggle={toggleType}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <StepBudgetSize
                  minBudget={minBudget}
                  maxBudget={maxBudget}
                  bedrooms={bedrooms}
                  onMinBudgetChange={setMinBudget}
                  onMaxBudgetChange={setMaxBudget}
                  onBedroomsChange={setBedrooms}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <StepNeighborhoods
                  selectedNeighborhoods={selectedNeighborhoods}
                  displayedNeighborhoods={displayedNeighborhoods}
                  showAll={showAllNeighborhoods}
                  onToggle={toggleNeighborhood}
                  onShowAll={() => setShowAllNeighborhoods(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8">
          <div>
            {step > 1 ? (
              <Button variant="secondary" onClick={goBack} disabled={saving}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          <button
            type="button"
            onClick={() => savePreferences(true)}
            disabled={saving}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>

          <div>
            {step < TOTAL_STEPS ? (
              <Button onClick={goNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => savePreferences(false)} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block"
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.span>
                    Saving...
                  </span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Find rentals
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Property Type                                            */
/* ------------------------------------------------------------------ */

function StepPropertyType({
  selectedTypes,
  onToggle,
}: {
  selectedTypes: PropertyType[];
  onToggle: (type: PropertyType) => void;
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-foreground mb-2">What type of rental?</h1>
      <p className="text-muted-foreground mb-8">Select all that interest you</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {PROPERTY_TYPE_OPTIONS.map((opt) => {
          const Icon = ICON_MAP[opt.icon];
          const isSelected = selectedTypes.includes(opt.id);

          return (
            <Card
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={`cursor-pointer p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-[1.03] ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-10 w-10 transition-colors ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              )}
              <span
                className={`text-sm font-medium transition-colors ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {opt.label}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Budget & Size                                            */
/* ------------------------------------------------------------------ */

function StepBudgetSize({
  minBudget,
  maxBudget,
  bedrooms,
  onMinBudgetChange,
  onMaxBudgetChange,
  onBedroomsChange,
}: {
  minBudget: string;
  maxBudget: string;
  bedrooms: number | null;
  onMinBudgetChange: (v: string) => void;
  onMaxBudgetChange: (v: string) => void;
  onBedroomsChange: (v: number | null) => void;
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-foreground mb-2">Budget and size?</h1>
      <p className="text-muted-foreground mb-8">Help us narrow down listings for you</p>

      {/* Budget inputs */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-foreground mb-3 text-left">
          Monthly budget
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              placeholder="Min"
              value={minBudget}
              onChange={(e) => onMinBudgetChange(e.target.value)}
              className="pl-7"
            />
          </div>
          <span className="text-muted-foreground">to</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              placeholder="Max"
              value={maxBudget}
              onChange={(e) => onMaxBudgetChange(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
      </div>

      {/* Bedroom selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3 text-left">
          Bedrooms
        </label>
        <div className="flex gap-2">
          {BEDROOM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onBedroomsChange(bedrooms === opt.value ? null : opt.value)
              }
              className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-200 border ${
                bedrooms === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Neighborhoods                                            */
/* ------------------------------------------------------------------ */

function StepNeighborhoods({
  selectedNeighborhoods,
  displayedNeighborhoods,
  showAll,
  onToggle,
  onShowAll,
}: {
  selectedNeighborhoods: string[];
  displayedNeighborhoods: string[];
  showAll: boolean;
  onToggle: (neighborhood: string) => void;
  onShowAll: () => void;
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-foreground mb-2">Where in LA?</h1>
      <p className="text-muted-foreground mb-8">Pick your preferred neighborhoods</p>

      <div className="flex flex-wrap gap-2 justify-center">
        {displayedNeighborhoods.map((neighborhood) => {
          const isSelected = selectedNeighborhoods.includes(neighborhood);
          return (
            <Badge
              key={neighborhood}
              onClick={() => onToggle(neighborhood)}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer px-3.5 py-1.5 text-sm transition-all duration-200 hover:scale-105 ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {neighborhood}
            </Badge>
          );
        })}
      </div>

      {!showAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
        >
          Show all neighborhoods
        </button>
      )}

      {selectedNeighborhoods.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {selectedNeighborhoods.length} neighborhood{selectedNeighborhoods.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
