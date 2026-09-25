import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

interface PlayerItem {
  id: string;
  callsign: string;
  isHost: boolean;
  isReady: boolean;
  team: 0 | 1;
}

export const LobbyScreen: React.FC = () => {
  const { navigate, params, goBack } = useNavigation();
  const roomCode = params?.roomCode || 'RUIN42';

  const [players, setPlayers] = useState<PlayerItem[]>([
    { id: 'p1', callsign: 'AGENT 09 (YOU)', isHost: true, isReady: true, team: 0 },
    { id: 'p2', callsign: 'CIPHER_X', isHost: false, isReady: true, team: 0 },
    { id: 'p3', callsign: 'SHADOW_VALKYRIE', isHost: false, isReady: true, team: 1 },
    { id: 'p4', callsign: 'NULL_VECTOR', isHost: false, isReady: false, team: 1 },
  ]);

  const [myTeam, setMyTeam] = useState<0 | 1>(0);

  const toggleTeam = () => {
    const nextTeam = myTeam === 0 ? 1 : 0;
    setMyTeam(nextTeam);
    setPlayers((prev) =>
      prev.map((p) => (p.id === 'p1' ? { ...p, team: nextTeam } : p))
    );
  };

  const handleStartMatch = () => {
    navigate('ACTIVE_GAME', {
      gameId: params?.gameId || 'game-01',
      roomCode,
    });
  };

  const teamAlpha = players.filter((p) => p.team === 0);
  const teamOmega = players.filter((p) => p.team === 1);

  return (
    <View style={styles.container}>
      <Header
        title={`ROOM #${roomCode}`}
        subtitle="PRE-DEPLOYMENT STAGING"
        showBack
        rightAction={<Badge label="4 / 8 CONNECTED" variant="titanium" />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Match Spec Card */}
        <Card style={styles.specCard} accentTop>
          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>MODE</Text>
              <Text style={styles.specValue}>CONVERGENCE</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>PERIMETER</Text>
              <Text style={styles.specValue}>400 METERS</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>TIMEFRAME</Text>
              <Text style={styles.specValue}>15:00</Text>
            </View>
          </View>
        </Card>

        {/* Team Rosters */}
        <View style={styles.rostersContainer}>
          {/* Team Alpha */}
          <View style={styles.teamSection}>
            <View style={styles.teamHeaderRow}>
              <Text style={styles.teamTitle}>TEAM ALPHA</Text>
              <Text style={styles.teamCount}>{teamAlpha.length} AGENTS</Text>
            </View>
            {teamAlpha.map((player) => (
              <Card key={player.id} style={styles.playerCard}>
                <View style={styles.playerRow}>
                  <View>
                    <Text style={styles.playerCallsign}>{player.callsign}</Text>
                    {player.isHost && (
                      <Text style={styles.playerRole}>// MISSION DISPATCHER</Text>
                    )}
                  </View>
                  <Badge
                    label={player.isReady ? 'READY' : 'STANDBY'}
                    variant={player.isReady ? 'green' : 'muted'}
                  />
                </View>
              </Card>
            ))}
          </View>

          {/* Team Omega */}
          <View style={styles.teamSection}>
            <View style={styles.teamHeaderRow}>
              <Text style={styles.teamTitle}>TEAM OMEGA</Text>
              <Text style={styles.teamCount}>{teamOmega.length} AGENTS</Text>
            </View>
            {teamOmega.map((player) => (
              <Card key={player.id} style={styles.playerCard}>
                <View style={styles.playerRow}>
                  <View>
                    <Text style={styles.playerCallsign}>{player.callsign}</Text>
                    {player.isHost && (
                      <Text style={styles.playerRole}>// MISSION DISPATCHER</Text>
                    )}
                  </View>
                  <Badge
                    label={player.isReady ? 'READY' : 'STANDBY'}
                    variant={player.isReady ? 'green' : 'muted'}
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Team Switcher */}
        <Button
          label={`SWITCH TO TEAM ${myTeam === 0 ? 'OMEGA' : 'ALPHA'}`}
          variant="secondary"
          onPress={toggleTeam}
          style={{ marginBottom: 12 }}
        />

        {/* Host Launch Action */}
        <Button
          label="INITIATE DEPLOYMENT"
          variant="primary"
          size="lg"
          onPress={handleStartMatch}
        />

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={goBack}
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
  content: {
    padding: 16,
    paddingBottom: 28,
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
