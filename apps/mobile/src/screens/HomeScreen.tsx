import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const { navigate } = useNavigation();

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const telemetryBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(telemetryBlink, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(telemetryBlink, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, telemetryBlink]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.25, 0.8, 1],
    outputRange: [0.5, 0.35, 0.08, 0],
  });

  return (
    <View style={styles.container}>
      {/* ================= CLASSIFIED TELEMETRY HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>RUINS</Text>
            <View style={styles.brandDivider} />
            <Text style={styles.operationTag}>CONVERGENCE</Text>
          </View>
          <View style={styles.subTelemetryRow}>
            <Animated.View style={[styles.statusDot, { opacity: telemetryBlink }]} />
            <Text style={styles.subTelemetryText}>GRID 44.119 // SEC-03</Text>
          </View>
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

      {/* ================= TELEMETRY LOCK BANNER ================= */}
      <View style={styles.telemetryPillContainer}>
        <TouchableOpacity
          style={styles.telemetryPill}
          activeOpacity={0.8}
          onPress={() => navigate('ACTIVE_GAME', { gameId: 'active-convergence-01' })}
        >
          <View style={styles.telemetryPillLeft}>
            <View style={styles.targetGlyph} />
            <Text style={styles.telemetryObjective}>OBJECTIVE 03</Text>
          </View>
          <View style={styles.telemetryPillDivider} />
          <View style={styles.telemetryPillRight}>
            <Text style={styles.telemetryDistance}>14 m</Text>
            <Text style={styles.telemetryDistanceLabel}>PROXIMITY</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ================= CINEMATIC MAP CANVAS ================= */}
      <View style={styles.mapViewport}>
        {/* Subtle Coordinate Grid Lines */}
        <View style={styles.gridOverlay}>
          <View style={[styles.gridLineH, { top: '25%' }]} />
          <View style={[styles.gridLineH, { top: '50%' }]} />
          <View style={[styles.gridLineH, { top: '75%' }]} />
          <View style={[styles.gridLineV, { left: '25%' }]} />
          <View style={[styles.gridLineV, { left: '50%' }]} />
          <View style={[styles.gridLineV, { left: '75%' }]} />
        </View>

        {/* Topographic Contour Rings */}
        <View style={styles.topographicLayer}>
          <View style={[styles.contourRing, styles.contour1]} />
          <View style={[styles.contourRing, styles.contour2]} />
          <View style={[styles.contourRing, styles.contour3]} />
          <View style={[styles.contourRing, styles.contour4]} />
        </View>

        {/* Playable Boundary */}
        <View style={styles.boundaryRing}>
          <Text style={styles.boundaryLabelTop}>[ ZONE PERIMETER // R-400M ]</Text>
          <Text style={styles.boundaryLabelBottom}>37°46'31"N 122°25'08"W</Text>
        </View>

        {/* Annotations */}
        <View style={[styles.mapAnnotation, { top: 38, left: 24 }]}>
          <Text style={styles.annotationText}>ELEV 48M // QUAD-B</Text>
        </View>
        <View style={[styles.mapAnnotation, { bottom: 44, right: 24 }]}>
          <Text style={styles.annotationText}>AZM 134° // MAGNETIC</Text>
        </View>

        {/* Objective 01 */}
        <View style={[styles.objectiveContainer, { top: '24%', left: '22%' }]}>
          <View style={styles.objectiveHollowRing}>
            <View style={styles.objectiveDotDim} />
          </View>
          <Text style={styles.objectiveTag}>OBJ 01</Text>
          <Text style={styles.objectiveRange}>340 m</Text>
        </View>

        {/* Objective 02 */}
        <View style={[styles.objectiveContainer, { top: '64%', left: '74%' }]}>
          <View style={styles.objectiveHollowRing}>
            <View style={styles.objectiveDotDim} />
          </View>
          <Text style={styles.objectiveTag}>OBJ 02</Text>
          <Text style={styles.objectiveRange}>210 m</Text>
        </View>

        {/* Objective 03 (Active Target) */}
        <TouchableOpacity
          style={[styles.objectiveContainer, { top: '44%', left: '56%' }]}
          activeOpacity={0.8}
          onPress={() => navigate('ACTIVE_GAME', { gameId: 'active-convergence-01' })}
        >
          <View style={styles.targetVectorLine} />
          <View style={styles.targetBracketOuter}>
            <View style={styles.targetBracketInner}>
              <View style={styles.targetCenterAmber} />
            </View>
          </View>
          <Text style={[styles.objectiveTag, styles.objectiveTagActive]}>OBJ 03</Text>
          <Text style={[styles.objectiveRange, styles.objectiveRangeActive]}>14 m</Text>
        </TouchableOpacity>

        {/* Player Position Marker */}
        <View style={[styles.playerContainer, { top: '51%', left: '46%' }]}>
          <Animated.View
            style={[
              styles.radarPing,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.playerOuterRing}>
            <View style={styles.playerHeadingPip} />
            <View style={styles.playerCoreDot} />
          </View>
          <View style={styles.playerLabelContainer}>
            <Text style={styles.playerLabelText}>YOU // AGENT 09</Text>
          </View>
        </View>

        {/* Floating Coordinates HUD */}
        <View style={styles.hudCoordinates}>
          <Text style={styles.hudCoordText}>LAT 37°46'29.4"N</Text>
          <Text style={styles.hudCoordText}>LON 122°25'10.2"W</Text>
          <Text style={styles.hudCoordText}>ACC ±3.2M</Text>
        </View>

        {/* Quick Launch Floating Actions */}
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={styles.floatingActionBtn}
            onPress={() => navigate('CREATE_GAME')}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingActionText}>+ CREATE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floatingActionBtn, styles.floatingActionBtnSecondary]}
            onPress={() => navigate('JOIN_GAME')}
            activeOpacity={0.8}
          >
            <Text style={[styles.floatingActionText, styles.floatingActionTextSecondary]}>
              JOIN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= ACTIVE OBJECTIVE PANEL ================= */}
      <View style={styles.objectivePanelWrapper}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigate('ACTIVE_GAME', { gameId: 'active-convergence-01' })}
        >
          <Card accentTop>
            <View style={styles.panelContent}>
              <View style={styles.panelLeft}>
                <View style={styles.panelHeaderRow}>
                  <Text style={styles.panelSubheader}>OBJECTIVE</Text>
                  <Badge label="ACTIVE" variant="titanium" style={{ marginLeft: 8 }} />
                </View>
                <Text style={styles.panelTitle}>THE SIGNAL</Text>
                <Text style={styles.panelMetadata}>FREQ 142.800 MHz // SECTOR 03</Text>
              </View>

              <View style={styles.panelRight}>
                <Text style={styles.panelDistance}>126 m</Text>
                <Text style={styles.panelBearing}>SOUTH-EAST</Text>
                <Text style={styles.panelBearingDegrees}>BEARING 138°</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
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
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 12,
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
    letterSpacing: 4.5,
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
    textTransform: 'uppercase',
  },
  subTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.titanium,
    marginRight: 6,
  },
  subTelemetryText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.textTertiary,
    letterSpacing: 1.5,
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

  telemetryPillContainer: {
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  telemetryPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetGlyph: {
    width: 6,
    height: 6,
    borderWidth: 1,
    borderColor: PALETTE.titanium,
    marginRight: 8,
    transform: [{ rotate: '45deg' }],
  },
  telemetryObjective: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: PALETTE.textFog,
    letterSpacing: 1.8,
  },
  telemetryPillDivider: {
    width: 1,
    height: 10,
    backgroundColor: PALETTE.borderHairline,
    marginHorizontal: 10,
  },
  telemetryPillRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  telemetryDistance: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 0.5,
  },
  telemetryDistanceLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
    marginLeft: 6,
  },

  mapViewport: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 14,
    backgroundColor: '#0A0C0E',
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },

  topographicLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contourRing: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(200, 190, 170, 0.045)',
  },
  contour1: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.22,
    transform: [{ rotate: '18deg' }, { scaleX: 1.15 }],
  },
  contour2: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: SCREEN_WIDTH * 0.36,
    transform: [{ rotate: '-12deg' }, { scaleX: 1.2 }],
    borderColor: 'rgba(200, 190, 170, 0.035)',
  },
  contour3: {
    width: SCREEN_WIDTH * 1.05,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: SCREEN_WIDTH * 0.5,
    transform: [{ rotate: '25deg' }, { scaleX: 1.1 }],
    borderColor: 'rgba(255, 255, 255, 0.025)',
  },
  contour4: {
    width: SCREEN_WIDTH * 1.35,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: SCREEN_WIDTH * 0.65,
    borderColor: 'rgba(255, 255, 255, 0.018)',
  },

  boundaryRing: {
    position: 'absolute',
    alignSelf: 'center',
    top: '12%',
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: (SCREEN_WIDTH * 0.85) / 2,
    borderWidth: 0.8,
    borderColor: 'rgba(200, 190, 170, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  boundaryLabelTop: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.titaniumMuted,
    letterSpacing: 2,
    backgroundColor: '#0A0C0E',
    paddingHorizontal: 6,
  },
  boundaryLabelBottom: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1.5,
    backgroundColor: '#0A0C0E',
    paddingHorizontal: 6,
  },

  mapAnnotation: {
    position: 'absolute',
  },
  annotationText: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1.5,
  },

  objectiveContainer: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  objectiveHollowRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 0.8,
    borderColor: PALETTE.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 12, 14, 0.6)',
  },
  objectiveDotDim: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: PALETTE.textSecondary,
  },
  objectiveTag: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textSecondary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  objectiveRange: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    color: PALETTE.textTertiary,
    letterSpacing: 0.5,
  },

  targetVectorLine: {
    position: 'absolute',
    width: 44,
    height: 0.5,
    backgroundColor: 'rgba(200, 190, 170, 0.25)',
    top: 8,
    left: -32,
    transform: [{ rotate: '42deg' }],
  },
  targetBracketOuter: {
    width: 20,
    height: 20,
    borderWidth: 0.8,
    borderColor: PALETTE.titanium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.titaniumGlass,
  },
  targetBracketInner: {
    width: 8,
    height: 8,
    borderWidth: 0.5,
    borderColor: PALETTE.textFog,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCenterAmber: {
    width: 3,
    height: 3,
    backgroundColor: PALETTE.titanium,
  },
  objectiveTagActive: {
    color: PALETTE.titanium,
    fontWeight: '700',
  },
  objectiveRangeActive: {
    color: PALETTE.textFog,
  },

  playerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  radarPing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 0.8,
    borderColor: PALETTE.titanium,
    backgroundColor: PALETTE.titaniumGlow,
  },
  playerOuterRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.textFog,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 9, 11, 0.85)',
  },
  playerHeadingPip: {
    position: 'absolute',
    top: 1,
    width: 2,
    height: 4,
    backgroundColor: PALETTE.titanium,
    borderRadius: 1,
  },
  playerCoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.titanium,
  },
  playerLabelContainer: {
    marginTop: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: 'rgba(8, 9, 11, 0.8)',
    borderRadius: 2,
  },
  playerLabelText: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    color: PALETTE.textFog,
    letterSpacing: 1.2,
  },

  hudCoordinates: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    padding: 6,
    backgroundColor: 'rgba(8, 9, 11, 0.65)',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
  },
  hudCoordText: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
    lineHeight: 11,
  },

  floatingActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  floatingActionBtn: {
    backgroundColor: PALETTE.titanium,
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  floatingActionText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE.obsidian,
    letterSpacing: 1.5,
  },
  floatingActionBtnSecondary: {
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
  },
  floatingActionTextSecondary: {
    color: PALETTE.textFog,
  },

  objectivePanelWrapper: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  panelContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelLeft: {
    flex: 1,
    paddingRight: 12,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panelSubheader: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  panelTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 18,
    fontWeight: '600',
    color: PALETTE.textFog,
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 4,
  },
  panelMetadata: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.textTertiary,
    letterSpacing: 1.2,
  },
  panelRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  panelDistance: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 0.5,
  },
  panelBearing: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  panelBearingDegrees: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
});
