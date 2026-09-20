import { INDIA_GEOJSON } from '../data/indiaGeoJson';

export { INDIA_GEOJSON };

// World bounding ring enclosing the entire globe
const WORLD_RING: [number, number][] = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90]
];

// Extract outer rings of all polygons in India MultiPolygon
const indiaRings: [number, number][][] = (INDIA_GEOJSON.features[0].geometry.coordinates as [number, number][][][]).map(
  poly => poly[0]
);

/**
 * Inverted GeoJSON Mask:
 * A giant polygon covering the entire world with holes cut out exactly matching India's land boundaries.
 * When rendered in Leaflet with fill, everything outside India is masked with the UI background color,
 * so only India is visible.
 */
export const INVERTED_INDIA_MASK: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [WORLD_RING, ...indiaRings]
      },
      properties: { name: 'Non-India Area Mask' }
    }
  ]
};

/**
 * Fast Ray-Casting Point-in-Polygon check.
 * Checks if [lon, lat] is located within India's borders.
 */
function pointInRing(point: [number, number], ring: [number, number][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Determines whether a given latitude and longitude is inside India.
 */
export function isPointInIndia(lon: number, lat: number): boolean {
  // Rapid bounding box pre-filter for performance
  if (lat < 6.0 || lat > 37.5 || lon < 68.0 || lon > 97.5) {
    return false;
  }
  // Check against India rings (mainland is the first ring)
  for (let i = 0; i < indiaRings.length; i++) {
    if (pointInRing([lon, lat], indiaRings[i])) {
      return true;
    }
  }
  return false;
}

export const INDIA_CENTER: [number, number] = [22.8, 80.2];
export const INDIA_MAP_BOUNDS: [[number, number], [number, number]] = [
  [6.0, 68.0],
  [37.5, 97.5]
];
