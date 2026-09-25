import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { PALETTE, FONTS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
}) => {
  const { goBack } = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>
      </View>

      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: PALETTE.obsidian,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: PALETTE.surfaceSmoked,
    borderWidth: 0.5,
    borderColor: PALETTE.borderHairline,
    borderRadius: 3,
  },
  backText: {
    fontFamily: FONTS.mono,
    fontSize: 18,
    color: PALETTE.titanium,
    lineHeight: 18,
  },
  titleText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.textFog,
    letterSpacing: 4,
  },
  subtitleText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: PALETTE.titaniumMuted,
    letterSpacing: 1.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  rightAction: {
    alignItems: 'flex-end',
  },
});
