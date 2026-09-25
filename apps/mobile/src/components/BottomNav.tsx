import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';
import { NavTab } from '../navigation/types';

export const BottomNav: React.FC = () => {
  const { activeTab, switchTab } = useNavigation();

  const tabs: { key: NavTab; label: string }[] = [
    { key: 'MAP', label: 'MAP' },
    { key: 'GAMES', label: 'GAMES' },
    { key: 'PROFILE', label: 'PROFILE' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => switchTab(tab.key)}
          >
            {isActive && <View style={styles.activeIndicator} />}
            <Text style={[styles.navText, isActive && styles.navTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: PALETTE.obsidian,
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.borderHairline,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 10 : 14,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 18,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -14,
    width: 24,
    height: 1.5,
    backgroundColor: PALETTE.titanium,
  },
  navText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: PALETTE.textTertiary,
    letterSpacing: 3,
  },
  navTextActive: {
    color: PALETTE.textFog,
    fontWeight: '600',
  },
});
