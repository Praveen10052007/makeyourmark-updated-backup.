import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CustomThemeColors, ThemeId } from '../types';

export interface ThemePreset {
  id: Exclude<ThemeId, 'custom'>;
  name: string;
  tagline: string;
  isDark: boolean;
  colors: CustomThemeColors;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    tagline: 'Deep obsidian canvas with warm gold accents',
    isDark: true,
    colors: {
      background: '#0b0c12',
      surface: '#141622',
      accent: '#f59e0b',
      buttonBg: '#d97706',
      buttonText: '#ffffff',
      textPrimary: '#f4f4f5',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    tagline: 'Deep sapphire slate with crisp sky blue highlights',
    isDark: true,
    colors: {
      background: '#06101f',
      surface: '#0d1c33',
      accent: '#38bdf8',
      buttonBg: '#0284c7',
      buttonText: '#ffffff',
      textPrimary: '#f0f9ff',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    tagline: 'Calm emerald dark studio with mint highlights',
    isDark: true,
    colors: {
      background: '#061510',
      surface: '#0d231b',
      accent: '#34d399',
      buttonBg: '#059669',
      buttonText: '#ffffff',
      textPrimary: '#ecfdf5',
    },
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    tagline: 'Velvet indigo with vibrant violet accents',
    isDark: true,
    colors: {
      background: '#100a1e',
      surface: '#1b1230',
      accent: '#c084fc',
      buttonBg: '#9333ea',
      buttonText: '#ffffff',
      textPrimary: '#faf5ff',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    tagline: 'Signature warm charcoal with MakeYourMark ember',
    isDark: true,
    colors: {
      background: '#121114',
      surface: '#19181d',
      accent: '#fb923c',
      buttonBg: '#ea580c',
      buttonText: '#ffffff',
      textPrimary: '#fafafa',
    },
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    tagline: 'Deep plum dark backdrop with rose highlights',
    isDark: true,
    colors: {
      background: '#170a12',
      surface: '#24111d',
      accent: '#f472b6',
      buttonBg: '#db2777',
      buttonText: '#ffffff',
      textPrimary: '#fdf2f8',
    },
  },
  {
    id: 'warm-cream',
    name: 'Warm Cream',
    tagline: 'Paper-soft daylight palette for comfortable reading',
    isDark: false,
    colors: {
      background: '#fcf7ef',
      surface: '#ffffff',
      accent: '#c2410c',
      buttonBg: '#ea580c',
      buttonText: '#ffffff',
      textPrimary: '#1c1917',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    tagline: 'Pure black canvas with maximum legibility yellow',
    isDark: true,
    colors: {
      background: '#000000',
      surface: '#0b0b0f',
      accent: '#facc15',
      buttonBg: '#facc15',
      buttonText: '#000000',
      textPrimary: '#ffffff',
    },
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(normalized, 16);
  if (Number.isNaN(num)) return [18, 18, 20];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isColorDark(hex: string): boolean {
  return getRelativeLuminance(hex) < 0.35;
}

interface ThemeContextValue {
  themeId: ThemeId;
  colors: CustomThemeColors;
  isDark: boolean;
  animatedBgEnabled: boolean;
  customizerOpen: boolean;
  setThemePreset: (id: Exclude<ThemeId, 'custom'>) => void;
  updateCustomColors: (partial: Partial<CustomThemeColors>) => void;
  setAnimatedBgEnabled: (enabled: boolean) => void;
  setCustomizerOpen: (open: boolean) => void;
  applyProfileTheme: (themeId?: ThemeId, customColors?: CustomThemeColors) => void;
  textContrast: number;
  buttonContrast: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_THEME_ID = 'mym_theme_id_v1';
const STORAGE_CUSTOM_COLORS = 'mym_custom_colors_v1';
const STORAGE_BG_ENABLED = 'mym_animated_bg_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_ID) as ThemeId | null;
    if (saved && (saved === 'custom' || THEME_PRESETS.some((p) => p.id === saved))) {
      return saved;
    }
    const legacy = localStorage.getItem('mym_theme');
    return legacy === 'light' ? 'warm-cream' : 'sunset-orange';
  });

  const [colors, setColors] = useState<CustomThemeColors>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_COLORS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.background && parsed?.accent && parsed?.textPrimary) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    const preset = THEME_PRESETS.find((p) => p.id === themeId) || THEME_PRESETS[4];
    return preset.colors;
  });

  const [animatedBgEnabled, setAnimatedBgEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_BG_ENABLED);
    return saved === null ? true : saved === 'true';
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);

  const isDark = useMemo(() => isColorDark(colors.background), [colors.background]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_ID, themeId);
    localStorage.setItem(STORAGE_CUSTOM_COLORS, JSON.stringify(colors));
    localStorage.setItem('mym_theme', isDark ? 'dark' : 'light');

    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');

    const [ar, ag, ab] = hexToRgb(colors.accent);
    const [sr, sg, sb] = hexToRgb(colors.surface);

    root.style.setProperty('--mym-bg', colors.background);
    root.style.setProperty('--mym-surface', colors.surface);
    root.style.setProperty('--mym-surface-glass', `rgba(${sr}, ${sg}, ${sb}, ${isDark ? 0.78 : 0.88})`);
    root.style.setProperty('--mym-accent', colors.accent);
    root.style.setProperty('--mym-accent-soft', `rgba(${ar}, ${ag}, ${ab}, 0.16)`);
    root.style.setProperty('--mym-button-bg', colors.buttonBg);
    root.style.setProperty('--mym-button-text', colors.buttonText);
    root.style.setProperty('--mym-text', colors.textPrimary);
    root.style.setProperty('--mym-muted', isDark ? '#a1a1aa' : '#57534e');
    root.style.setProperty('--mym-border', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(28,25,23,0.12)');
  }, [themeId, colors, isDark]);

  const setThemePreset = (id: Exclude<ThemeId, 'custom'>) => {
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setThemeId(id);
    setColors({ ...preset.colors });
  };

  const updateCustomColors = (partial: Partial<CustomThemeColors>) => {
    setThemeId('custom');
    setColors((prev) => ({ ...prev, ...partial }));
  };

  const setAnimatedBgEnabled = (enabled: boolean) => {
    setAnimatedBgEnabledState(enabled);
    localStorage.setItem(STORAGE_BG_ENABLED, String(enabled));
  };

  const applyProfileTheme = (nextId?: ThemeId, nextCustom?: CustomThemeColors) => {
    if (!nextId) return;
    if (nextId === 'custom' && nextCustom?.background && nextCustom?.accent) {
      setThemeId('custom');
      setColors(nextCustom);
      return;
    }
    const preset = THEME_PRESETS.find((p) => p.id === nextId);
    if (preset) {
      setThemeId(preset.id);
      setColors(nextCustom?.background ? { ...preset.colors, ...nextCustom } : { ...preset.colors });
    }
  };

  const textContrast = useMemo(() => getContrastRatio(colors.textPrimary, colors.background), [colors]);
  const buttonContrast = useMemo(() => getContrastRatio(colors.buttonText, colors.buttonBg), [colors]);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        colors,
        isDark,
        animatedBgEnabled,
        customizerOpen,
        setThemePreset,
        updateCustomColors,
        setAnimatedBgEnabled,
        setCustomizerOpen,
        applyProfileTheme,
        textContrast,
        buttonContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
