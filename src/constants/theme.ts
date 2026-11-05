/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
  },
  dark: {
    text: '#0F172A',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
  },
} as const;

/**
 * AeroNexus Clean Solid Light Theme
 * Tailored for modern, professional aviation intelligence.
 * No excessive gradients; crisp solid colors, subtle borders, and natural shadows.
 */
export const AeroTheme = {
  // Canvas & Surfaces
  canvas: '#F8FAFC',        // Crisp light slate background for screens
  card: '#FFFFFF',          // Clean pure white card surface
  cardSecondary: '#F1F5F9', // Subtle secondary container
  cardHighlight: '#EFF6FF', // Light blue tint surface
  
  // Borders & Dividers
  border: '#E2E8F0',        // Subtle crisp border
  borderMedium: '#CBD5E1',  // Defined divider line
  borderFocus: '#0284C7',   // Active state border
  
  // Text Colors (High Contrast & Legibility)
  textPrimary: '#0F172A',   // Deep slate / navy primary text
  textSecondary: '#334155', // Body text
  textMuted: '#64748B',     // Captions, subtitles
  textLight: '#94A3B8',     // Placeholders, disabled states
  
  // Brand Aviation Palette (Solid)
  primary: '#0284C7',       // Aviation sky blue
  primaryDark: '#0369A1',   // Deep navy accent
  primaryHover: '#0EA5E9',  // Vibrant interactive blue
  primaryLight: '#E0F2FE',  // Light blue badge background
  
  // Semantic Accents (Solid & Crisp)
  success: '#059669',       // Solid emerald green (On-time, Live)
  successLight: '#DCFCE7',  // Emerald badge background
  successText: '#15803D',   // Emerald badge text
  
  warning: '#D97706',       // Solid amber (Delayed, Stale)
  warningLight: '#FEF3C7',  // Amber badge background
  warningText: '#B45309',   // Amber badge text
  
  danger: '#DC2626',        // Solid crimson (Cancelled, Offline)
  dangerLight: '#FEE2E2',   // Crimson badge background
  dangerText: '#B91C1C',    // Crimson badge text
  
  info: '#2563EB',          // Solid royal blue
  infoLight: '#DBEAFE',     // Blue badge background
  infoText: '#1D4ED8',      // Blue badge text

  // Soft Natural Drop Shadows (iOS & Android)
  shadowSmall: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  shadowCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowModal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
  },
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
