import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const JoinGameScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recentCodes = ['RUIN42', 'ECHO09', 'VOID88'];

  const handleJoin = () => {
    if (code.trim().length !== 6) {
      setError('ROOM CODE MUST BE EXACTLY 6 ALPHANUMERIC CHARACTERS');
      return;
    }
    setError(null);
    navigate('LOBBY', {
      gameId: 'custom-session',
      roomCode: code.toUpperCase(),
    });
  };

  const handleSelectRecent = (val: string) => {
    setCode(val);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <Header
        title="DIRECT ACCESS"
        subtitle="ENTER OPERATION PROTOCOL"
        showBack
      />

      <View style={styles.content}>
        <Card style={styles.inputCard} accentTop>
          <Text style={styles.cardHeader}>ACCESS CODE INPUT</Text>
          <Input
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              if (error) setError(null);
            }}
            placeholder="XXXXXX"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
            error={error ?? undefined}
          />
          <Text style={styles.inputHint}>
            OBTAIN CODE FROM THE HOST AGENT OR SECTOR DISPATCH
          </Text>

          <Button
            label="AUTHENTICATE & ENTER"
            variant="primary"
            size="lg"
            disabled={code.trim().length < 4}
            onPress={handleJoin}
            style={{ marginTop: 14 }}
          />
        </Card>

        {/* Recent Codes */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>RECENT ENCOUNTER CODES</Text>
          <View style={styles.recentRow}>
            {recentCodes.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.recentPill}
                onPress={() => handleSelectRecent(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.recentText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Network Telemetry Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            // SATELLITE HANDSHAKE: CONNECTS TO REALTIME MATCH COORDINATOR UPON ENTRY.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  content: {
    padding: 18,
  },
  inputCard: {
    padding: 18,
    marginBottom: 24,
  },
  cardHeader: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titanium,
    letterSpacing: 2,
    marginBottom: 14,
  },
  codeInput: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 14,
  },
  inputHint: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentTitle: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  recentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recentPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
    borderRadius: 3,
  },
  recentText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: PALETTE.titanium,
    letterSpacing: 1.5,
  },
  noteBox: {
    padding: 12,
    borderLeftWidth: 1.5,
    borderLeftColor: PALETTE.borderActive,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  noteText: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: PALETTE.textTertiary,
    letterSpacing: 1,
    lineHeight: 12,
  },
});
