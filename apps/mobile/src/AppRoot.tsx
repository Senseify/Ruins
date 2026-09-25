import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { PALETTE } from './theme/colors';
import { NavigationProvider, useNavigation } from './navigation/NavigationContext';
import { BottomNav } from './components/BottomNav';

// Screens
import { HomeScreen } from './screens/HomeScreen';
import { GamesScreen } from './screens/GamesScreen';
import { CreateGameScreen } from './screens/CreateGameScreen';
import { JoinGameScreen } from './screens/JoinGameScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { ActiveGameScreen } from './screens/ActiveGameScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const ScreenRouter: React.FC = () => {
  const { currentScreen } = useNavigation();

  const showBottomNav =
    currentScreen === 'HOME' ||
    currentScreen === 'GAMES' ||
    currentScreen === 'PROFILE';

  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME':
        return <HomeScreen />;
      case 'GAMES':
        return <GamesScreen />;
      case 'CREATE_GAME':
        return <CreateGameScreen />;
      case 'JOIN_GAME':
        return <JoinGameScreen />;
      case 'LOBBY':
        return <LobbyScreen />;
      case 'ACTIVE_GAME':
        return <ActiveGameScreen />;
      case 'RESULTS':
        return <ResultsScreen />;
      case 'PROFILE':
        return <ProfileScreen />;
      case 'SETTINGS':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <View style={styles.contentArea}>{renderScreen()}</View>
      {showBottomNav && <BottomNav />}
    </View>
  );
};

export const AppRoot: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PALETTE.obsidian} />
      <SafeAreaView style={styles.safeArea}>
        <NavigationProvider>
          <ScreenRouter />
        </NavigationProvider>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  screenWrapper: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
});
