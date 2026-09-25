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
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface MockGameItem {
  id: string;
  roomCode: string;
  title: string;
  mode: string;
  radiusMeters: number;
  playersCount: number;
  maxPlayers: number;
  status: 'LOBBY' | 'ACTIVE';
  distanceMeters: number;
  timeRemaining?: string;
}

const MOCK_GAMES: MockGameItem[] = [
  {
    id: 'game-01',
    roomCode: 'RUIN42',
    title: 'OPERATION CONVERGENCE',
    mode: 'CONVERGENCE',
    radiusMeters: 400,
    playersCount: 3,
    maxPlayers: 8,
    status: 'LOBBY',
    distanceMeters: 65,
  },
  {
    id: 'game-02',
    roomCode: 'ECHO09',
    title: 'DISTRICT 07 PURGE',
    mode: 'CONVERGENCE',
    radiusMeters: 800,
    playersCount: 6,
    maxPlayers: 8,
    status: 'ACTIVE',
    distanceMeters: 280,
    timeRemaining: '18:42',
  },
  {
    id: 'game-03',
    roomCode: 'VOID88',
    title: 'HARBOR EXTRACTION',
    mode: 'CONVERGENCE',
    radiusMeters: 300,
    playersCount: 2,
    maxPlayers: 4,
    status: 'LOBBY',
    distanceMeters: 510,
  },
];

export const GamesScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const [quickCode, setQuickCode] = useState('');

  const handleQuickJoin = () => {
    if (quickCode.trim().length >= 4) {
      navigate('LOBBY', { gameId: 'custom', roomCode: quickCode.toUpperCase() });
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="OPERATIONS"
        subtitle="THEATER DIRECTORY // LOCAL SECTOR"
        rightAction={
          <Badge label="3 NEARBY" variant="titanium" />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions Row */}
        <View style={styles.actionRow}>
          <Button
            label="+ CREATE GAME"
            variant="primary"
            style={styles.actionButton}
            onPress={() => navigate('CREATE_GAME')}
          />
          <Button
            label="ENTER CODE"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => navigate('JOIN_GAME')}
          />
        </View>

        {/* Quick Join Input Box */}
        <Card style={styles.quickJoinCard}>
          <View style={styles.quickJoinContent}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Input
                label="DIRECT PROTOCOL JOIN"
                placeholder="6-DIGIT ROOM CODE"
                value={quickCode}
                onChangeText={(text) => setQuickCode(text.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                style={styles.quickInput}
              />
            </View>
            <Button
              label="CONNECT"
              variant="outline"
              disabled={quickCode.length < 4}
              onPress={handleQuickJoin}
              style={{ marginTop: 22 }}
            />
          </View>
        </Card>

        {/* Available Operations Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE SECTOR SESSIONS</Text>
          <Text style={styles.sectionSubtitle}>BROADCAST RANGE: 1.0 KM</Text>
        </View>

        {MOCK_GAMES.map((game) => (
          <TouchableOpacity
            key={game.id}
            activeOpacity={0.8}
            onPress={() => {
              if (game.status === 'LOBBY') {
                navigate('LOBBY', { gameId: game.id, roomCode: game.roomCode });
              } else {
                navigate('ACTIVE_GAME', { gameId: game.id, roomCode: game.roomCode });
              }
            }}
          >
            <Card style={styles.gameCard} accentTop={game.status === 'ACTIVE'}>
              <View style={styles.cardHeader}>
                <View>
                  <View style={styles.codeRow}>
                    <Text style={styles.roomCodeText}>#{game.roomCode}</Text>
                    <Badge
                      label={game.status}
                      variant={game.status === 'ACTIVE' ? 'green' : 'titanium'}
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                </View>

                <View style={styles.distanceBlock}>
                  <Text style={styles.distanceValue}>{game.distanceMeters} m</Text>
                  <Text style={styles.distanceLabel}>RANGE</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerMeta}>
                  MODE: {game.mode} // R-{game.radiusMeters}M
                </Text>
                <Text style={styles.footerMeta}>
                  AGENTS: {game.playersCount}/{game.maxPlayers}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  quickJoinCard: {
    padding: 14,
    marginBottom: 20,
  },
  quickJoinContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quickInput: {
    marginBottom: 0,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: PALETTE.titanium,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  gameCard: {
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomCodeText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: PALETTE.titanium,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  gameTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    fontWeight: '600',
    color: PALETTE.textFog,
    letterSpacing: 1.2,
  },
  distanceBlock: {
    alignItems: 'flex-end',
  },
  distanceValue: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.textFog,
  },
  distanceLabel: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.borderHairline,
    paddingTop: 10,
  },
  footerMeta: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
});
