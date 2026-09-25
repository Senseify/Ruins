import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

interface MatchHistoryEntry {
  id: string;
  title: string;
  date: string;
  outcome: 'VICTORY' | 'DEFEAT';
  points: number;
  objectives: number;
}

const MOCK_HISTORY: MatchHistoryEntry[] = [
  {
    id: 'h1',
    title: 'OPERATION CONVERGENCE',
    date: 'TODAY // 14:22',
    outcome: 'VICTORY',
    points: 240,
    objectives: 2,
  },
  {
    id: 'h2',
    title: 'DISTRICT 07 PURGE',
    date: 'YESTERDAY',
    outcome: 'VICTORY',
    points: 310,
    objectives: 3,
  },
  {
    id: 'h3',
    title: 'HARBOR EXTRACTION',
    date: '23 SEP 2026',
    outcome: 'DEFEAT',
    points: 90,
    objectives: 1,
  },
];

export const ProfileScreen: React.FC = () => {
  const { navigate } = useNavigation();

  return (
    <View style={styles.container}>
      <Header
        title="DOSSIER"
        subtitle="FIELD OPERATIVE PROFILE"
        rightAction={
          <Button
            label="CONFIG"
            variant="secondary"
            size="md"
            onPress={() => navigate('SETTINGS')}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Agent Identity Card */}
        <Card style={styles.identityCard} accentTop>
          <View style={styles.identityRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarInitials}>09</Text>
            </View>
            <View style={styles.identityMeta}>
              <View style={styles.callsignRow}>
                <Text style={styles.callsignText}>AGENT 09</Text>
                <Badge label="ACTIVE" variant="titanium" style={{ marginLeft: 8 }} />
              </View>
              <Text style={styles.agentId}>ID: RN-7749-ALPHA // SECTOR 03</Text>
              <Text style={styles.agentRank}>LEVEL 04 // FIELD OPERATIVE</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpBlock}>
            <View style={styles.xpTextRow}>
              <Text style={styles.xpLabel}>PROGRESSION TO LEVEL 05</Text>
              <Text style={styles.xpCount}>1,420 / 2,000 XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: '71%' }]} />
            </View>
          </View>
        </Card>

        {/* Career Statistics */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>CUMULATIVE PERFORMANCE</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>MISSIONS</Text>
            </Card>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>VICTORIES</Text>
            </Card>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>66%</Text>
              <Text style={styles.statLabel}>WIN RATE</Text>
            </Card>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>18.6k</Text>
              <Text style={styles.statLabel}>GROUND M</Text>
            </Card>
          </View>
        </View>

        {/* Mission History */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>RECENT THEATER LOGS</Text>
          {MOCK_HISTORY.map((match) => (
            <Card key={match.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyTitle}>{match.title}</Text>
                  <Text style={styles.historyDate}>{match.date}</Text>
                </View>
                <Badge
                  label={match.outcome}
                  variant={match.outcome === 'VICTORY' ? 'green' : 'muted'}
                />
              </View>
              <View style={styles.historyFooter}>
                <Text style={styles.historyMeta}>+{match.points} PTS</Text>
                <Text style={styles.historyMeta}>{match.objectives} CAPTURES</Text>
              </View>
            </Card>
          ))}
        </View>
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
  identityCard: {
    padding: 16,
    marginBottom: 18,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.8,
    borderColor: PALETTE.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.titanium,
  },
  identityMeta: {
    flex: 1,
  },
  callsignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  callsignText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 2,
  },
  agentId: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  agentRank: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
  xpBlock: {
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.borderHairline,
    paddingTop: 12,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
  },
  xpCount: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.titanium,
    fontWeight: '700',
  },
  xpTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: PALETTE.titanium,
  },

  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.textFog,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
  },

  historyCard: {
    padding: 12,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    fontWeight: '600',
    color: PALETTE.textFog,
    letterSpacing: 1,
  },
  historyDate: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.borderHairline,
    paddingTop: 8,
  },
  historyMeta: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
});
