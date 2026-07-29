import { Mood, ThemePreference } from './types';

export interface Palette {
  background: string;
  surface: string;
  elevated: string;
  input: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  border: string;
  divider: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
  nav: string;
  overlay: string;
  isDark: boolean;
}

export const lightPalette: Palette = {
  background: '#F5F2EB',
  surface: '#FCFAF6',
  elevated: '#FFFFFF',
  input: '#F0EDE6',
  ink: '#202723',
  inkMuted: '#66706A',
  inkFaint: '#969D98',
  primary: '#356859',
  primaryDark: '#244A40',
  primarySoft: '#DDEAE4',
  accent: '#D99C5E',
  accentSoft: '#F6E4D0',
  border: '#E4E0D8',
  divider: '#EBE7DF',
  danger: '#B9544F',
  dangerSoft: '#F8E2DF',
  shadow: '#1C2822',
  nav: 'rgba(252,250,246,0.97)',
  overlay: 'rgba(24,31,27,0.48)',
  isDark: false,
};

export const darkPalette: Palette = {
  background: '#151A17',
  surface: '#1C231F',
  elevated: '#242C27',
  input: '#29312C',
  ink: '#F4F2EC',
  inkMuted: '#ADB6B0',
  inkFaint: '#7F8983',
  primary: '#7EB09E',
  primaryDark: '#A3CCBD',
  primarySoft: '#263B33',
  accent: '#E2A86D',
  accentSoft: '#3B3023',
  border: '#343D38',
  divider: '#2A332E',
  danger: '#E17D76',
  dangerSoft: '#402B2A',
  shadow: '#000000',
  nav: 'rgba(28,35,31,0.97)',
  overlay: 'rgba(0,0,0,0.64)',
  isDark: true,
};

export const resolvePalette = (
  preference: ThemePreference,
  systemIsDark: boolean,
): Palette => {
  if (preference === 'dark' || (preference === 'system' && systemIsDark)) {
    return darkPalette;
  }
  return lightPalette;
};

export const moodMeta: Record<
  Mood,
  { emoji: string; label: string; light: string; dark: string }
> = {
  bright: { emoji: '😄', label: 'Bright', light: '#F6D98E', dark: '#5B4C25' },
  good: { emoji: '🙂', label: 'Good', light: '#C9E2C6', dark: '#304A31' },
  okay: { emoji: '😐', label: 'Okay', light: '#DCE3DE', dark: '#39413C' },
  low: { emoji: '😔', label: 'Low', light: '#C9D7E7', dark: '#2C3C4E' },
  rough: { emoji: '😣', label: 'Rough', light: '#E8C7C1', dark: '#51322F' },
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const shadows = {
  card: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  floating: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
};
