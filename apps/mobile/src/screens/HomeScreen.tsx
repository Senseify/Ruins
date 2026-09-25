import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { GeoCoordinate, Objective } from '@ruins/shared';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { locationService } from '../services/locationService';
import { apiClient } from '../services/apiClient';
import { RuinsMap } from '../components/RuinsMap';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export const HomeScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, loginAsQuickOperative } = useAuth();

  const [playerLocation, setPlayerLocation] = useState<GeoCoordinate | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [activeObjectives, setActiveObjectives] = useState<Objective[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  useEffect(() => {
    // Check and request location permission on mount
    const setupLocation = async () => {
      const status = await locationService.checkStatus();
      setServicesEnabled(status.servicesEnabled);
      setHasPermission(status.hasPermission);

      if (status.hasPermission && status.servicesEnabled) {
        const initial = await locationService.getCurrentLocation();
        if (initial) setPlayerLocation(initial);

        // Start adaptive background tracking
        locationService.startTracking('IDLE', (coord) => {
          setPlayerLocation(coord);
        });
      }
    };

    setupLocation();

    // Fetch active games to see if any local match exists
    const loadGames = async () => {
      const res = await apiClient.games.list();
      if (res.data?.games && res.data.games.length > 0) {
        const latest = res.data.games[0];
        setActiveGameId(latest.id);
        setRoomCode(latest.roomCode);

        // Load objectives for this match
        const gameRes = await apiClient.games.get(latest.id);
        if (gameRes.data?.objectives) {
          setActiveObjectives(gameRes.data.objectives);
        }
      }
    };

    loadGames();

    return () => {
      locationService.stopTracking();
    };
  }, []);

  const handleRequestPermission = async () => {
    const granted = await locationService.requestPermission();
    setHasPermission(granted);
    if (granted) {
      const loc = await locationService.getCurrentLocation();
      if (loc) setPlayerLocation(loc);
      locationService.startTracking('IDLE', (coord) => setPlayerLocation(coord));
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>RUINS</Text>
            <View style={styles.brandDivider} />
            <Text style={styles.operationTag}>SECTOR MAP</Text>
          </View>
          <Text style={styles.callsignTag}>
            OPERATIVE: {user ? user.username.toUpperCase() : 'STANDBY'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => navigate('SETTINGS')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIconText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest Login Banner if not authenticated */}
      {!user && (
        <TouchableOpacity
          style={styles.authBanner}
          activeOpacity={0.8}
          onPress={loginAsQuickOperative}
        >
          <Text style={styles.authBannerText}>
            [+] INITIALIZE OPERATIVE CREDENTIALS (1-TAP AUTH)
          </Text>
        </TouchableOpacity>
      )}

      {/* Real Map Canvas */}
      <View style={styles.mapContainer}>
        <RuinsMap
          playerLocation={playerLocation}
          objectives={activeObjectives}
          boundaryCenter={
            playerLocation
              ? { latitude: playerLocation.latitude, longitude: playerLocation.longitude }
              : undefined
          }
          boundaryRadiusMeters={400}
          hasLocationPermission={hasPermission}
          onRequestPermission={handleRequestPermission}
          isLocationServicesEnabled={servicesEnabled}
        />

        {/* Floating Quick Action Buttons */}
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigate('CREATE_GAME')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>+ CREATE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => navigate('JOIN_GAME')}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>JOIN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Match Telemetry Card */}
      {roomCode && (
        <View style={styles.panelWrapper}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (activeGameId) {
                navigate('LOBBY', { gameId: activeGameId, roomCode });
              }
            }}
          >
            <Card accentTop>
              <View style={styles.panelContent}>
                <View>
                  <View style={styles.panelBadgeRow}>
                    <Text style={styles.panelLabel}>ACTIVE OPERATION</Text>
                    <Badge label={`#${roomCode}`} variant="titanium" style={{ marginLeft: 6 }} />
                  </View>
                  <Text style={styles.panelTitle}>CONVERGENCE LOBBY</Text>
                </View>
                <Text style={styles.panelEnterText}>ENTER ›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 4,
  },
  brandDivider: {
    width: 1,
    height: 12,
    backgroundColor: PALETTE.borderSubtle,
    marginHorizontal: 10,
  },
  operationTag: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: PALETTE.titanium,
    letterSpacing: 2,
  },
  callsignTag: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  settingsIconBtn: {
    padding: 6,
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
    borderRadius: 4,
  },
  settingsIconText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: PALETTE.titanium,
  },
  authBanner: {
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: PALETTE.titaniumGlass,
    borderWidth: 0.5,
    borderColor: PALETTE.titanium,
    borderRadius: 3,
    alignItems: 'center',
  },
  authBannerText: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 1.2,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
  },
  floatingActions: {
    position: 'absolute',
    top: 14,
    left: 14,
    gap: 8,
  },
  actionBtn: {
    backgroundColor: PALETTE.titanium,
    borderRadius: 3,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE.obsidian,
    letterSpacing: 1.5,
  },
  actionBtnSecondary: {
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
  },
  actionBtnTextSecondary: {
    color: PALETTE.textFog,
  },
  panelWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  panelContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  panelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  panelLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1.2,
  },
  panelTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.textFog,
    letterSpacing: 1.2,
  },
  panelEnterText: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    color: PALETTE.titanium,
  },
});
