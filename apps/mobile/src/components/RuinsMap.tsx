import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { GeoCoordinate, Objective } from '@ruins/shared';
import { PALETTE, FONTS } from '../theme/colors';
import { RUINS_DARK_MAP_STYLE } from '../theme/mapStyle';

interface RuinsMapProps {
  playerLocation: GeoCoordinate | null;
  objectives: Objective[];
  boundaryCenter?: { latitude: number; longitude: number };
  boundaryRadiusMeters?: number;
  onSelectObjective?: (obj: Objective) => void;
  selectedObjectiveId?: string;
  hasLocationPermission: boolean;
  onRequestPermission: () => void;
  isLocationServicesEnabled: boolean;
}

export const RuinsMap: React.FC<RuinsMapProps> = ({
  playerLocation,
  objectives,
  boundaryCenter,
  boundaryRadiusMeters = 400,
  onSelectObjective,
  selectedObjectiveId,
  hasLocationPermission,
  onRequestPermission,
  isLocationServicesEnabled,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [isFollowingPlayer, setIsFollowingPlayer] = useState(false);

  // Default coordinate if location is loading
  const centerLat = playerLocation?.latitude ?? boundaryCenter?.latitude ?? 37.7749;
  const centerLng = playerLocation?.longitude ?? boundaryCenter?.longitude ?? -122.4194;

  const handleRecenter = () => {
    if (playerLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: playerLocation.latitude,
          longitude: playerLocation.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        600
      );
    }
  };

  // Permission prompt banner overlay
  if (!hasLocationPermission || !isLocationServicesEnabled) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>GEOSPATIAL LOCK REQUIRED</Text>
          <Text style={styles.permissionDesc}>
            {!hasLocationPermission
              ? 'RUINS requires location permissions to project physical objectives and calculate real-world proximity.'
              : 'Location hardware services are currently disabled on this device. Enable GPS to engage.'}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onRequestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionBtnText}>
              {!hasLocationPermission ? 'AUTHORIZE GPS LOCK' : 'CHECK GPS STATUS'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        customMapStyle={RUINS_DARK_MAP_STYLE}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPanDrag={() => setIsFollowingPlayer(false)}
      >
        {/* Playable Zone Boundary Circle */}
        {boundaryCenter && (
          <Circle
            center={boundaryCenter}
            radius={boundaryRadiusMeters}
            strokeWidth={1}
            strokeColor="rgba(200, 190, 170, 0.35)"
            fillColor="rgba(200, 190, 170, 0.03)"
          />
        )}

        {/* Objective Markers & Capture Radii */}
        {objectives.map((obj) => {
          const isSelected = obj.id === selectedObjectiveId;
          const isSecured = obj.status === 'SECURED';
          const isActive = obj.status === 'ACTIVE';

          return (
            <React.Fragment key={obj.id}>
              {/* Objective Capture Radius Visualization */}
              <Circle
                center={{
                  latitude: obj.coordinate.latitude,
                  longitude: obj.coordinate.longitude,
                }}
                radius={obj.captureRadiusMeters}
                strokeWidth={isSelected ? 1.5 : 0.8}
                strokeColor={
                  isSecured
                    ? 'rgba(74, 222, 128, 0.5)'
                    : isSelected
                    ? 'rgba(200, 190, 170, 0.7)'
                    : 'rgba(200, 190, 170, 0.25)'
                }
                fillColor={
                  isSecured
                    ? 'rgba(74, 222, 128, 0.08)'
                    : isSelected
                    ? 'rgba(200, 190, 170, 0.12)'
                    : 'rgba(200, 190, 170, 0.04)'
                }
              />

              {/* Custom Tactical Objective Marker */}
              <Marker
                coordinate={{
                  latitude: obj.coordinate.latitude,
                  longitude: obj.coordinate.longitude,
                }}
                onPress={() => onSelectObjective && onSelectObjective(obj)}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.markerContainer}>
                  <View
                    style={[
                      styles.markerBracket,
                      isSecured && styles.markerSecured,
                      isSelected && styles.markerSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.markerCore,
                        isSecured && styles.markerCoreSecured,
                        isSelected && styles.markerCoreSelected,
                      ]}
                    />
                  </View>
                  <View style={styles.markerLabelBox}>
                    <Text style={styles.markerCode}>{obj.code}</Text>
                    {isSecured ? (
                      <Text style={styles.markerSecuredText}>SECURED</Text>
                    ) : (
                      <Text style={styles.markerPoints}>{obj.points}P</Text>
                    )}
                  </View>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Real Player Location Marker & GPS Accuracy Ring */}
        {playerLocation && (
          <>
            {/* GPS Horizontal Accuracy Ring */}
            <Circle
              center={{
                latitude: playerLocation.latitude,
                longitude: playerLocation.longitude,
              }}
              radius={Math.max(playerLocation.accuracy ?? 5, 4)}
              strokeWidth={0.5}
              strokeColor="rgba(200, 190, 170, 0.2)"
              fillColor="rgba(200, 190, 170, 0.06)"
            />

            {/* Player Reticle Marker */}
            <Marker
              coordinate={{
                latitude: playerLocation.latitude,
                longitude: playerLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              rotation={playerLocation.heading ?? 0}
            >
              <View style={styles.playerMarker}>
                <View style={styles.playerHeadingPip} />
                <View style={styles.playerOuterRing}>
                  <View style={styles.playerCoreDot} />
                </View>
              </View>
            </Marker>
          </>
        )}
      </MapView>

      {/* Floating Spatial Controls */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.recenterBtn}
          onPress={handleRecenter}
          activeOpacity={0.7}
        >
          <Text style={styles.recenterIcon}>⌖</Text>
        </TouchableOpacity>

        {playerLocation && (
          <View style={styles.accuracyBadge}>
            <Text style={styles.accuracyText}>
              ±{Math.round(playerLocation.accuracy ?? 5)}M
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#090B0E',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBracket: {
    width: 20,
    height: 20,
    borderWidth: 0.8,
    borderColor: PALETTE.titanium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 12, 14, 0.85)',
  },
  markerSelected: {
    borderColor: PALETTE.textFog,
    borderWidth: 1.2,
  },
  markerSecured: {
    borderColor: PALETTE.accentGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  markerCore: {
    width: 4,
    height: 4,
    backgroundColor: PALETTE.titanium,
  },
  markerCoreSelected: {
    backgroundColor: PALETTE.textFog,
  },
  markerCoreSecured: {
    backgroundColor: PALETTE.accentGreen,
  },
  markerLabelBox: {
    marginTop: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: 'rgba(8, 9, 11, 0.9)',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
    alignItems: 'center',
  },
  markerCode: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 1,
  },
  markerPoints: {
    fontFamily: FONTS.mono,
    fontSize: 6,
    color: PALETTE.textTertiary,
  },
  markerSecuredText: {
    fontFamily: FONTS.mono,
    fontSize: 6,
    color: PALETTE.accentGreen,
  },

  playerMarker: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerHeadingPip: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 5,
    backgroundColor: PALETTE.titanium,
    borderRadius: 1,
  },
  playerOuterRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE.textFog,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 9, 11, 0.85)',
  },
  playerCoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.titanium,
  },

  floatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    alignItems: 'flex-end',
    gap: 8,
  },
  recenterBtn: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIcon: {
    fontFamily: FONTS.mono,
    fontSize: 18,
    color: PALETTE.titanium,
  },
  accuracyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(8, 9, 11, 0.8)',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
  },
  accuracyText: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1,
  },

  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: PALETTE.obsidian,
  },
  permissionCard: {
    padding: 20,
    backgroundColor: PALETTE.surfacePanel,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
    borderRadius: 4,
    alignItems: 'center',
  },
  permissionTitle: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 8,
  },
  permissionDesc: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  permissionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: PALETTE.titanium,
    borderRadius: 3,
  },
  permissionBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.obsidian,
    letterSpacing: 1.5,
  },
});
