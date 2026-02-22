import type { PropertyType } from './database.types';

// Property type options with labels and lucide icon names
export const PROPERTY_TYPE_OPTIONS: { id: PropertyType; label: string; icon: string }[] = [
  { id: 'house', label: 'House', icon: 'Home' },
  { id: 'apartment', label: 'Apartment', icon: 'Building2' },
  { id: 'condo', label: 'Condo', icon: 'Building' },
  { id: 'townhouse', label: 'Townhouse', icon: 'Rows3' },
  { id: 'room', label: 'Room', icon: 'DoorOpen' },
];

export const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'condo', 'townhouse', 'room'];

// LA neighborhoods for multi-select (shared between SettingsClient and OnboardingWizard)
export const LA_NEIGHBORHOODS = [
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

// Top neighborhoods to show by default in onboarding (most popular)
export const TOP_NEIGHBORHOODS = LA_NEIGHBORHOODS.slice(0, 12);
