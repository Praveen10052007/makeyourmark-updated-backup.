import React from 'react';
import { Palette, X, Sparkles, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import { THEME_PRESETS, useTheme } from '../contexts/ThemeContext';
import { CustomThemeColors, ThemeId } from '../types';

interface TriggerProps {
  compact?: boolean;
  className?: string;
  label?: string;
}

export const ThemeQuickButton: React.FC<TriggerProps> = ({
  compact = false,
  className = '',
  label = 'Themes',
}) => {
  const { setCustomizerOpen, colors } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setCustomizerOpen(true)}
      aria-label="Customize app theme and colors"
      title="Themes & Color Studio"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900/90 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 transition ${className}`}
    >
      <span
        className="w-3 h-3 rounded-full border border-white/40 shrink-0"
        style={{ backgroundColor: colors.accent }}
      />
      <Palette className="w-3.5 h-3.5 shrink-0" />
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
};

interface ModalProps {
  onSaveToProfile?: (themeId: ThemeId, customColors: CustomThemeColors) => void;
}

export const ThemeCustomizerModal: React.FC<ModalProps> = ({ onSaveToProfile }) => {
  const {
    themeId,
    colors,
    animatedBgEnabled,
    customizerOpen,
    setThemePreset,
    updateCustomColors,
    setAnimatedBgEnabled,
    setCustomizerOpen,
    textContrast,
    buttonContrast,
  } = useTheme();

  if (!customizerOpen) return null;

  const handleSelectPreset = (id: Exclude<ThemeId, 'custom'>) => {
    setThemePreset(id);
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (preset && onSaveToProfile) {
      onSaveToProfile(id, preset.colors);
    }
  };

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    const next = { ...colors, [key]: value };
    updateCustomColors({ [key]: value });
    if (onSaveToProfile) {
      onSaveToProfile('custom', next);
    }
  };

  const textAccessible = textContrast >= 4.5;
  const buttonAccessible = buttonContrast >= 3.0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-white/95 dark:bg-[#16161b]/95 backdrop-blur-xl p-6 shadow-2xl space-y-5 my-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
              style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Theme & Visual Studio
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose from 8 curated themes or customize every colour. Saved automatically across sessions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCustomizerOpen(false)}
            aria-label="Close theme customizer"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8 Presets */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2.5">
            Curated Themes (8 Presets)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {THEME_PRESETS.map((preset) => {
              const active = themeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`relative rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                  style={{ backgroundColor: preset.colors.surface, color: preset.colors.textPrimary }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/25"
                        style={{ backgroundColor: preset.colors.background }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/25"
                        style={{ backgroundColor: preset.colors.accent }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/25"
                        style={{ backgroundColor: preset.colors.buttonBg }}
                      />
                    </div>
                    {active && <Check className="w-4 h-4" style={{ color: preset.colors.accent }} />}
                  </div>
                  <p className="text-xs font-bold leading-tight">{preset.name}</p>
                  <p className="text-[10px] opacity-75 line-clamp-1 mt-0.5">{preset.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Colour Pickers */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Custom Palette Controls
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset('sunset-orange')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-orange-500"
            >
              <RotateCcw className="w-3 h-3" /> Reset Default
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(
              [
                { key: 'background', label: 'Background' },
                { key: 'surface', label: 'Cards & Panels' },
                { key: 'accent', label: 'Accent Highlight' },
                { key: 'buttonBg', label: 'Primary Button' },
                { key: 'buttonText', label: 'Button Text' },
                { key: 'textPrimary', label: 'Main Text' },
              ] as { key: keyof CustomThemeColors; label: string }[]
            ).map((field) => (
              <label
                key={field.key}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 cursor-pointer"
              >
                <div>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                    {field.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{colors[field.key]}</span>
                </div>
                <input
                  type="color"
                  value={colors[field.key]}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  className="h-7 w-7 rounded-lg border-0 bg-transparent cursor-pointer"
                />
              </label>
            ))}
          </div>

          {/* Live Readability / Contrast Check */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px]">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  textAccessible ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {textAccessible ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                Text Contrast: {textContrast.toFixed(1)}:1 {textAccessible ? '(Readable)' : '(Low contrast — adjust text/bg)'}
              </span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  buttonAccessible ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                Button Contrast: {buttonContrast.toFixed(1)}:1
              </span>
            </div>
          </div>
        </div>

        {/* 3D Animated Fireball Background Toggle */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-3.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                3D Multicolour Glowing Particle Backdrop
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Lightweight 3D fireballs behind content; auto-pauses when hidden &amp; optimized for 4 GB RAM devices.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAnimatedBgEnabled(!animatedBgEnabled)}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              animatedBgEnabled
                ? 'bg-emerald-600 text-white'
                : 'border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            {animatedBgEnabled ? 'Enabled' : 'Paused'}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setCustomizerOpen(false)}
            className="rounded-xl px-5 py-2 text-xs font-bold shadow-md transition"
            style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
