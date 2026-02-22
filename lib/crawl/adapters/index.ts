// Existing scraping adapters (legacy)
export { zillowAdapter } from './zillow';
export { apartmentsComAdapter } from './apartments-com';
export { rentComAdapter } from './rent-com';

// Re-export the legacy collection
export { allAdapters } from './base';

// API adapters (new)
export { realtyInUsAdapter } from './realty-in-us';
export { rentcastAdapter } from './rentcast';

// Grouped collection of API adapters
import type { ApiSourceAdapter } from '../types';
import { realtyInUsAdapter } from './realty-in-us';
import { rentcastAdapter } from './rentcast';

export const apiAdapters: ApiSourceAdapter[] = [
  realtyInUsAdapter,
  rentcastAdapter,
];
