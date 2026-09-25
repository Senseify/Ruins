import { Platform } from 'react-native';

export const PALETTE = {
  obsidian: '#08090B',
  obsidianElevated: '#111317',
  surfaceSmoked: 'rgba(17, 19, 23, 0.78)',
  surfacePanel: 'rgba(14, 16, 20, 0.92)',
  surfaceCard: '#0E1014',
  borderHairline: 'rgba(255, 255, 255, 0.06)',
  borderSubtle: 'rgba(255, 255, 255, 0.12)',
  borderActive: 'rgba(200, 190, 170, 0.4)',
  
  textFog: '#EDEFEF',
  textSecondary: '#858B93',
  textTertiary: '#4F545D',
  
  titanium: '#C8BEAA',
  titaniumMuted: '#9B9180',
  titaniumGlass: 'rgba(200, 190, 170, 0.12)',
  titaniumGlow: 'rgba(200, 190, 170, 0.22)',
  
  accentAmber: '#D4A373',
  accentGreen: '#4ADE80',
  accentRed: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
};

export const FONTS = {
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  sans: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  sansMedium: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'sans-serif-medium',
};
