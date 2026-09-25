/**
 * @ruins/mobile - API Client
 * Centralized REST API client for RUINS backend services.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'ruins_auth_token';

/**
 * Storage Abstraction:
 * Uses hardware-backed encrypted storage (iOS Keychain / Android KeyStore via expo-secure-store)
 * on native devices. Falls back to AsyncStorage on Web where native Keychains are unavailable.
 */
async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    return AsyncStorage.setItem(key, value);
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    return AsyncStorage.removeItem(key);
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

// Default localhost URL based on runtime environment
// Android emulator uses 10.0.2.2 to access host machine; iOS uses localhost
const DEFAULT_HOST =
  Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
let API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3001`;

class ApiClient {
  private token: string | null = null;

  async init() {
    try {
      this.token = await getSecureItem(TOKEN_KEY);
    } catch {
      this.token = null;
    }
  }

  setBaseUrl(url: string) {
    API_BASE_URL = url.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await setSecureItem(TOKEN_KEY, token);
    } else {
      await deleteSecureItem(TOKEN_KEY);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          error: json.error || `HTTP_ERROR_${res.status}`,
          status: res.status,
        };
      }

      return { data: json as T, status: res.status };
    } catch (err: any) {
      return {
        error: `NETWORK_ERROR: ${err.message || 'Cannot reach server'}`,
        status: 0,
      };
    }
  }

  // --- Auth API ---
  auth = {
    register: (body: {
      username: string;
      email: string;
      password: string;
      displayName?: string;
    }) => this.request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    login: (body: { emailOrUsername: string; password: string }) =>
      this.request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    getMe: () => this.request<any>('/api/auth/me'),
  };

  // --- Games API ---
  games = {
    create: (body: {
      title?: string;
      mode?: string;
      boundaryRadiusMeters?: number;
      durationMinutes?: number;
      centerLat?: number;
      centerLng?: number;
    }) => this.request<any>('/api/games', { method: 'POST', body: JSON.stringify(body) }),

    list: (lat?: number, lng?: number, radius?: number) => {
      const q = new URLSearchParams();
      if (lat !== undefined) q.append('lat', String(lat));
      if (lng !== undefined) q.append('lng', String(lng));
      if (radius !== undefined) q.append('radius', String(radius));
      return this.request<any>(`/api/games?${q.toString()}`);
    },

    get: (id: string) => this.request<any>(`/api/games/${id}`),

    join: (roomCode: string) =>
      this.request<any>('/api/games/join', { method: 'POST', body: JSON.stringify({ roomCode }) }),

    ready: (id: string, isReady: boolean) =>
      this.request<any>(`/api/games/${id}/ready`, {
        method: 'POST',
        body: JSON.stringify({ isReady }),
      }),

    switchTeam: (id: string, teamIndex: number) =>
      this.request<any>(`/api/games/${id}/team`, {
        method: 'POST',
        body: JSON.stringify({ teamIndex }),
      }),

    start: (id: string) => this.request<any>(`/api/games/${id}/start`, { method: 'POST' }),

    capture: (
      id: string,
      body: {
        objectiveId: string;
        latitude: number;
        longitude: number;
        accuracy?: number;
        timestamp?: number;
      }
    ) =>
      this.request<any>(`/api/games/${id}/capture`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    leave: (id: string) => this.request<any>(`/api/games/${id}/leave`, { method: 'POST' }),
    getResults: (id: string) => this.request<any>(`/api/games/${id}/results`),
  };
}

export const apiClient = new ApiClient();
