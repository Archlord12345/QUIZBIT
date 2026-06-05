import { COLORS } from './theme';

/** Espacements communs a tous les ecrans */
export const LAYOUT = {
  screenPaddingH: 20,
  screenPaddingBottom: 24,
  sectionGap: 16,
  cardGap: 12,
};

/** Tokens UI alignes sur LeaderboardCard */
export const UI = {
  line: '#e7e5e4',
  lineMuted: '#f5f5f4',
  inputBg: '#ffffff',
  surfaceMuted: '#f5f5f4',
  surfaceSoft: '#fdfafb',
  placeholder: '#78716c',
  helper: '#78716c',
  disabled: '#e7e5e4',
  chipBg: '#fcf5fb',
  chipBorder: '#f5ecf6',
  errorBg: '#fff1f2',
  violetSoft: '#fcf5fb',
  currentUserBg: 'rgba(250, 236, 238, 0.7)',
  currentUserBorder: '#edd3d8',
  brandWarm: '#ee6845',
  brandViolet: '#7a317a',
  avatarBg: '#e9eef7',
  trophyBg: '#fff7ed',
  trophyBorder: '#ffedd5',
  trendUpBg: '#ecfdf5',
  trendUpBorder: '#d1fae5',
  trendDownBg: '#fff1f2',
  trendDownBorder: '#ffe4e6',
};

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const SHADOW = {
  card: {
    shadowColor: '#2e1d33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  soft: {
    shadowColor: '#2e1d33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const inputColors = {
  background: UI.inputBg,
  border: UI.line,
  text: COLORS.text,
  placeholder: UI.placeholder,
};

export const cardOnDark = {
  backgroundColor: COLORS.surfaceLight,
  borderRadius: RADIUS.lg,
  padding: 24,
  borderWidth: 1,
  borderColor: UI.line,
  ...SHADOW.card,
};
