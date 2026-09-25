import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const GamesScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, loginAsQuickOperative } = useAuth();

  const [games, setGames] = useState<any[]>([]);
  const [quickCode, setQuickCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGames = async () => {
    setLoading(true);
    const res = await apiClient.games.list();
    if (res.data?.games) {
      setGames(res.data.games);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleQuickJoin = async () => {
    if (!user) {
      await loginAsQuickOperative();
    }

    if (quickCode.trim().length >= 4) {
      setErrorMsg(null);
      const res = await apiClient.games.join(quickCode.toUpperCase());
      if (res.data?.game) {
        navigate('LOBBY', {
          gameId: res.data.game.id,
          roomCode: res.data.game.roomCode,
        });
      } else {
        setErrorMsg(res.error || 'Failed to join match');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="OPERATIONS"
        subtitle="THEATER DIRECTORY // SATELLITE FEED"
        rightAction={<Badge label={`${games.length} ACTIVE`} variant="titanium" />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchGames}
            tintColor={PALETTE.titanium}
          />
        }
      >
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
                placeholder="ROOM CODE"
                value={quickCode}
                onChangeText={(text) => {
                  setQuickCode(text.toUpperCase());
                  if (errorMsg) setErrorMsg(null);
                }}
                maxLength={6}
                autoCapitalize="characters"
                style={styles.quickInput}
                error={errorMsg ?? undefined}
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

        {/* Active Operations List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE SECTOR SESSIONS</Text>
          <Text style={styles.sectionSubtitle}>BROADCAST RANGE: 20 KM</Text>
        </View>

        {games.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO ACTIVE THEATERS IN RANGE</Text>
            <Text style={styles.emptySubtitle}>
              Create a new operation or invite nearby field agents with a room code.
            </Text>
          </Card>
        )}

        {games.map((game) => (
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
                  <Text style={styles.distanceValue}>R-{game.boundaryRadiusMeters}M</Text>
                  <Text style={styles.distanceLabel}>PERIMETER</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerMeta}>MODE: {game.mode}</Text>
                <Text style={styles.footerMeta}>TIMEFRAME: {Math.round(game.durationSeconds / 60)}M</Text>
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
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textTertiary,
    textAlign: 'center',
    lineHeight: 13,
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
    fontSize: 13,
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
