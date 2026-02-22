import { zillowAdapter } from './zillow';
import { apartmentsComAdapter } from './apartments-com';
import { rentComAdapter } from './rent-com';
import type { SourceAdapter } from '../types';

export const allAdapters: SourceAdapter[] = [
  zillowAdapter,
  apartmentsComAdapter,
  rentComAdapter,
];
