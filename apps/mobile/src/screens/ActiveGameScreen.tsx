import React, { useState, useEffect, useRef } from 'react';
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
import { Button } from '../components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ActiveGameScreen: React.FC = () => {
  const { navigate, params } = useNavigation();

  const [remainingSeconds, setRemainingSeconds] = useState(14 * 60 + 22); // 14:22
  const [scoreAlpha, setScoreAlpha] = useState(340);
  const [scoreOmega, setScoreOmega] = useState(210);
  const [objectiveCaptured, setObjectiveCaptured] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Match countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Radar animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim]);

  // Capture simulation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (capturing && captureProgress < 100) {
      interval = setInterval(() => {
        setCaptureProgress((prev) => {
          if (prev >= 100) {
            setCapturing(false);
            setObjectiveCaptured(true);
            setScoreAlpha((s) => s + 100);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [capturing, captureProgress]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndMission = () => {
    navigate('RESULTS', {
      matchId: params?.gameId || 'game-01',
      outcome: scoreAlpha >= scoreOmega ? 'VICTORY' : 'DEFEAT',
    });
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.3, 0.8, 1],
    outputRange: [0.6, 0.4, 0.1, 0],
  });

  return (
    <View style={styles.container}>
      {/* ================= ACTIVE HUD TOP BAR ================= */}
      <View style={styles.hudTopBar}>
        <View style={styles.scoresRow}>
          <View style={styles.scoreUnit}>
            <Text style={styles.teamTag}>ALPHA [YOU]</Text>
            <Text style={styles.scoreValueAlpha}>{scoreAlpha}</Text>
          </View>

          <View style={styles.timerCenter}>
            <Text style={styles.timerDigits}>{formatTimer(remainingSeconds)}</Text>
            <Text style={styles.timerSubtitle}>MISSION REMAINING</Text>
          </View>

          <View style={[styles.scoreUnit, { alignItems: 'flex-end' }]}>
            <Text style={styles.teamTag}>OMEGA</Text>
            <Text style={styles.scoreValueOmega}>{scoreOmega}</Text>
          </View>
        </View>
      </View>

      {/* ================= DOMINANT MAP CANVAS ================= */}
      <View style={styles.mapCanvas}>
        {/* Subtle Coordinates Grid */}
        <View style={styles.gridOverlay}>
          <View style={[styles.gridLineH, { top: '30%' }]} />
          <View style={[styles.gridLineH, { top: '60%' }]} />
          <View style={[styles.gridLineV, { left: '33%' }]} />
          <View style={[styles.gridLineV, { left: '66%' }]} />
        </View>

        {/* Topographic Rings */}
        <View style={styles.topographicLayer}>
          <View style={[styles.contourRing, styles.c1]} />
          <View style={[styles.contourRing, styles.c2]} />
          <View style={[styles.contourRing, styles.c3]} />
        </View>

        {/* Boundary Perimeter */}
        <View style={styles.boundaryRing}>
          <Text style={styles.boundaryText}>ZONE PERIMETER // R-400M</Text>
        </View>

        {/* Tactical Objective 03 (Active Focus) */}
        <View style={[styles.targetObjective, { top: '42%', left: '52%' }]}>
          <View style={styles.targetVector} />
          <View
            style={[
              styles.targetBracket,
              objectiveCaptured && styles.targetBracketSecured,
            ]}
          >
            <View
              style={[
                styles.targetCore,
                objectiveCaptured && styles.targetCoreSecured,
              ]}
            />
          </View>
          <Text style={styles.targetLabel}>
            {objectiveCaptured ? 'OBJ 03 [SECURED]' : 'OBJ 03 [THE SIGNAL]'}
          </Text>
          <Text style={styles.targetDistance}>
            {objectiveCaptured ? '+100 PTS' : '14 m // IN RANGE'}
          </Text>
        </View>

        {/* Field Agent (Player) Location */}
        <View style={[styles.playerContainer, { top: '55%', left: '44%' }]}>
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
            <View style={styles.playerPip} />
            <View style={styles.playerDot} />
          </View>
          <View style={styles.playerTag}>
            <Text style={styles.playerTagText}>AGENT 09</Text>
          </View>
        </View>

        {/* Realtime Proximity HUD overlay */}
        <View style={styles.telemetryOverlay}>
          <Text style={styles.telemetryCoord}>GPS ACCURACY: ±2.8M</Text>
          <Text style={styles.telemetryBearing}>BEARING: 042° NE</Text>
        </View>
      </View>

      {/* ================= ACTIVE OBJECTIVE & ACTION PANEL ================= */}
      <View style={styles.actionPanel}>
        <Card accentTop>
          <View style={styles.cardPadding}>
            <View style={styles.objectiveInfoRow}>
              <View>
                <View style={styles.badgeRow}>
                  <Text style={styles.objMeta}>OBJECTIVE 03</Text>
                  <Badge
                    label={objectiveCaptured ? 'SECURED' : 'PROXIMITY LOCK'}
                    variant={objectiveCaptured ? 'green' : 'titanium'}
                    style={{ marginLeft: 8 }}
                  />
                </View>
                <Text style={styles.objName}>THE SIGNAL</Text>
                <Text style={styles.objValue}>VALUE: 100 POINTS // SECTOR 03</Text>
              </View>

              <View style={styles.proximityDigits}>
                <Text style={styles.distanceHuge}>14 m</Text>
                <Text style={styles.distanceSub}>IN RADIUS</Text>
              </View>
            </View>

            {/* Extraction Progress Bar */}
            {capturing && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${captureProgress}%` }]} />
              </View>
            )}

            {/* Interaction Button */}
            {!objectiveCaptured ? (
              <Button
                label={capturing ? `SYNCHRONIZING... ${captureProgress}%` : 'COMMENCE EXTRACTION'}
                variant={capturing ? 'secondary' : 'primary'}
                onPress={() => setCapturing(true)}
                disabled={capturing}
                style={{ marginTop: 12 }}
              />
            ) : (
              <Button
                label="OBJECTIVE SECURED // REDEPLOY"
                variant="outline"
                onPress={() => {}}
                style={{ marginTop: 12 }}
              />
            )}

            {/* Abort / Finish Mission */}
            <TouchableOpacity
              style={styles.abortBtn}
              onPress={handleEndMission}
              activeOpacity={0.7}
            >
              <Text style={styles.abortText}>CEASE ENGAGEMENT // VIEW RESULTS</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  hudTopBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: PALETTE.obsidian,
    borderBottomWidth: 0.5,
    borderBottomColor: PALETTE.borderHairline,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreUnit: {
    minWidth: 80,
  },
  teamTag: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  scoreValueAlpha: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.titanium,
  },
  scoreValueOmega: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.textTertiary,
  },
  timerCenter: {
    alignItems: 'center',
  },
  timerDigits: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 2,
  },
  timerSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1.5,
    marginTop: 2,
  },

  mapCanvas: {
    flex: 1,
    position: 'relative',
    margin: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  topographicLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contourRing: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(200, 190, 170, 0.04)',
  },
  c1: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.45,
    borderRadius: SCREEN_WIDTH * 0.25,
  },
  c2: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: SCREEN_WIDTH * 0.42,
  },
  c3: {
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.1,
    borderRadius: SCREEN_WIDTH * 0.6,
  },
  boundaryRing: {
    position: 'absolute',
    alignSelf: 'center',
    top: '15%',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: (SCREEN_WIDTH * 0.8) / 2,
    borderWidth: 0.8,
    borderColor: 'rgba(200, 190, 170, 0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  boundaryText: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.5,
    backgroundColor: '#0A0C0E',
    paddingHorizontal: 4,
  },

  targetObjective: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  targetVector: {
    position: 'absolute',
    width: 40,
    height: 0.5,
    backgroundColor: 'rgba(200, 190, 170, 0.3)',
    top: 6,
    left: -28,
    transform: [{ rotate: '48deg' }],
  },
  targetBracket: {
    width: 22,
    height: 22,
    borderWidth: 0.8,
    borderColor: PALETTE.titanium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.titaniumGlass,
  },
  targetBracketSecured: {
    borderColor: PALETTE.accentGreen,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  targetCore: {
    width: 4,
    height: 4,
    backgroundColor: PALETTE.titanium,
  },
  targetCoreSecured: {
    backgroundColor: PALETTE.accentGreen,
  },
  targetLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 1,
    marginTop: 4,
  },
  targetDistance: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textFog,
    letterSpacing: 0.5,
  },

  playerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  radarPing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
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
  playerPip: {
    position: 'absolute',
    top: 1,
    width: 2,
    height: 4,
    backgroundColor: PALETTE.titanium,
  },
  playerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.titanium,
  },
  playerTag: {
    marginTop: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: 'rgba(8, 9, 11, 0.8)',
    borderRadius: 2,
  },
  playerTagText: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    color: PALETTE.textFog,
    letterSpacing: 1,
  },

  telemetryOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    padding: 6,
    backgroundColor: 'rgba(8, 9, 11, 0.7)',
    borderRadius: 3,
  },
  telemetryCoord: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
  telemetryBearing: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1,
    marginTop: 2,
  },

  actionPanel: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  cardPadding: {
    padding: 14,
  },
  objectiveInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  objMeta: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.5,
  },
  objName: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    fontWeight: '600',
    color: PALETTE.textFog,
    letterSpacing: 1.2,
  },
  objValue: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
  proximityDigits: {
    alignItems: 'flex-end',
  },
  distanceHuge: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE.textFog,
  },
  distanceSub: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.titanium,
    letterSpacing: 1,
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 1.5,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: PALETTE.titanium,
  },
  abortBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  abortText: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1.5,
  },
});
