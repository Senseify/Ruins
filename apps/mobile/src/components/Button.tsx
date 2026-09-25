import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        size === 'lg' ? styles.sizeLg : styles.sizeMd,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.textBase,
          variant === 'primary' ? styles.textPrimary : styles.textSecondary,
          variant === 'danger' && styles.textDanger,
          disabled && styles.textDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sizeLg: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: PALETTE.titanium,
  },
  secondary: {
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderSubtle,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: PALETTE.titanium,
  },
  danger: {
    backgroundColor: PALETTE.dangerMuted,
    borderWidth: 0.5,
    borderColor: PALETTE.accentRed,
  },
  disabled: {
    opacity: 0.4,
  },
  textBase: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  textPrimary: {
    color: PALETTE.obsidian,
  },
  textSecondary: {
    color: PALETTE.textFog,
  },
  textDanger: {
    color: PALETTE.accentRed,
  },
  textDisabled: {
    color: PALETTE.textSecondary,
  },
});
