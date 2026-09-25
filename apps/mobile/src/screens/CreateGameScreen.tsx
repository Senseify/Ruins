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
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';

export const CreateGameScreen: React.FC = () => {
  const { navigate } = useNavigation();

  const [title, setTitle] = useState('OPERATION CONVERGENCE');
  const [radius, setRadius] = useState<number>(400);
  const [duration, setDuration] = useState<number>(15);
  const [generatedCode] = useState<string>(
    'RUIN' + Math.floor(10 + Math.random() * 90)
  );

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

  const handleDeploy = () => {
    navigate('LOBBY', {
      gameId: 'new-operation',
      roomCode: generatedCode,
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="NEW OPERATION"
        subtitle="ESTABLISH SECTOR THEATER"
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Generated Access Protocol */}
        <Card style={styles.protocolCard} accentTop>
          <View style={styles.protocolHeader}>
            <Text style={styles.protocolLabel}>GENERATED ROOM CODE</Text>
            <Badge label="HOST AUTHORIZED" variant="titanium" />
          </View>
          <Text style={styles.protocolCode}>{generatedCode}</Text>
          <Text style={styles.protocolHint}>
            SHARE WITH FIELD AGENTS TO JOIN PRE-DEPLOYMENT LOBBY
          </Text>
        </Card>

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
              <Badge label="CANON" variant="titanium" />
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
          label="ESTABLISH LOBBY"
          variant="primary"
          size="lg"
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
  protocolCard: {
    padding: 16,
    marginBottom: 20,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  protocolLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 1.8,
  },
  protocolCode: {
    fontFamily: FONTS.mono,
    fontSize: 26,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 4,
    marginVertical: 4,
  },
  protocolHint: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
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
