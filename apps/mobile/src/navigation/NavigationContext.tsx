import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ScreenName, RootStackParamList, NavTab } from './types';

interface NavigationState {
  currentScreen: ScreenName;
  params: any;
  activeTab: NavTab;
  canGoBack: boolean;
  navigate: <T extends ScreenName>(screen: T, params?: RootStackParamList[T]) => void;
  goBack: () => void;
  switchTab: (tab: NavTab) => void;
}

const NavigationContext = createContext<NavigationState | null>(null);

interface HistoryItem {
  screen: ScreenName;
  params?: any;
}

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([{ screen: 'HOME' }]);
  const [activeTab, setActiveTab] = useState<NavTab>('MAP');

  const current = history[history.length - 1];

  const navigate = <T extends ScreenName>(screen: T, params?: RootStackParamList[T]) => {
    // If navigating to a main tab screen, update active tab indicator
    if (screen === 'HOME') setActiveTab('MAP');
    else if (screen === 'GAMES') setActiveTab('GAMES');
    else if (screen === 'PROFILE') setActiveTab('PROFILE');

    setHistory((prev) => [...prev, { screen, params }]);
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory((prev) => {
        const next = prev.slice(0, prev.length - 1);
        const top = next[next.length - 1];
        if (top.screen === 'HOME') setActiveTab('MAP');
        else if (top.screen === 'GAMES') setActiveTab('GAMES');
        else if (top.screen === 'PROFILE') setActiveTab('PROFILE');
        return next;
      });
    }
  };

  const switchTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'MAP') {
      setHistory([{ screen: 'HOME' }]);
    } else if (tab === 'GAMES') {
      setHistory([{ screen: 'GAMES' }]);
    } else if (tab === 'PROFILE') {
      setHistory([{ screen: 'PROFILE' }]);
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        currentScreen: current.screen,
        params: current.params,
        activeTab,
        canGoBack: history.length > 1,
        navigate,
        goBack,
        switchTab,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationState => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
