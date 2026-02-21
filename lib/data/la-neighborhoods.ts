import type { FeatureCollection, Feature, Polygon } from 'geojson';

interface NeighborhoodProperties {
  name: string;
  avgRent: number;
  walkScore: number;
}

/**
 * Creates an octagonal polygon approximation around a center point.
 * @param centerLat - Latitude of the center
 * @param centerLng - Longitude of the center
 * @param radius - Approximate radius in degrees (~0.01 = ~1km)
 * @param numPoints - Number of vertices (default 8 for octagon)
 * @returns GeoJSON Polygon coordinates array (closed ring)
 */
function createPolygon(
  centerLat: number,
  centerLng: number,
  radius: number = 0.01,
  numPoints: number = 8
): [number, number][][] {
  const coordinates: [number, number][] = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    // Adjust longitude radius for latitude distortion
    const lngRadius = radius / Math.cos((centerLat * Math.PI) / 180);
    const lng = centerLng + lngRadius * Math.cos(angle);
    const lat = centerLat + radius * Math.sin(angle);
    coordinates.push([
      parseFloat(lng.toFixed(6)),
      parseFloat(lat.toFixed(6)),
    ]);
  }

  // Close the ring by repeating the first point
  coordinates.push(coordinates[0]);

  return [coordinates];
}

function createNeighborhoodFeature(
  name: string,
  centerLat: number,
  centerLng: number,
  avgRent: number,
  walkScore: number
): Feature<Polygon, NeighborhoodProperties> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: createPolygon(centerLat, centerLng),
    },
    properties: {
      name,
      avgRent,
      walkScore,
    },
  };
}

/**
 * GeoJSON FeatureCollection of major LA rental neighborhoods.
 * Each feature is an octagonal polygon (~1km radius) centered on the neighborhood.
 * Properties include name, approximate average 1BR rent, and walk score.
 */
export const laNeighborhoods: FeatureCollection<Polygon, NeighborhoodProperties> = {
  type: 'FeatureCollection',
  features: [
    createNeighborhoodFeature('Hollywood', 34.0928, -118.3287, 2150, 80),
    createNeighborhoodFeature('Silver Lake', 34.0869, -118.2707, 2300, 74),
    createNeighborhoodFeature('Echo Park', 34.0782, -118.2606, 2000, 72),
    createNeighborhoodFeature('Los Feliz', 34.1059, -118.2837, 2400, 68),
    createNeighborhoodFeature('Koreatown', 34.0578, -118.3005, 1750, 89),
    createNeighborhoodFeature('Downtown LA', 34.0407, -118.2468, 2500, 93),
    createNeighborhoodFeature('Santa Monica', 34.0195, -118.4912, 2800, 86),
    createNeighborhoodFeature('Venice', 33.9850, -118.4695, 2700, 83),
    createNeighborhoodFeature('Mar Vista', 34.0017, -118.4284, 2100, 58),
    createNeighborhoodFeature('Culver City', 34.0211, -118.3965, 2350, 67),
    createNeighborhoodFeature('West Hollywood', 34.0900, -118.3617, 2600, 90),
    createNeighborhoodFeature('Beverly Grove', 34.0736, -118.3614, 2450, 78),
    createNeighborhoodFeature('Mid-Wilshire', 34.0621, -118.3281, 1950, 82),
    createNeighborhoodFeature('Palms', 34.0188, -118.4103, 2050, 62),
    createNeighborhoodFeature('Westwood', 34.0589, -118.4452, 2550, 75),
    createNeighborhoodFeature('Brentwood', 34.0614, -118.4755, 2900, 45),
    createNeighborhoodFeature('Glendale', 34.1425, -118.2551, 2000, 71),
    createNeighborhoodFeature('Pasadena', 34.1478, -118.1445, 2100, 65),
    createNeighborhoodFeature('Burbank', 34.1808, -118.3090, 2050, 55),
    createNeighborhoodFeature('North Hollywood', 34.1870, -118.3813, 1850, 60),
  ],
};

export type { NeighborhoodProperties };
