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

// Expanded regional boundaries that encompass India and its surrounding countries & water bodies
// (Pakistan, Afghanistan, Nepal, Bhutan, Bangladesh, Myanmar, Sri Lanka, Arabian Sea, Bay of Bengal)
export const REGIONAL_MAP_BOUNDS: [[number, number], [number, number]] = [
  [0.0, 55.0],
  [40.0, 105.0]
];

/**
 * Clips any HTMLCanvasElement image data strictly to India's land borders
 * using HTML5 Canvas vector clipping (destination-in).
 * Pixels inside India retain their exact colors, while pixels outside India
 * become completely transparent (alpha = 0), allowing surrounding countries
 * and water bodies on the base map to remain fully visible.
 */
export function clipCanvasToIndia(
  sourceCanvas: HTMLCanvasElement,
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number
): HTMLCanvasElement {
  const targetCanvas = document.createElement('canvas');
  const outWidth = 600;
  const outHeight = 600;
  targetCanvas.width = outWidth;
  targetCanvas.height = outHeight;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  // 1. Draw smooth interpolated content onto high-res output canvas
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, outWidth, outHeight);

  // 2. Use destination-in composite mode to clip strictly to India's MultiPolygon
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  const coordinates = INDIA_GEOJSON.features[0].geometry.coordinates as [number, number][][][];
  coordinates.forEach(poly => {
    const ring = poly[0];
    ring.forEach(([lon, lat], i) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * outWidth;
      const y = ((maxLat - lat) / (maxLat - minLat)) * outHeight;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
  });

  ctx.fillStyle = '#000000';
  ctx.fill();

  return targetCanvas;
}

