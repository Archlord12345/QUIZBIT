import { COLORS } from './theme';

/** Tokens UI partagés (app mobile + référence panels web) */
export const UI = {
  line: '#DFE1E6',
  lineMuted: '#E7E5E4',
  inputBg: '#FAFBFC',
  surfaceMuted: '#F0F2F5',
  surfaceSoft: '#F4F5F7',
  placeholder: '#6B778C',
  helper: '#5E6C84',
  disabled: '#B3D4FF',
  chipBg: '#EAF2FF',
  errorBg: '#FEF2F2',
  violetSoft: '#F3E8FF',
  brandWarm: '#EE6845',
  brandViolet: '#7A317A',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
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
  borderWidth: 0,
  ...SHADOW.card,
};
