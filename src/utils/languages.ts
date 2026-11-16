import { LearningLanguage, SupportedLanguage } from '../types';

export interface LanguageOption {
  id: SupportedLanguage;
  label: string;
  nativeLabel: string;
  speechCode: string;
  description: string;
}

export const SUPPORTED_CHAT_LANGUAGES: LanguageOption[] = [
  {
    id: 'auto',
    label: 'Auto-Detect',
    nativeLabel: 'Auto',
    speechCode: 'en-IN',
    description: 'Detects your input language automatically (EN / Tamil / Tanglish / Hindi / Telugu / Malayalam / Kannada)',
  },
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechCode: 'en-US',
    description: 'Clear, simple English',
  },
  {
    id: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    speechCode: 'ta-IN',
    description: 'தமிழ் விளக்கம் with English technical terms',
  },
  {
    id: 'tanglish',
    label: 'Tanglish',
    nativeLabel: 'Tanglish',
    speechCode: 'ta-IN',
    description: 'Friendly Tamil in English script + technical terms',
  },
  {
    id: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    speechCode: 'hi-IN',
    description: 'सरल हिन्दी with English technical terms',
  },
  {
    id: 'te',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    speechCode: 'te-IN',
    description: 'తెలుగు వివరణ with English technical terms',
  },
  {
    id: 'ml',
    label: 'Malayalam',
    nativeLabel: 'മലയാളം',
    speechCode: 'ml-IN',
    description: 'മലയാളം വിശദീകരണം with English technical terms',
  },
  {
    id: 'kn',
    label: 'Kannada',
    nativeLabel: 'ಕನ್ನಡ',
    speechCode: 'kn-IN',
    description: 'ಕನ್ನಡ ವಿವರಣೆ with English technical terms',
  },
];

export const LEARNING_LANGUAGES = SUPPORTED_CHAT_LANGUAGES.filter(
  (l): l is LanguageOption & { id: LearningLanguage } => l.id !== 'auto'
);

export function getSpeechLocale(lang: SupportedLanguage): string {
  const match = SUPPORTED_CHAT_LANGUAGES.find((l) => l.id === lang);
  return match?.speechCode || 'en-IN';
}

export function getLanguageLabel(lang: SupportedLanguage): string {
  const match = SUPPORTED_CHAT_LANGUAGES.find((l) => l.id === lang);
  return match ? match.nativeLabel : 'English';
}
