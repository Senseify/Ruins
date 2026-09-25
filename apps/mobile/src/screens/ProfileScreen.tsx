import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

export const ProfileScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, loginAsQuickOperative } = useAuth();

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
        {/* If guest, show auth prompt */}
        {!user ? (
          <Card style={styles.guestCard} accentTop>
            <Text style={styles.guestTitle}>OPERATIVE UNREGISTERED</Text>
            <Text style={styles.guestDesc}>
              Authenticate to track personal XP, operational rankings, and mission logs.
            </Text>
            <Button
              label="INITIALIZE AGENT CALLSIGN"
              variant="primary"
              onPress={loginAsQuickOperative}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : (
          /* Agent Identity Card */
          <Card style={styles.identityCard} accentTop>
            <View style={styles.identityRow}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarInitials}>
                  {user.username.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.identityMeta}>
                <View style={styles.callsignRow}>
                  <Text style={styles.callsignText}>{user.username.toUpperCase()}</Text>
                  <Badge label="AUTHENTICATED" variant="titanium" style={{ marginLeft: 8 }} />
                </View>
                <Text style={styles.agentId}>ID: RN-{user.id.substring(0, 8).toUpperCase()}</Text>
                <Text style={styles.agentRank}>LEVEL {user.level} // FIELD OPERATIVE</Text>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={styles.xpBlock}>
              <View style={styles.xpTextRow}>
                <Text style={styles.xpLabel}>PROGRESSION TO NEXT LEVEL</Text>
                <Text style={styles.xpCount}>{user.xp % 500} / 500 XP</Text>
              </View>
              <View style={styles.xpTrack}>
                <View
                  style={[
                    styles.xpFill,
                    { width: `${Math.min(((user.xp % 500) / 500) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </Card>
        )}

        {/* Career Statistics */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>CUMULATIVE PERFORMANCE</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>{user?.gamesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>MISSIONS</Text>
            </Card>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>{user?.wins ?? 0}</Text>
              <Text style={styles.statLabel}>VICTORIES</Text>
            </Card>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>
                {user && user.gamesPlayed > 0
                  ? `${Math.round((user.wins / user.gamesPlayed) * 100)}%`
                  : '0%'}
              </Text>
              <Text style={styles.statLabel}>WIN RATE</Text>
            </Card>
            <Card style={styles.statBox}>
              <Text style={styles.statNumber}>{user?.totalScore ?? 0}</Text>
              <Text style={styles.statLabel}>TOTAL PTS</Text>
            </Card>
          </View>
        </View>

        {/* Tactical Security Audit */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>SECURITY CREDENTIAL AUDIT</Text>
          <Card style={styles.securityCard}>
            <Text style={styles.secLabel}>ENCRYPTION: AES-256 JWT BEARER</Text>
            <Text style={styles.secLabel}>LOCATION PRIVACY: 1HZ KINEMATIC TOLERANCE</Text>
            <Text style={styles.secLabel}>AUTHORITATIVE NODE: DISPATCH CONTROLLED</Text>
          </Card>
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
  guestCard: {
    padding: 16,
    marginBottom: 18,
    alignItems: 'center',
  },
  guestTitle: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 6,
  },
  guestDesc: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
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
  securityCard: {
    padding: 12,
    gap: 6,
  },
  secLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
  },
});
