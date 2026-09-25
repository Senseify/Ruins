import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';

interface BadgeProps {
  label: string;
  variant?: 'titanium' | 'green' | 'muted' | 'danger';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'titanium',
  style,
}) => {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: FONTS.mono,
    fontSize: 7.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titanium: {
    backgroundColor: PALETTE.titaniumGlass,
    borderColor: 'rgba(200, 190, 170, 0.3)',
  },
  titaniumText: {
    color: PALETTE.titanium,
  },
  green: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  greenText: {
    color: PALETTE.accentGreen,
  },
  muted: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: PALETTE.borderHairline,
  },
  mutedText: {
    color: PALETTE.textSecondary,
  },
  danger: {
    backgroundColor: PALETTE.dangerMuted,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerText: {
    color: PALETTE.accentRed,
  },
});
