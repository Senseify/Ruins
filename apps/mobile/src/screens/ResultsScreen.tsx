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
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const ResultsScreen: React.FC = () => {
  const { navigate, params } = useNavigation();
  const outcome = params?.outcome || 'VICTORY';
  const isVictory = outcome === 'VICTORY';

  return (
    <View style={styles.container}>
      <Header
        title="MISSION DEBRIEF"
        subtitle="THEATER RESULT RECONCILIATION"
        rightAction={<Badge label={outcome} variant={isVictory ? 'green' : 'muted'} />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Outcome Banner */}
        <Card style={styles.outcomeCard} accentTop>
          <Text style={styles.outcomeLabel}>OPERATIONAL STATUS</Text>
          <Text
            style={[
              styles.outcomeTitle,
              isVictory ? styles.textVictory : styles.textDefeat,
            ]}
          >
            {isVictory ? 'THEATER SECURED' : 'SECTOR CONCEDED'}
          </Text>
          <Text style={styles.outcomeDesc}>
            {isVictory
              ? 'Team Alpha maintained territorial convergence above the minimum quorum.'
              : 'Opposing operatives established dominant extraction threshold.'}
          </Text>
        </Card>

        {/* Team Score Tally */}
        <Card style={styles.scoreCard}>
          <Text style={styles.cardHeader}>FINAL SECTOR TALLY</Text>
          <View style={styles.tallyRow}>
            <View style={styles.tallyUnit}>
              <Text style={styles.tallyTeam}>TEAM ALPHA [YOU]</Text>
              <Text style={styles.tallyScoreAlpha}>440</Text>
              <Text style={styles.tallyStatus}>WINNER</Text>
            </View>

            <View style={styles.tallyDivider} />

            <View style={styles.tallyUnit}>
              <Text style={styles.tallyTeam}>TEAM OMEGA</Text>
              <Text style={styles.tallyScoreOmega}>210</Text>
              <Text style={styles.tallyStatus}>CONCEDED</Text>
            </View>
          </View>
        </Card>

        {/* Personal Agent Metrics */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>INDIVIDUAL AGENT DOSSIER</Text>
          <Card style={styles.metricsCard}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>THEATER PLACEMENT</Text>
              <Text style={styles.metricValue}>#1 / 4 AGENTS</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>PERSONAL CONTRIBUTION</Text>
              <Text style={styles.metricValue}>240 PTS</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>OBJECTIVES SECURED</Text>
              <Text style={styles.metricValue}>2 NODES</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>GROUND TRAVERSED</Text>
              <Text style={styles.metricValue}>1.42 KM</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>ELAPSED ACTIVE TIME</Text>
              <Text style={styles.metricValue}>14:22</Text>
            </View>
            <View style={[styles.metricRow, styles.xpRow]}>
              <Text style={styles.xpLabel}>PROGRESSION EARNED</Text>
              <Text style={styles.xpValue}>+180 XP</Text>
            </View>
          </Card>
        </View>

        {/* Actions */}
        <Button
          label="RETURN TO HQ [MAP]"
          variant="primary"
          size="lg"
          onPress={() => navigate('HOME')}
          style={{ marginBottom: 10 }}
        />
        <Button
          label="BROWSE NEW OPERATIONS"
          variant="secondary"
          onPress={() => navigate('GAMES')}
        />
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
  outcomeCard: {
    padding: 18,
    marginBottom: 16,
  },
  outcomeLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 4,
  },
  outcomeTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    marginVertical: 4,
  },
  textVictory: {
    color: PALETTE.titanium,
  },
  textDefeat: {
    color: PALETTE.textSecondary,
  },
  outcomeDesc: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    lineHeight: 13,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  scoreCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 12,
  },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tallyUnit: {
    alignItems: 'center',
    flex: 1,
  },
  tallyTeam: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  tallyScoreAlpha: {
    fontFamily: FONTS.mono,
    fontSize: 32,
    fontWeight: '700',
    color: PALETTE.titanium,
  },
  tallyScoreOmega: {
    fontFamily: FONTS.mono,
    fontSize: 32,
    fontWeight: '700',
    color: PALETTE.textTertiary,
  },
  tallyStatus: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  tallyDivider: {
    width: 0.5,
    height: 48,
    backgroundColor: PALETTE.borderHairline,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  metricsCard: {
    padding: 14,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: PALETTE.borderHairline,
  },
  metricLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
  metricValue: {
    fontFamily: FONTS.mono,
    fontSize: 9.5,
    color: PALETTE.textFog,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  xpRow: {
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingBottom: 2,
  },
  xpLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  xpValue: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 1,
  },
});
