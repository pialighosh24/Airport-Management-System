/**
 * AeroNexus Design System Tokens
 * 
 * Clean, professional, solid light theme for aviation operations and passenger tracking.
 * Features:
 * - Solid colors, zero excessive gradients
 * - High-contrast readable typography (Slate-900 on pure white / slate-50)
 * - Clear semantic status indicators (On-Time, Delayed, Cancelled, En Route)
 * - Consistent card and navigation layouts
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Palette = {
  // App Background & Surfaces
  background: '#F8FAFC',       // Crisp off-white app background
  surface: '#FFFFFF',          // Pure white for cards, panels, modals
  surfaceSubtle: '#F1F5F9',    // Light slate for chips, pills, unselected tabs
  surfaceHover: '#E2E8F0',     // Light hover state
  surfaceActive: '#E0F2FE',    // Active selection tint (Sky 100)

  // Borders & Dividers
  border: '#E2E8F0',           // 1px clean card border
  borderSubtle: '#F1F5F9',     // Subtle divider
  borderStrong: '#CBD5E1',     // High-visibility focus/active border

  // Text Hierarchy
  textPrimary: '#0F172A',      // Slate 900: Titles, headings, flight numbers
  textSecondary: '#334155',    // Slate 700: Body, subtitles, metrics
  textMuted: '#64748B',        // Slate 500: Helper text, timestamps, labels
  textPlaceholder: '#94A3B8',  // Slate 400: Input placeholders
  textInverted: '#FFFFFF',     // White text on solid colored buttons

  // Solid Brand Colors (Aviation Sky Blue & Solid Navy)
  primary: '#0284C7',          // Solid Sky Blue (primary buttons, active tabs)
  primaryHover: '#0369A1',     // Darker blue pressed state
  primaryLight: '#E0F2FE',     // Light solid blue for badges/pills
  primaryDark: '#075985',      // Deep navy

  // Semantic Status Badges (Solid & Crisp)
  success: '#059669',          // Solid Emerald (Valid, Landed, On-Time)
  successBg: '#ECFDF5',        // Solid light emerald container
  successText: '#065F46',      // Dark emerald text

  warning: '#D97706',          // Solid Amber (Delayed, Stale, Investigating)
  warningBg: '#FFFBEB',        // Solid light amber container
  warningText: '#92400E',      // Dark amber text

  danger: '#DC2626',           // Solid Red (Cancelled, Missing, Critical)
  dangerBg: '#FEF2F2',         // Solid light red container
  dangerText: '#991B1B',       // Dark red text

  info: '#2563EB',             // Solid Blue (Departed, Scheduled)
  infoBg: '#EFF6FF',           // Solid light blue container
  infoText: '#1E40AF',         // Dark blue text
} as const;

export const Colors = {
  light: {
    text: Palette.textPrimary,
    background: Palette.background,
    backgroundElement: Palette.surfaceSubtle,
    backgroundSelected: Palette.surfaceActive,
    textSecondary: Palette.textSecondary,
    border: Palette.border,
    primary: Palette.primary,
  },
  dark: {
    // Strictly follow user request: Light theme instead of dark mode
    text: Palette.textPrimary,
    background: Palette.background,
    backgroundElement: Palette.surfaceSubtle,
    backgroundSelected: Palette.surfaceActive,
    textSecondary: Palette.textSecondary,
    border: Palette.border,
    primary: Palette.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    serif: 'var(--font-serif, Georgia, serif)',
    rounded: 'var(--font-rounded, sans-serif)',
    mono: 'var(--font-mono, "SF Mono", Consolas, monospace)',
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
