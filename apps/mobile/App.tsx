import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { MatchStatus } from '@ruins/shared';

export default function App() {
  const initialStatus: MatchStatus = 'LOBBY';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RUINS</Text>
      <Text style={styles.subtitle}>Mobile Client Initialized</Text>
      <Text style={styles.status}>Status Contract: {initialStatus}</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f0f0f0',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  status: {
    fontSize: 12,
    color: '#4ade80',
    fontFamily: 'monospace',
  },
});
