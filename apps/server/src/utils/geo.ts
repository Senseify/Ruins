/**
 * @ruins/server - Geospatial & Kinematic Verification Utilities
 * Server-authoritative distance, speed, and objective distribution logic.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

export function calculateHaversineDistance(p1: LatLng, p2: LatLng): number {
  const lat1Rad = (p1.latitude * Math.PI) / 180;
  const lat2Rad = (p2.latitude * Math.PI) / 180;
  const deltaLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const deltaLng = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

/**
 * Validates whether the movement between two consecutive telemetry pings is physically plausible.
 * Top human sprint speed is ~11 m/s (40 km/h).
 * We set the threshold at 14 m/s (50 km/h) to allow for GPS jitter without false positives.
 */
export function validateKinematicSpeed(
  prevCoord: LatLng,
  prevTimestamp: number,
  newCoord: LatLng,
  newTimestamp: number
): { isPlausible: boolean; calculatedSpeedMps: number } {
  const deltaSeconds = Math.max((newTimestamp - prevTimestamp) / 1000, 0.5);
  const distance = calculateHaversineDistance(prevCoord, newCoord);
  const speed = distance / deltaSeconds;

  return {
    isPlausible: speed <= 14.0,
    calculatedSpeedMps: Math.round(speed * 10) / 10,
  };
}

/**
 * Procedurally generates objectives distributed around a center point
 * within a safe playable perimeter radius.
 */
export function generateProceduralObjectives(
  center: LatLng,
  boundaryRadiusMeters: number,
  count: number = 3
): Array<{
  code: string;
  title: string;
  latitude: number;
  longitude: number;
  captureRadiusMeters: number;
  points: number;
}> {
  const titles = [
    'THE SIGNAL',
    'FREQUENCY RELAY',
    'SENSOR ARRAY',
    'DATA EXTRACTION',
    'MONITORING POST',
  ];

  const objectives = [];
  const minRadius = Math.max(boundaryRadiusMeters * 0.25, 40);
  const maxRadius = Math.min(boundaryRadiusMeters * 0.75, boundaryRadiusMeters - 30);

  // Distribute radially around center with distinct bearings
  const angleStep = (2 * Math.PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep + (Math.random() * 0.4 - 0.2); // slight angular offset
    const distanceMeters = minRadius + Math.random() * (maxRadius - minRadius);

    // Coordinate offset calculation (approximate 1 degree lat = 111,320m)
    const latOffset = (distanceMeters * Math.cos(angle)) / 111320;
    const lngOffset =
      (distanceMeters * Math.sin(angle)) /
      (111320 * Math.cos((center.latitude * Math.PI) / 180));

    objectives.push({
      code: `OBJ 0${i + 1}`,
      title: titles[i % titles.length],
      latitude: Math.round((center.latitude + latOffset) * 1e6) / 1e6,
      longitude: Math.round((center.longitude + lngOffset) * 1e6) / 1e6,
      captureRadiusMeters: 20,
      points: 100,
    });
  }

  return objectives;
}
