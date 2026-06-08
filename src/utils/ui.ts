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
  line: '#dfe7f5',
  lineMuted: '#eef2fb',
  inputBg: '#ffffff',
  surfaceMuted: '#eef3fc',
  surfaceSoft: '#f4f8ff',
  placeholder: '#7587a8',
  helper: '#7587a8',
  disabled: '#dfe7f5',
  chipBg: '#eaf1ff',
  chipBorder: '#d8e4fb',
  errorBg: '#fff1f2',
  violetSoft: '#eaf1ff',
  currentUserBg: 'rgba(37, 99, 235, 0.10)',
  currentUserBorder: '#bcd2fb',
  brandWarm: '#38bdf8',
  brandViolet: '#2563eb',
  avatarBg: '#e3ecfb',
  trophyBg: '#eff6ff',
  trophyBorder: '#dbeafe',
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
    shadowColor: '#0f1c44',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  soft: {
    shadowColor: '#0f1c44',
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
