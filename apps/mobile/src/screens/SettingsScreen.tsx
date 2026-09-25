import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const SettingsScreen: React.FC = () => {
  const [audioTelemetry, setAudioTelemetry] = useState(true);
  const [hapticAlerts, setHapticAlerts] = useState(true);
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [cartographyNoir, setCartographyNoir] = useState(true);

  return (
    <View style={styles.container}>
      <Header
        title="SYSTEM"
        subtitle="DEVICE TELEMETRY & PREFERENCES"
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sensory Telemetry Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>SENSORY & AUDIO FEEDBACK</Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingMeta}>
                <Text style={styles.settingLabel}>BINAURAL RADAR AUDIO</Text>
                <Text style={styles.settingDesc}>
                  Auditory proximity pulse increases frequency when nearing active objective.
                </Text>
              </View>
              <Switch
                value={audioTelemetry}
                onValueChange={setAudioTelemetry}
                trackColor={{ false: '#1c1f24', true: PALETTE.borderActive }}
                thumbColor={audioTelemetry ? PALETTE.titanium : '#444850'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingMeta}>
                <Text style={styles.settingLabel}>HAPTIC PROXIMITY PING</Text>
                <Text style={styles.settingDesc}>
                  Haptic pulses notify arrival inside the 20-meter capture radius without screen staring.
                </Text>
              </View>
              <Switch
                value={hapticAlerts}
                onValueChange={setHapticAlerts}
                trackColor={{ false: '#1c1f24', true: PALETTE.borderActive }}
                thumbColor={hapticAlerts ? PALETTE.titanium : '#444850'}
              />
            </View>
          </Card>
        </View>

        {/* Geospatial / Hardware Optimization */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>GEOSPATIAL & HARDWARE</Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingMeta}>
                <Text style={styles.settingLabel}>HIGH-PRECISION SATELLITE LOCK</Text>
                <Text style={styles.settingDesc}>
                  1 Hz GPS polling. Disable to conserve battery during extended missions.
                </Text>
              </View>
              <Switch
                value={highAccuracyGps}
                onValueChange={setHighAccuracyGps}
                trackColor={{ false: '#1c1f24', true: PALETTE.borderActive }}
                thumbColor={highAccuracyGps ? PALETTE.titanium : '#444850'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingMeta}>
                <Text style={styles.settingLabel}>OBSIDIAN NOIR CARTOGRAPHY</Text>
                <Text style={styles.settingDesc}>
                  Monochrome vector rendering for OLED power efficiency outdoors.
                </Text>
              </View>
              <Switch
                value={cartographyNoir}
                onValueChange={setCartographyNoir}
                trackColor={{ false: '#1c1f24', true: PALETTE.borderActive }}
                thumbColor={cartographyNoir ? PALETTE.titanium : '#444850'}
              />
            </View>
          </Card>
        </View>

        {/* Physical Safety & Liability */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>PHYSICAL SAFETY DIRECTIVE</Text>
          <Card style={styles.safetyCard}>
            <Text style={styles.safetyHeader}>// OPERATIONAL MANDATE</Text>
            <Text style={styles.safetyText}>
              RUINS is played in physical reality. Field agents are strictly responsible
              for ambient environmental awareness. Never enter active traffic lanes,
              trespass on private property, or look at device screens while running or traversing obstacles.
            </Text>
          </Card>
        </View>

        {/* Session Maintenance */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>SESSION MANAGEMENT</Text>
          <Button
            label="PURGE OFFLINE CACHE"
            variant="secondary"
            onPress={() => {}}
            style={{ marginBottom: 10 }}
          />
          <Button
            label="DISENGAGE OPERATIVE SESSION"
            variant="danger"
            onPress={() => {}}
          />
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
  settingCard: {
    padding: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingMeta: {
    flex: 1,
    paddingRight: 14,
  },
  settingLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  settingDesc: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
  divider: {
    height: 0.5,
    backgroundColor: PALETTE.borderHairline,
    marginVertical: 10,
  },
  safetyCard: {
    padding: 14,
    backgroundColor: 'rgba(20, 22, 26, 0.4)',
  },
  safetyHeader: {
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
    lineHeight: 13,
    letterSpacing: 0.8,
  },
});
