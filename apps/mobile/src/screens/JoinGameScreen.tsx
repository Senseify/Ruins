import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const JoinGameScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { user, loginAsQuickOperative } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentCodes = ['RN42', 'ECHO', 'VOID'];

  const handleJoin = async () => {
    if (code.trim().length < 4) {
      setError('VALIDATION_ERROR: Room code must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError(null);

    // Auto authenticate as operative if needed
    if (!user) {
      const authRes = await loginAsQuickOperative();
      if (!authRes.success) {
        setError('Authentication required to join theater');
        setLoading(false);
        return;
      }
    }

    const res = await apiClient.games.join(code.trim().toUpperCase());
    setLoading(false);

    if (res.data?.game) {
      navigate('LOBBY', {
        gameId: res.data.game.id,
        roomCode: res.data.game.roomCode,
      });
    } else {
      setError(res.error || 'Failed to connect to operation');
    }
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
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
            error={error ?? undefined}
          />
          <Text style={styles.inputHint}>
            OBTAIN CODE FROM THE HOST AGENT OR SECTOR DIRECTORY
          </Text>

          <Button
            label={loading ? 'VERIFYING WITH SATELLITE...' : 'AUTHENTICATE & ENTER'}
            variant="primary"
            size="lg"
            disabled={code.trim().length < 3 || loading}
            onPress={handleJoin}
            style={{ marginTop: 14 }}
          />
        </Card>

        {/* Recent Codes */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>QUICK ENCOUNTER SHORTCUTS</Text>
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
