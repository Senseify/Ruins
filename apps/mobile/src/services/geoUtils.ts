/**
 * @ruins/mobile - Geo Utilities
 * High-precision geospatial calculations for real-world distances, bearings,
 * and proximity detection with GPS noise tolerance.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000; // Mean Earth radius in meters

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(point1: LatLng, point2: LatLng): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Calculates initial compass bearing (azimuth) from point1 to point2 in degrees (0° - 360°).
 */
export function calculateBearing(start: LatLng, dest: LatLng): number {
  const startLat = toRadians(start.latitude);
  const startLng = toRadians(start.longitude);
  const destLat = toRadians(dest.latitude);
  const destLng = toRadians(dest.longitude);

  const y = Math.sin(destLng - startLng) * Math.cos(destLat);
  const x =
    Math.cos(startLat) * Math.sin(destLat) -
    Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);

  let brng = Math.atan2(y, x);
  brng = toDegrees(brng);
  return Math.round((brng + 360) % 360);
}

/**
 * Converts bearing degrees into a cardinal/intercardinal direction name.
 */
export function bearingToCardinal(bearing: number): string {
  const directions = [
    'NORTH',
    'NORTH-EAST',
    'EAST',
    'SOUTH-EAST',
    'SOUTH',
    'SOUTH-WEST',
    'WEST',
    'NORTH-WEST',
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Evaluates whether player position is within capture radius of an objective,
 * factoring in GPS horizontal accuracy tolerance.
 */
export function isWithinCaptureRadius(
  playerPos: LatLng,
  objectivePos: LatLng,
  captureRadiusMeters: number,
  accuracyMeters: number = 5
): { inRange: boolean; distance: number; effectiveRadius: number } {
  const distance = calculateHaversineDistance(playerPos, objectivePos);
  
  // GPS tolerance: allow horizontal accuracy buffer up to 12 meters max
  // to avoid blocking players when standing right on top of objective under tree/cloud cover.
  const accuracyBuffer = Math.min(Math.max(accuracyMeters, 0), 12);
  const effectiveRadius = captureRadiusMeters + accuracyBuffer;

  return {
    inRange: distance <= effectiveRadius,
    distance,
    effectiveRadius,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
