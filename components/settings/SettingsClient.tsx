'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  DollarSign,
  Bed,
  Bath,
  MapPin,
  PawPrint,
  Calendar,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Sofa,
  Navigation,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardHeader from '@/components/DashboardHeader';

// LA neighborhoods for multi-select
const LA_NEIGHBORHOODS = [
  'Hollywood',
  'Silver Lake',
  'Echo Park',
  'Los Feliz',
  'Downtown LA',
  'Koreatown',
  'West Hollywood',
  'Santa Monica',
  'Venice',
  'Mar Vista',
  'Culver City',
  'Westwood',
  'Brentwood',
  'Beverly Hills',
  'Burbank',
  'Glendale',
  'Pasadena',
  'Highland Park',
  'Eagle Rock',
  'Atwater Village',
  'Larchmont',
  'Mid-Wilshire',
  'Fairfax',
  'Hancock Park',
  'Sherman Oaks',
  'Studio City',
  'North Hollywood',
  'Encino',
  'Woodland Hills',
  'Long Beach',
  'Redondo Beach',
  'Hermosa Beach',
  'Manhattan Beach',
  'Playa Vista',
  'Marina del Rey',
];

const AMENITIES = [
  { id: 'parking', label: 'Parking', icon: '🅿️' },
  { id: 'laundry', label: 'In-unit laundry', icon: '🧺' },
  { id: 'pet_friendly', label: 'Pet-friendly', icon: '🐾' },
  { id: 'ac', label: 'Air conditioning', icon: '❄️' },
  { id: 'dishwasher', label: 'Dishwasher', icon: '🍽️' },
  { id: 'gym', label: 'Gym', icon: '💪' },
  { id: 'pool', label: 'Pool', icon: '🏊' },
  { id: 'balcony', label: 'Balcony', icon: '🌅' },
];

const PET_OPTIONS = [
  { value: 'none', label: 'No pets' },
  { value: 'cat', label: 'Cat' },
  { value: 'dog', label: 'Dog' },
  { value: 'both', label: 'Cat & Dog' },
];

const LEASE_OPTIONS = [
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
  { value: 18, label: '18 months' },
  { value: 24, label: '24 months' },
];

const FURNISHED_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

interface UserPreferences {
  min_budget?: number | null;
  max_budget?: number | null;
  min_bedrooms?: number;
  max_bedrooms?: number | null;
  min_bathrooms?: number;
  max_bathrooms?: number | null;
  neighborhoods?: string[];
  amenities?: string[];
  pet_friendly?: boolean | null;
  parking_required?: boolean | null;
  lease_duration_months?: number | null;
  move_in_date?: string | null;
  furnished_preference?: string | null;
  commute_address?: string | null;
}

