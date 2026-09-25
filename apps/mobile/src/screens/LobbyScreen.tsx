import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { realtimeClient } from '../services/realtimeClient';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const LobbyScreen: React.FC = () => {
  const { navigate, params, goBack } = useNavigation();
  const { user } = useAuth();

  const gameId = params?.gameId;
  const initialRoomCode = params?.roomCode || 'RN42';

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fetchLobby = async () => {
    if (!gameId) return;
    const res = await apiClient.games.get(gameId);
    if (res.data?.game) {
      setGame(res.data.game);
      setPlayers(res.data.players || []);
    } else {
      setErrorMsg(res.error || 'Failed to sync with lobby');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLobby();

    if (gameId) {
      // Connect to match WebSocket channel
      realtimeClient.joinMatch(gameId);

      // Subscribe to real-time events
      const unsubJoined = realtimeClient.on('player_joined', (payload) => {
        setPlayers((prev) => {
          if (prev.some((p) => p.userId === payload.userId)) return prev;
          return [...prev, payload];
        });
      });

      const unsubLeft = realtimeClient.on('player_left', (payload) => {
        setPlayers((prev) => prev.filter((p) => p.userId !== payload.userId));
      });

      const unsubReady = realtimeClient.on('player_ready', (payload) => {
        setPlayers((prev) =>
          prev.map((p) =>
            p.userId === payload.userId ? { ...p, isReady: payload.isReady } : p
          )
        );
      });

      const unsubTeam = realtimeClient.on('team_updated', (payload) => {
        setPlayers((prev) =>
          prev.map((p) =>
            p.userId === payload.userId ? { ...p, teamIndex: payload.teamIndex } : p
          )
        );
      });

      const unsubStarted = realtimeClient.on('game_started', () => {
        navigate('ACTIVE_GAME', {
          gameId,
          roomCode: game?.roomCode || initialRoomCode,
        });
      });

      return () => {
        unsubJoined();
        unsubLeft();
        unsubReady();
        unsubTeam();
        unsubStarted();
      };
    }
  }, [gameId]);

  const currentPlayer = players.find((p) => p.userId === user?.id);
  const isHost = currentPlayer?.isHost ?? (game?.hostUserId === user?.id);
  const myTeam = currentPlayer?.teamIndex ?? 0;
  const isReady = currentPlayer?.isReady ?? false;

  const toggleReady = async () => {
    if (!gameId) return;
    const nextReady = !isReady;
    await apiClient.games.ready(gameId, nextReady);
    setPlayers((prev) =>
      prev.map((p) =>
        p.userId === user?.id ? { ...p, isReady: nextReady } : p
      )
    );
  };

  const toggleTeam = async () => {
    if (!gameId) return;
    const nextTeam = myTeam === 0 ? 1 : 0;
    await apiClient.games.switchTeam(gameId, nextTeam);
    setPlayers((prev) =>
      prev.map((p) =>
        p.userId === user?.id ? { ...p, teamIndex: nextTeam } : p
      )
    );
  };

  const handleStartMission = async () => {
    if (!gameId) return;
    setStarting(true);
    setErrorMsg(null);
    const res = await apiClient.games.start(gameId);
    setStarting(false);

    if (res.data?.game) {
      navigate('ACTIVE_GAME', {
        gameId,
        roomCode: game?.roomCode || initialRoomCode,
      });
    } else {
      setErrorMsg(res.error || 'Failed to initiate mission deployment');
    }
  };

  const teamAlpha = players.filter((p) => p.teamIndex === 0);
  const teamOmega = players.filter((p) => p.teamIndex === 1);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={PALETTE.titanium} size="large" />
        <Text style={styles.loadingText}>SYNCHRONIZING SATELLITE LOBBY...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={`ROOM #${game?.roomCode || initialRoomCode}`}
        subtitle="PRE-DEPLOYMENT STAGING"
        showBack
        rightAction={<Badge label={`${players.length} CONNECTED`} variant="titanium" />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {errorMsg && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>// {errorMsg}</Text>
          </Card>
        )}

        {/* Match Spec Card */}
        <Card style={styles.specCard} accentTop>
          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>MODE</Text>
              <Text style={styles.specValue}>{game?.mode || 'CONVERGENCE'}</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PERIMETER</Text>
              <Text style={styles.specValue}>{game?.boundaryRadiusMeters || 400}M</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>TIMEFRAME</Text>
              <Text style={styles.specValue}>
                {Math.round((game?.durationSeconds || 900) / 60)}:00
              </Text>
            </View>
          </View>
        </Card>

        {/* Team Rosters */}
        <View style={styles.rostersContainer}>
          {/* Team Alpha */}
          <View style={styles.teamSection}>
            <View style={styles.teamHeaderRow}>
              <Text style={styles.teamTitle}>TEAM ALPHA</Text>
              <Text style={styles.teamCount}>{teamAlpha.length} OPERATIVES</Text>
            </View>
            {teamAlpha.map((p) => (
              <Card key={p.userId} style={styles.playerCard}>
                <View style={styles.playerRow}>
                  <View>
                    <Text style={styles.playerCallsign}>
                      {p.username || p.displayName}
                      {p.userId === user?.id ? ' [YOU]' : ''}
                    </Text>
                    {p.isHost && (
                      <Text style={styles.playerRole}>// MISSION DISPATCHER</Text>
                    )}
                  </View>
                  <Badge
                    label={p.isReady ? 'READY' : 'STANDBY'}
                    variant={p.isReady ? 'green' : 'muted'}
                  />
                </View>
              </Card>
            ))}
          </View>

          {/* Team Omega */}
          <View style={styles.teamSection}>
            <View style={styles.teamHeaderRow}>
              <Text style={styles.teamTitle}>TEAM OMEGA</Text>
              <Text style={styles.teamCount}>{teamOmega.length} OPERATIVES</Text>
            </View>
            {teamOmega.map((p) => (
              <Card key={p.userId} style={styles.playerCard}>
                <View style={styles.playerRow}>
                  <View>
                    <Text style={styles.playerCallsign}>
                      {p.username || p.displayName}
                      {p.userId === user?.id ? ' [YOU]' : ''}
                    </Text>
                    {p.isHost && (
                      <Text style={styles.playerRole}>// MISSION DISPATCHER</Text>
                    )}
                  </View>
                  <Badge
                    label={p.isReady ? 'READY' : 'STANDBY'}
                    variant={p.isReady ? 'green' : 'muted'}
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Player Controls */}
        <View style={styles.buttonRow}>
          <Button
            label={`SWITCH TEAM (${myTeam === 0 ? 'OMEGA' : 'ALPHA'})`}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={toggleTeam}
          />
          <Button
            label={isReady ? 'READY [✓]' : 'SET READY'}
            variant={isReady ? 'outline' : 'primary'}
            style={{ flex: 1 }}
            onPress={toggleReady}
          />
        </View>

        {/* Host Start Deployment Action */}
        {isHost ? (
          <Button
            label={starting ? 'DEPLOYING SATELLITE...' : 'INITIATE DEPLOYMENT'}
            variant="primary"
            size="lg"
            disabled={starting}
            onPress={handleStartMission}
            style={{ marginTop: 12 }}
          />
        ) : (
          <Card style={styles.waitingCard}>
            <Text style={styles.waitingText}>
              WAITING FOR HOST DISPATCHER TO INITIATE MISSION...
            </Text>
          </Card>
        )}

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={async () => {
            if (gameId) await apiClient.games.leave(gameId);
            goBack();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.leaveText}>ABANDON LOBBY</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  errorCard: {
    padding: 10,
    marginBottom: 12,
    backgroundColor: PALETTE.dangerMuted,
    borderColor: PALETTE.accentRed,
  },
  errorText: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.accentRed,
    letterSpacing: 1,
  },
  specCard: {
    padding: 12,
    marginBottom: 18,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  specItem: {
    alignItems: 'center',
  },
  specLabel: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 1,
  },
  specDivider: {
    width: 0.5,
    height: 18,
    backgroundColor: PALETTE.borderHairline,
  },
  rostersContainer: {
    marginBottom: 16,
  },
  teamSection: {
    marginBottom: 14,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  teamTitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: PALETTE.titanium,
    letterSpacing: 2,
    fontWeight: '700',
  },
  teamCount: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
  playerCard: {
    padding: 12,
    marginBottom: 6,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerCallsign: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: PALETTE.textFog,
    letterSpacing: 1,
    fontWeight: '600',
  },
  playerRole: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  waitingCard: {
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  waitingText: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  leaveBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  leaveText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.textTertiary,
    letterSpacing: 2,
  },
});
