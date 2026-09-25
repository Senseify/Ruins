import React, { useState, useEffect, useRef } from 'react';
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
import { apiClient } from '../services/apiClient';
import { realtimeClient } from '../services/realtimeClient';
import { locationService } from '../services/locationService';
import { calculateHaversineDistance, calculateBearing, bearingToCardinal } from '../services/geoUtils';
import { RuinsMap } from '../components/RuinsMap';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

export const ActiveGameScreen: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user } = useAuth();
  const gameId = params?.gameId;

  const [game, setGame] = useState<any>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [playerLocation, setPlayerLocation] = useState<GeoCoordinate | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [scoreAlpha, setScoreAlpha] = useState(0);
  const [scoreOmega, setScoreOmega] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load of Match State
  useEffect(() => {
    if (!gameId) return;

    const loadGame = async () => {
      const res = await apiClient.games.get(gameId);
      if (res.data?.game) {
        setGame(res.data.game);
        setObjectives(res.data.objectives || []);
        setRemainingSeconds(res.data.game.remainingSeconds ?? 900);

        // Calculate scores from players
        if (res.data.players) {
          const a = res.data.players
            .filter((p: any) => p.teamIndex === 0)
            .reduce((sum: number, p: any) => sum + (p.score || 0), 0);
          const o = res.data.players
            .filter((p: any) => p.teamIndex === 1)
            .reduce((sum: number, p: any) => sum + (p.score || 0), 0);
          setScoreAlpha(a);
          setScoreOmega(o);
        }

        // Default focus on first active objective
        const firstActive = res.data.objectives?.find((o: Objective) => o.status === 'ACTIVE');
        if (firstActive) setSelectedObjective(firstActive);
      }
      setLoading(false);
    };

    loadGame();
  }, [gameId]);

  // 2. Location Tracking & Telemetry Streaming
  useEffect(() => {
    // Start high-precision engagement tracking for active match
    locationService.startTracking('ENGAGEMENT', (coord) => {
      setPlayerLocation(coord);

      // Stream to server via WebSockets
      realtimeClient.sendLocation({
        latitude: coord.latitude,
        longitude: coord.longitude,
        speed: coord.speed,
        heading: coord.heading,
      });
    });

    return () => {
      locationService.setTrackingMode('IDLE');
    };
  }, []);

  // 3. Realtime WebSocket Match Room Events
  useEffect(() => {
    if (!gameId) return;

    realtimeClient.joinMatch(gameId);

    const unsubObjective = realtimeClient.on('objective_updated', (payload) => {
      setObjectives((prev) =>
        prev.map((obj) =>
          obj.id === payload.objectiveId
            ? { ...obj, status: payload.status, capturedByTeam: payload.capturedByTeam }
            : obj
        )
      );
    });

    const unsubScore = realtimeClient.on('score_updated', (payload) => {
      if (payload.teamIndex === 0) {
        setScoreAlpha((s) => s + payload.pointsAdded);
      } else {
        setScoreOmega((s) => s + payload.pointsAdded);
      }
    });

    const unsubEnd = realtimeClient.on('game_ended', () => {
      navigate('RESULTS', {
        matchId: gameId,
        outcome: scoreAlpha >= scoreOmega ? 'VICTORY' : 'DEFEAT',
      });
    });

    return () => {
      unsubObjective();
      unsubScore();
      unsubEnd();
    };
  }, [gameId, scoreAlpha, scoreOmega]);

  // 4. Authoritative Match Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('RESULTS', {
            matchId: gameId || 'game-01',
            outcome: scoreAlpha >= scoreOmega ? 'VICTORY' : 'DEFEAT',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameId, scoreAlpha, scoreOmega]);

  // 5. Calculate Real-time Distance & Bearing to Target Objective
  let targetDistance = 999;
  let targetBearing = 'NORTH';
  let isWithinRange = false;

  if (playerLocation && selectedObjective) {
    targetDistance = calculateHaversineDistance(
      { latitude: playerLocation.latitude, longitude: playerLocation.longitude },
      {
        latitude: selectedObjective.coordinate.latitude,
        longitude: selectedObjective.coordinate.longitude,
      }
    );
    const bearingDeg = calculateBearing(
      { latitude: playerLocation.latitude, longitude: playerLocation.longitude },
      {
        latitude: selectedObjective.coordinate.latitude,
        longitude: selectedObjective.coordinate.longitude,
      }
    );
    targetBearing = bearingToCardinal(bearingDeg);

    const effectiveRadius =
      selectedObjective.captureRadiusMeters + Math.min(playerLocation.accuracy ?? 5, 12);
    isWithinRange = targetDistance <= effectiveRadius;
  }

  // 6. Handle Objective Capture Interaction
  const handleCommenceCapture = async () => {
    if (!gameId || !selectedObjective || !playerLocation) return;
    setCapturing(true);
    setErrorMsg(null);
    setCaptureProgress(20);

    // Simulate sensory progress bar
    setTimeout(() => setCaptureProgress(60), 300);

    const res = await apiClient.games.capture(gameId, {
      objectiveId: selectedObjective.id,
      latitude: playerLocation.latitude,
      longitude: playerLocation.longitude,
      accuracy: playerLocation.accuracy,
    });

    setCaptureProgress(100);
    setCapturing(false);

    if (res.data?.objective) {
      // Local optimistic update while websocket event confirms
      setObjectives((prev) =>
        prev.map((o) =>
          o.id === selectedObjective.id ? { ...o, status: 'SECURED' } : o
        )
      );
    } else {
      setErrorMsg(res.error || 'Server rejected objective capture verification');
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={PALETTE.titanium} size="large" />
        <Text style={styles.loadingText}>SYNCHRONIZING SATELLITE THEATER...</Text>
      </View>
    );
  }

  const boundaryCenter = game
    ? { latitude: game.boundaryLat, longitude: game.boundaryLng }
    : undefined;

  return (
    <View style={styles.container}>
      {/* Top HUD Score & Countdown Bar */}
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

      {/* Dominant Real Map Canvas */}
      <View style={styles.mapCanvas}>
        <RuinsMap
          playerLocation={playerLocation}
          objectives={objectives}
          boundaryCenter={boundaryCenter}
          boundaryRadiusMeters={game?.boundaryRadiusMeters || 400}
          selectedObjectiveId={selectedObjective?.id}
          onSelectObjective={(obj) => setSelectedObjective(obj)}
          hasLocationPermission={true}
          onRequestPermission={() => {}}
          isLocationServicesEnabled={true}
        />
      </View>

      {/* Active Objective Interaction Panel */}
      <View style={styles.actionPanel}>
        <Card accentTop>
          <View style={styles.cardPadding}>
            {errorMsg && (
              <Text style={styles.errorText}>// {errorMsg}</Text>
            )}

            <View style={styles.objectiveInfoRow}>
              <View>
                <View style={styles.badgeRow}>
                  <Text style={styles.objMeta}>{selectedObjective?.code || 'OBJ 01'}</Text>
                  <Badge
                    label={
                      selectedObjective?.status === 'SECURED'
                        ? 'SECURED'
                        : isWithinRange
                        ? 'PROXIMITY LOCK'
                        : 'EN ROUTE'
                    }
                    variant={
                      selectedObjective?.status === 'SECURED'
                        ? 'green'
                        : isWithinRange
                        ? 'titanium'
                        : 'muted'
                    }
                    style={{ marginLeft: 8 }}
                  />
                </View>
                <Text style={styles.objName}>
                  {selectedObjective?.title || 'SECTOR NODE'}
                </Text>
                <Text style={styles.objValue}>
                  VALUE: {selectedObjective?.points || 100} POINTS // {targetBearing}
                </Text>
              </View>

              <View style={styles.proximityDigits}>
                <Text style={styles.distanceHuge}>{Math.round(targetDistance)} m</Text>
                <Text style={styles.distanceSub}>
                  {isWithinRange ? 'IN RANGE' : 'RANGE'}
                </Text>
              </View>
            </View>

            {/* Extraction Progress Bar */}
            {capturing && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${captureProgress}%` }]} />
              </View>
            )}

            {/* Interactive Capture Action */}
            {selectedObjective?.status !== 'SECURED' ? (
              <Button
                label={
                  capturing
                    ? `VERIFYING TELEMETRY... ${captureProgress}%`
                    : isWithinRange
                    ? 'COMMENCE EXTRACTION'
                    : `MOVE WITHIN ${selectedObjective?.captureRadiusMeters || 20}M TO CAPTURE`
                }
                variant={isWithinRange ? 'primary' : 'secondary'}
                disabled={!isWithinRange || capturing}
                onPress={handleCommenceCapture}
                style={{ marginTop: 12 }}
              />
            ) : (
              <Button
                label="OBJECTIVE SECURED // SELECT NEXT NODE"
                variant="outline"
                onPress={() => {
                  const nextActive = objectives.find((o) => o.status === 'ACTIVE');
                  if (nextActive) setSelectedObjective(nextActive);
                }}
                style={{ marginTop: 12 }}
              />
            )}

            {/* Cease Mission Action */}
            <TouchableOpacity
              style={styles.abortBtn}
              onPress={() =>
                navigate('RESULTS', {
                  matchId: gameId || 'game-01',
                  outcome: scoreAlpha >= scoreOmega ? 'VICTORY' : 'DEFEAT',
                })
              }
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginTop: 14,
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
    margin: 10,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
  },
  actionPanel: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  cardPadding: {
    padding: 14,
  },
  errorText: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.accentRed,
    letterSpacing: 1,
    marginBottom: 8,
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
