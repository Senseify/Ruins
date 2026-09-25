import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { PALETTE } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accentTop?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, accentTop = false }) => {
  return (
    <View style={[styles.card, style]}>
      {accentTop && <View style={styles.accentBar} />}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: PALETTE.surfacePanel,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
    borderRadius: 4,
    overflow: 'hidden',
  },
  accentBar: {
    height: 1.5,
    width: '100%',
    backgroundColor: PALETTE.titanium,
    opacity: 0.8,
  },
});