export default function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');

  // Form state
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [minBedrooms, setMinBedrooms] = useState<string>('');
  const [maxBedrooms, setMaxBedrooms] = useState<string>('');
  const [minBathrooms, setMinBathrooms] = useState<string>('');
  const [maxBathrooms, setMaxBathrooms] = useState<string>('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [petType, setPetType] = useState<string>('none');
  const [moveInDate, setMoveInDate] = useState<string>('');
  const [leaseDuration, setLeaseDuration] = useState<string>('12');
  const [furnishedPreference, setFurnishedPreference] = useState<string>('any');
  const [commuteAddress, setCommuteAddress] = useState<string>('');
  const { theme, toggleTheme } = useTheme();

  // Fetch current preferences
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/user/preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      const data = await res.json();
      const prefs: UserPreferences = data.preferences;

      if (prefs) {
        setMinBudget(prefs.min_budget?.toString() ?? '');
        setMaxBudget(prefs.max_budget?.toString() ?? '');
        setMinBedrooms(prefs.min_bedrooms?.toString() ?? '');
        setMaxBedrooms(prefs.max_bedrooms?.toString() ?? '');
        setMinBathrooms(prefs.min_bathrooms?.toString() ?? '');
        setMaxBathrooms(prefs.max_bathrooms?.toString() ?? '');
        setSelectedNeighborhoods(prefs.neighborhoods ?? []);
        setSelectedAmenities(prefs.amenities ?? []);
        setLeaseDuration(prefs.lease_duration_months?.toString() ?? '12');
        setMoveInDate(prefs.move_in_date ?? '');

        setFurnishedPreference(prefs.furnished_preference ?? 'any');
        setCommuteAddress(prefs.commute_address ?? '');

        // Derive pet type from amenities and pet_friendly
        if (prefs.pet_friendly === true) {
          // Check if more specific pet info is in amenities
          const hasCat = prefs.amenities?.includes('cat');
          const hasDog = prefs.amenities?.includes('dog');
          if (hasCat && hasDog) setPetType('both');
          else if (hasDog) setPetType('dog');
          else if (hasCat) setPetType('cat');
          else setPetType('both'); // Default if pet_friendly is true
        } else {
          setPetType('none');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Save preferences
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const petFriendly = petType !== 'none';
      const parkingRequired = selectedAmenities.includes('parking');

      const body: UserPreferences = {
        min_budget: minBudget ? Number(minBudget) : null,
        max_budget: maxBudget ? Number(maxBudget) : null,
        min_bedrooms: minBedrooms ? Number(minBedrooms) : 0,
        max_bedrooms: maxBedrooms ? Number(maxBedrooms) : null,
        min_bathrooms: minBathrooms ? Number(minBathrooms) : 0,
        max_bathrooms: maxBathrooms ? Number(maxBathrooms) : null,
        neighborhoods: selectedNeighborhoods,
        amenities: selectedAmenities,
        pet_friendly: petFriendly,
        parking_required: parkingRequired,
        lease_duration_months: leaseDuration ? Number(leaseDuration) : null,
        move_in_date: moveInDate || null,
        furnished_preference: furnishedPreference !== 'any' ? furnishedPreference : null,
        commute_address: commuteAddress || null,
      };

      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Toggle neighborhood selection
  const toggleNeighborhood = (neighborhood: string) => {
    setSelectedNeighborhoods((prev) =>
      prev.includes(neighborhood)
        ? prev.filter((n) => n !== neighborhood)
        : [...prev, neighborhood]
    );
  };

  // Toggle amenity selection
  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((a) => a !== amenityId)
        : [...prev, amenityId]
    );
  };

  // Filter neighborhoods by search
  const filteredNeighborhoods = LA_NEIGHBORHOODS.filter((n) =>
    n.toLowerCase().includes(neighborhoodSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardHeader />

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-4 py-8">
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
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Preferences</h1>
                <p className="text-muted-foreground mt-1">
                  Set your search criteria to get better rental recommendations
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
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

          {success && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">Preferences saved successfully!</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 rounded-lg border bg-card animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Budget Range */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Budget Range
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">
                        Minimum ($/mo)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 1500"
                        value={minBudget}
                        onChange={(e) => setMinBudget(e.target.value)}
                        min={0}
                        step={100}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">
                        Maximum ($/mo)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 3500"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                        min={0}
                        step={100}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bedrooms & Bathrooms */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Bed className="h-4 w-4 text-primary" />
                    Bedrooms & Bathrooms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                        <Bed className="h-3.5 w-3.5" />
                        Bedrooms
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={minBedrooms}
                          onChange={(e) => setMinBedrooms(e.target.value)}
                          min={0}
                          max={10}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={maxBedrooms}
                          onChange={(e) => setMaxBedrooms(e.target.value)}
                          min={0}
                          max={10}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                        <Bath className="h-3.5 w-3.5" />
                        Bathrooms
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={minBathrooms}
                          onChange={(e) => setMinBathrooms(e.target.value)}
                          min={0}
                          max={10}
                          step={0.5}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={maxBathrooms}
                          onChange={(e) => setMaxBathrooms(e.target.value)}
                          min={0}
                          max={10}
                          step={0.5}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferred Neighborhoods */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Preferred Neighborhoods
                    {selectedNeighborhoods.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedNeighborhoods.length} selected
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Selected neighborhoods as removable tags */}
                  {selectedNeighborhoods.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedNeighborhoods.map((n) => (
                        <Badge
                          key={n}
                          className="bg-primary/20 text-primary border-primary/30 cursor-pointer hover:bg-primary/30"
                          onClick={() => toggleNeighborhood(n)}
                        >
                          {n}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={() => setSelectedNeighborhoods([])}
                      >
                        Clear all
                      </Button>
                    </div>
                  )}

                  {/* Search and selection */}
                  <div className="relative mb-3">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search neighborhoods..."
                      value={neighborhoodSearch}
                      onChange={(e) => setNeighborhoodSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-0.5">
                    {filteredNeighborhoods.map((n) => {
                      const isSelected = selectedNeighborhoods.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          }`}
                          onClick={() => toggleNeighborhood(n)}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {isSelected && (
                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                              )}
                            </span>
                            {n}
                          </span>
                        </button>
                      );
                    })}
                    {filteredNeighborhoods.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No neighborhoods match your search
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Must-have Amenities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Must-have Amenities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {AMENITIES.map((amenity) => {
                      const isSelected = selectedAmenities.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-foreground font-medium'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted'
                          }`}
                          onClick={() => toggleAmenity(amenity.id)}
                        >
                          <span className="text-base">{amenity.icon}</span>
                          <span className="truncate">{amenity.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Pet Type */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-primary" />
                    Pet Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PET_OPTIONS.map((option) => {
                      const isSelected = petType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-foreground font-medium'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted'
                          }`}
                          onClick={() => setPetType(option.value)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Move-in Date & Lease Length */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Move-in Date & Lease Length
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Target move-in date
                      </label>
                      <Input
                        type="date"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Preferred lease length
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {LEASE_OPTIONS.map((option) => {
                          const isSelected = leaseDuration === option.value.toString();
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`px-3 py-2 rounded-md border text-sm transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-foreground font-medium'
                                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                              }`}
                              onClick={() => setLeaseDuration(option.value.toString())}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Furnished Preference */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Sofa className="h-4 w-4 text-primary" />
                    Furnished Preference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {FURNISHED_OPTIONS.map((option) => {
                      const isSelected = furnishedPreference === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-foreground font-medium'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted'
                          }`}
                          onClick={() => setFurnishedPreference(option.value)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Commute Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    Commute Destination
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Work/school address (for commute estimates)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 1 World Way, Los Angeles, CA"
                    value={commuteAddress}
                    onChange={(e) => setCommuteAddress(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Theme Toggle */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4 text-primary" />
                    ) : (
                      <Sun className="h-4 w-4 text-primary" />
                    )}
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toggle between dark and light themes
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2 pb-8">
                <Button variant="outline" asChild>
                  <a href="/dashboard">Cancel</a>
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
