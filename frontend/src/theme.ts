// Modern Design System inspired by Gov.gr Wallet & Banking Apps
// Minimal, Clean, Modern

export const LightTheme = {
  // Primary colors - Modern teal/emerald for money/savings theme
  primary: '#0D9488',        // Teal-600
  primaryLight: '#CCFBF1',   // Teal-100
  primaryDark: '#0F766E',    // Teal-700
  
  // Accent for highlights
  accent: '#6366F1',         // Indigo-500
  accentLight: '#E0E7FF',    // Indigo-100
  
  // Background colors
  background: '#F8FAFC',     // Slate-50
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Card colors
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',     // Slate-200
  
  // Text colors
  text: '#0F172A',           // Slate-900
  textSecondary: '#475569',  // Slate-600
  textMuted: '#94A3B8',      // Slate-400
  textInverse: '#FFFFFF',
  
  // Border colors
  border: '#E2E8F0',         // Slate-200
  borderLight: '#F1F5F9',    // Slate-100
  
  // Status colors
  success: '#10B981',        // Emerald-500
  successLight: '#D1FAE5',   // Emerald-100
  error: '#EF4444',          // Red-500
  errorLight: '#FEE2E2',     // Red-100
  warning: '#F59E0B',        // Amber-500
  warningLight: '#FEF3C7',   // Amber-100
  info: '#3B82F6',           // Blue-500
  infoLight: '#DBEAFE',      // Blue-100
  
  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#0D9488',
  tabInactive: '#94A3B8',
  
  // Special
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const DarkTheme = {
  // Primary colors
  primary: '#2DD4BF',        // Teal-400
  primaryLight: '#134E4A',   // Teal-900
  primaryDark: '#5EEAD4',    // Teal-300
  
  // Accent
  accent: '#818CF8',         // Indigo-400
  accentLight: '#312E81',    // Indigo-900
  
  // Background colors
  background: '#0F172A',     // Slate-900
  surface: '#1E293B',        // Slate-800
  surfaceElevated: '#334155', // Slate-700
  
  // Card colors
  card: '#1E293B',           // Slate-800
  cardBorder: '#334155',     // Slate-700
  
  // Text colors
  text: '#F1F5F9',           // Slate-100
  textSecondary: '#CBD5E1',  // Slate-300
  textMuted: '#64748B',      // Slate-500
  textInverse: '#0F172A',
  
  // Border colors
  border: '#334155',         // Slate-700
  borderLight: '#1E293B',    // Slate-800
  
  // Status colors
  success: '#34D399',        // Emerald-400
  successLight: '#064E3B',   // Emerald-900
  error: '#F87171',          // Red-400
  errorLight: '#7F1D1D',     // Red-900
  warning: '#FBBF24',        // Amber-400
  warningLight: '#78350F',   // Amber-900
  info: '#60A5FA',           // Blue-400
  infoLight: '#1E3A8A',      // Blue-900
  
  // Tab bar
  tabBar: '#1E293B',
  tabBarBorder: '#334155',
  tabActive: '#2DD4BF',
  tabInactive: '#64748B',
  
  // Special
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export type ThemeColors = typeof LightTheme;

// Typography
export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  
  // Font weights
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  
  // Line heights
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

// Spacing (8pt grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

// Border radius
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
