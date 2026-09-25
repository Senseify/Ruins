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
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const [audioTelemetry, setAudioTelemetry] = useState(true);
  const [hapticAlerts, setHapticAlerts] = useState(true);
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [serverUrl, setServerUrl] = useState(apiClient.getBaseUrl());
  const [urlSaved, setUrlSaved] = useState(false);

  const handleSaveUrl = () => {
    apiClient.setBaseUrl(serverUrl.trim());
    setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 2000);
  };

  return (
    <View style={styles.container}>
      <Header
        title="SYSTEM"
        subtitle="DEVICE TELEMETRY & PREFERENCES"
        showBack
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Network Endpoint Configuration */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>SATELLITE DISPATCH ENDPOINT</Text>
          <Card style={styles.settingCard}>
            <Input
              label="BACKEND API URL"
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.x.x:3001"
              autoCapitalize="none"
              autoCorrect={false}
              hint="Use your machine's LAN IP when testing on a physical phone via Expo Go."
            />
            <Button
              label={urlSaved ? 'ENDPOINT UPDATED [✓]' : 'APPLY ENDPOINT'}
              variant="outline"
              onPress={handleSaveUrl}
            />
          </Card>
        </View>

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
                  1 Hz GPS polling during active missions. Automatically throttles when standby.
                </Text>
              </View>
              <Switch
                value={highAccuracyGps}
                onValueChange={setHighAccuracyGps}
                trackColor={{ false: '#1c1f24', true: PALETTE.borderActive }}
                thumbColor={highAccuracyGps ? PALETTE.titanium : '#444850'}
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
        {user && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>SESSION MANAGEMENT</Text>
            <Button
              label={`DISENGAGE OPERATIVE (${user.username.toUpperCase()})`}
              variant="danger"
              onPress={logout}
            />
          </View>
        )}
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
