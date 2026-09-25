/**
 * @ruins/mobile - Location Service
 * Battery-optimized, adaptive GPS location tracking service.
 * Respects user privacy, detects hardware status, and avoids wasteful 1 Hz polling.
 */

import * as Location from 'expo-location';
import { GeoCoordinate } from '@ruins/shared';

export type LocationTrackingMode = 'IDLE' | 'ENGAGEMENT';

export type LocationErrorState =
  | 'PERMISSION_DENIED'
  | 'SERVICES_DISABLED'
  | 'UNAVAILABLE'
  | null;

export interface LocationState {
  coordinate: GeoCoordinate | null;
  error: LocationErrorState;
  hasPermission: boolean;
  servicesEnabled: boolean;
  trackingMode: LocationTrackingMode;
}

export type LocationCallback = (coord: GeoCoordinate) => void;

class LocationService {
  private watcher: Location.LocationSubscription | null = null;
  private currentMode: LocationTrackingMode = 'IDLE';
  private subscribers: Set<LocationCallback> = new Set();
  private lastCoord: GeoCoordinate | null = null;

  /**
   * Checks current permission and hardware location service status
   */
  async checkStatus(): Promise<{ hasPermission: boolean; servicesEnabled: boolean }> {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    const { status } = await Location.getForegroundPermissionsAsync();
    return {
      hasPermission: status === Location.PermissionStatus.GRANTED,
      servicesEnabled,
    };
  }

  /**
   * Prompts user for foreground location permission
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  }

  /**
   * Gets a single accurate coordinate fix
   */
  async getCurrentLocation(): Promise<GeoCoordinate | null> {
    try {
      const { hasPermission, servicesEnabled } = await this.checkStatus();
      if (!hasPermission || !servicesEnabled) {
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coord: GeoCoordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? 10,
        altitude: position.coords.altitude ?? 0,
        heading: position.coords.heading ?? 0,
        speed: position.coords.speed ?? 0,
        timestamp: position.timestamp,
      };

      this.lastCoord = coord;
      return coord;
    } catch (err) {
      console.warn('[LocationService] Failed to obtain current location:', err);
      return null;
    }
  }

  /**
   * Starts adaptive location tracking.
   * In IDLE mode: polls every 6 seconds or 10 meters (saves battery).
   * In ENGAGEMENT mode (near an objective): polls every 2 seconds or 3 meters.
   */
  async startTracking(
    mode: LocationTrackingMode = 'IDLE',
    callback?: LocationCallback
  ): Promise<boolean> {
    if (callback) {
      this.subscribers.add(callback);
    }

    const { hasPermission, servicesEnabled } = await this.checkStatus();
    if (!hasPermission || !servicesEnabled) {
      return false;
    }

    // If already tracking at same mode, skip recreating watcher
    if (this.watcher && this.currentMode === mode) {
      return true;
    }

    // Stop existing watcher if switching modes
    if (this.watcher) {
      this.watcher.remove();
      this.watcher = null;
    }

    this.currentMode = mode;

    const accuracy =
      mode === 'ENGAGEMENT' ? Location.Accuracy.High : Location.Accuracy.Balanced;
    const distanceInterval = mode === 'ENGAGEMENT' ? 3 : 10;
    const timeInterval = mode === 'ENGAGEMENT' ? 2000 : 6000;

    try {
      this.watcher = await Location.watchPositionAsync(
        {
          accuracy,
          distanceInterval,
          timeInterval,
        },
        (location) => {
          const coord: GeoCoordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? 10,
            altitude: location.coords.altitude ?? 0,
            heading: location.coords.heading ?? 0,
            speed: location.coords.speed ?? 0,
            timestamp: location.timestamp,
          };

          this.lastCoord = coord;
          this.subscribers.forEach((sub) => sub(coord));
        }
      );
      return true;
    } catch (err) {
      console.warn('[LocationService] Watch position error:', err);
      return false;
    }
  }

  /**
   * Adjusts tracking mode dynamically (e.g. when approaching an objective)
   */
  setTrackingMode(mode: LocationTrackingMode) {
    if (this.currentMode !== mode) {
      this.startTracking(mode);
    }
  }

  /**
   * Subscribes a callback to receive location updates
   */
  subscribe(callback: LocationCallback): () => void {
    this.subscribers.add(callback);
    if (this.lastCoord) {
      callback(this.lastCoord);
    }
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Stops tracking and cleans up native subscription
   */
  stopTracking() {
    if (this.watcher) {
      this.watcher.remove();
      this.watcher = null;
    }
    this.subscribers.clear();
  }

  getLastKnownLocation(): GeoCoordinate | null {
    return this.lastCoord;
  }
}

export const locationService = new LocationService();
