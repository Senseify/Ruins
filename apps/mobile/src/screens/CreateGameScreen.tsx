import React, { useState } from 'react';
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
import { locationService } from '../services/locationService';
import { apiClient } from '../services/apiClient';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';

export const CreateGameScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, loginAsQuickOperative } = useAuth();

  const [title, setTitle] = useState('OPERATION CONVERGENCE');
  const [radius, setRadius] = useState<number>(400);
  const [duration, setDuration] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const radiusOptions = [
    { label: '200M', sub: 'MICRO', value: 200 },
    { label: '400M', sub: 'STANDARD', value: 400 },
    { label: '800M', sub: 'DISTRICT', value: 800 },
  ];

  const durationOptions = [
    { label: '10 MIN', value: 10 },
    { label: '15 MIN', value: 15 },
    { label: '25 MIN', value: 25 },
  ];

  const handleDeploy = async () => {
    setLoading(true);
    setErrorMsg(null);

    // Ensure operative is authenticated
    if (!user) {
      const authRes = await loginAsQuickOperative();
      if (!authRes.success) {
        setErrorMsg('Failed to establish operative credentials');
        setLoading(false);
        return;
      }
    }

    // Get current GPS fix to anchor match boundary
    const loc = await locationService.getCurrentLocation();
    const centerLat = loc?.latitude ?? 37.7749;
    const centerLng = loc?.longitude ?? -122.4194;

    const res = await apiClient.games.create({
      title,
      mode: 'CONVERGENCE',
      boundaryRadiusMeters: radius,
      durationMinutes: duration,
      centerLat,
      centerLng,
    });

    setLoading(false);

    if (res.data?.game) {
      navigate('LOBBY', {
        gameId: res.data.game.id,
        roomCode: res.data.game.roomCode,
      });
    } else {
      setErrorMsg(res.error || 'Failed to establish operation lobby');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="NEW OPERATION"
        subtitle="ESTABLISH SECTOR THEATER"
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error Alert */}
        {errorMsg && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>// {errorMsg}</Text>
          </Card>
        )}

        {/* Operation Title Input */}
        <Input
          label="OPERATION CODENAME"
          value={title}
          onChangeText={setTitle}
          placeholder="ENTER TITLE"
          maxLength={32}
        />

        {/* Mode Selector */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>ENGAGEMENT PROTOCOL</Text>
          <Card style={styles.modeCard}>
            <View style={styles.modeRow}>
              <View>
                <Text style={styles.modeTitle}>CONVERGENCE</Text>
                <Text style={styles.modeDesc}>
                  Proximity capture, node extraction & territory dominance
                </Text>
              </View>
              <Badge label="AUTHORITATIVE" variant="titanium" />
            </View>
          </Card>
        </View>

        {/* Playable Boundary Radius */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>ZONE PERIMETER RADIUS</Text>
          <View style={styles.pillRow}>
            {radiusOptions.map((opt) => {
              const isSelected = radius === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pillOption, isSelected && styles.pillOptionActive]}
                  onPress={() => setRadius(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillLabel, isSelected && styles.pillLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.pillSub, isSelected && styles.pillSubActive]}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Match Duration */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>MISSION TIMEFRAME</Text>
          <View style={styles.pillRow}>
            {durationOptions.map((opt) => {
              const isSelected = duration === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pillOption, isSelected && styles.pillOptionActive]}
                  onPress={() => setDuration(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillLabel, isSelected && styles.pillLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Physical Safety Notice */}
        <Card style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>// SAFETY PROTOCOL</Text>
          <Text style={styles.safetyText}>
            Objectives are generated within public bounds. Ensure your theater
            remains clear of private property, active roadways, and restricted terrain.
          </Text>
        </Card>

        {/* Deploy Button */}
        <Button
          label={loading ? 'SYNCHRONIZING SATELLITE...' : 'ESTABLISH LOBBY'}
          variant="primary"
          size="lg"
          disabled={loading}
          onPress={handleDeploy}
          style={{ marginTop: 8 }}
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
  },
  errorCard: {
    padding: 10,
    marginBottom: 14,
    backgroundColor: PALETTE.dangerMuted,
    borderColor: PALETTE.accentRed,
  },
  errorText: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.accentRed,
    letterSpacing: 1,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modeCard: {
    padding: 14,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeTitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.textFog,
    letterSpacing: 1.5,
  },
  modeDesc: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.textSecondary,
    letterSpacing: 0.5,
    marginTop: 4,
    maxWidth: 240,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
    borderRadius: 3,
  },
  pillOptionActive: {
    backgroundColor: PALETTE.titaniumGlass,
    borderColor: PALETTE.titanium,
  },
  pillLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.textSecondary,
    letterSpacing: 1,
  },
  pillLabelActive: {
    color: PALETTE.titanium,
  },
  pillSub: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
  pillSubActive: {
    color: PALETTE.titaniumMuted,
  },
  safetyCard: {
    padding: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(20, 22, 26, 0.4)',
  },
  safetyTitle: {
    fontFamily: FONTS.mono,
    fontSize: 8.5,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  safetyText: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    lineHeight: 12,
    letterSpacing: 0.8,
  },
});
