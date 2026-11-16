import React, { useState, useEffect } from 'react';
import {
  User,
  Download,
  Upload,
  Check,
  Save,
  HardDrive,
  Sun,
  Moon,
  Monitor,
  GraduationCap,
  Target,
  Code2,
  Clock,
  Plus,
  Trash2,
  Zap,
  Camera,
  Mic,
  Smartphone,
  Sliders,
  Bot,
  Shield,
  Bell,
  RefreshCw,
  AlertCircle,
  Cloud,
  Palette,
} from 'lucide-react';
import {
  UserProfile,
  KnownSkill,
  ThemePreference,
  UserSession,
  AIProviderInfo,
  AIProviderId,
  LearningLanguage,
} from '../../types';
import { fetchAIProviders } from '../../services/api';
import { getWorkspaceAccessToken } from '../../services/firebaseClient';
import { ALL_DEPARTMENTS, DEPARTMENT_CATEGORIES, findDepartmentMeta } from '../../data/departments';
import { LEARNING_LANGUAGES } from '../../utils/languages';
import { THEME_PRESETS, useTheme } from '../../contexts/ThemeContext';
import { PWAInstallButton } from '../PWAInstallButton';
import { DevicePermissionsModal } from '../DevicePermissionsModal';
import { ConfirmModal } from '../ConfirmModal';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  theme?: 'light' | 'dark';
  themePreference?: ThemePreference;
  onChangeThemePreference?: (pref: ThemePreference) => void;
  onToggleTheme?: () => void;
  session?: UserSession;
  onOpenAuthModal?: () => void;
  onClearAllData?: () => void;
  onDeleteAccount?: () => Promise<void> | void;
}

export const ProfileSettingsView: React.FC<Props> = ({
  profile,
  onUpdateProfile,
  themePreference = 'dark',
  onChangeThemePreference,
  session,
  onOpenAuthModal,
  onClearAllData,
  onDeleteAccount,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Live AI Providers state
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const { themeId, setThemePreset, setCustomizerOpen } = useTheme();
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<KnownSkill['level']>('Intermediate');
  const [newLearningSkill, setNewLearningSkill] = useState('');
  const [newWantSkill, setNewWantSkill] = useState('');
  const [newTargetCompany, setNewTargetCompany] = useState('');
  const [newInterest, setNewInterest] = useState('');

  // Confirm dialogs for destructive actions
  const [confirmAction, setConfirmAction] = useState<'clear-chat' | 'clear-all' | 'delete-account' | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const selectedDeptMeta = findDepartmentMeta(formData.department);
  const activeCategory = formData.departmentCategory || selectedDeptMeta.category;
  const departmentsInCategory = ALL_DEPARTMENTS.filter((d) => d.category === activeCategory);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await fetchAIProviders();
      setProviders(res.providers || []);
    } catch {
      // keep empty cleanly
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    showNotice('success', 'All profile, AI model, and privacy preferences saved.');
  };

  const activeProviderId: AIProviderId = formData.aiSettings?.provider || 'gemini';
  const activeProviderMeta = providers.find((p) => p.id === activeProviderId);

  const handleSelectProvider = (providerId: AIProviderId) => {
    const meta = providers.find((p) => p.id === providerId);
    const nextModel = meta?.defaultModel || formData.aiSettings?.model || 'gemini-3.1-flash-lite';
    const nextSettings = {
      provider: providerId,
      model: nextModel,
      responseStyle: formData.aiSettings?.responseStyle || 'balanced',
      difficulty: formData.aiSettings?.difficulty || 'intermediate',
      allowFallback: formData.aiSettings?.allowFallback !== false,
    };
    const nextProfile = { ...formData, aiSettings: nextSettings };
    setFormData(nextProfile);
    onUpdateProfile(nextProfile);
  };

  const handleToggleNotifications = async () => {
    const currentlyOn = Boolean(formData.privacySettings?.notificationsEnabled);
    if (!currentlyOn && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'denied') {
          showNotice('error', 'Browser notification permission is blocked. Enable it in browser site settings.');
          return;
        }
      } catch {
        // ignore if unsupported
      }
    }
    const next = {
      ...formData,
      privacySettings: {
        profileVisibility: formData.privacySettings?.profileVisibility || 'private',
        saveChatHistory: formData.privacySettings?.saveChatHistory !== false,
        notificationsEnabled: !currentlyOn,
      },
    };
    setFormData(next);
    onUpdateProfile(next);
  };

  const handleAddKnownSkill = () => {
    if (!newSkillName.trim()) return;
    if (formData.knownSkills.some((s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) return;
    setFormData({
      ...formData,
      knownSkills: [...formData.knownSkills, { name: newSkillName.trim(), level: newSkillLevel }],
    });
    setNewSkillName('');
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `makeyourmark-${(formData.name || 'student').toLowerCase().replace(/\s+/g, '-')}-profile.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!imported || typeof imported !== 'object' || !Array.isArray(imported.knownSkills)) {
          showNotice('error', 'Invalid profile backup JSON format.');
          return;
        }
        setFormData(imported);
        onUpdateProfile(imported);
        showNotice('success', 'Profile backup imported successfully.');
      } catch {
        showNotice('error', 'Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const executeConfirmedAction = async () => {
    setBusyAction(true);
    try {
      if (confirmAction === 'clear-chat') {
        localStorage.removeItem('mym_chat_history');
        showNotice('success', 'Saved AI conversation history cleared.');
      } else if (confirmAction === 'clear-all') {
        onClearAllData?.();
        showNotice('success', 'All local application data reset to defaults.');
      } else if (confirmAction === 'delete-account') {
        await onDeleteAccount?.();
        showNotice('success', 'Account and cloud/local records deleted.');
      }
    } catch (err: any) {
      showNotice('error', err?.message || 'Action failed.');
    } finally {
      setBusyAction(false);
      setConfirmAction(null);
    }
  };

  const notificationPermissionLabel =
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <User className="w-4 h-4" />
            <span>Profile, AI Models & Privacy Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Settings & Personalization
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Configure your student profile, active AI provider/model, appearance theme, hardware permissions, and account privacy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton variant="compact" />
        </div>
      </div>

      {statusBanner && (
        <div
          className={`rounded-2xl border p-3.5 text-xs flex items-center justify-between gap-2 ${
            statusBanner.type === 'error'
              ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200'
              : 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{statusBanner.text}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. PERSONAL & ACADEMIC DETAILS */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <GraduationCap className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Personal & Academic Details</h3>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt={formData.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                  {formData.name ? formData.name.charAt(0) : 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPermissionsModal(true)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-md transition"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Profile Photo & Mobile Permissions</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Capture a live headshot with your device camera or test microphone permissions.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60 text-[11px] font-semibold text-orange-700 dark:text-orange-300"
                >
                  <Camera className="w-3 h-3 text-orange-500" />
                  <span>Camera & Mic Tester</span>
                </button>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: undefined })}
                    className="text-[11px] text-zinc-500 hover:text-rose-500"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">City & Country</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">College / University</label>
              <input
                type="text"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Qualification / Degree
              </label>
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                placeholder={`e.g. ${selectedDeptMeta.suggestedDegrees.join(', ')}`}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Department Stream / Domain
              </label>
              <select
                value={activeCategory}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  const firstDept = ALL_DEPARTMENTS.find((d) => d.category === nextCat) || ALL_DEPARTMENTS[0];
                  setFormData({
                    ...formData,
                    departmentCategory: nextCat,
                    department: firstDept.name,
                  });
                }}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              >
                {DEPARTMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Specific Department / Course
              </label>
              <select
                value={
                  ALL_DEPARTMENTS.some((d) => d.name === formData.department) ? formData.department : 'custom'
                }
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setFormData({ ...formData, department: '' });
                  } else {
                    const meta = ALL_DEPARTMENTS.find((d) => d.name === e.target.value);
                    setFormData({
                      ...formData,
                      department: e.target.value,
                      departmentCategory: meta?.category || activeCategory,
                    });
                  }
                }}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              >
                {departmentsInCategory.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
                <option value="custom">Other / Custom Department...</option>
              </select>
              {!ALL_DEPARTMENTS.some((d) => d.name === formData.department) && (
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Enter your department or specialization"
                  className="mt-2 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Stage / Year</label>
              <select
                value={formData.yearOfStudy}
                onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value as any })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="Final Year">Final Year</option>
                <option value="Recent Graduate">Recent Graduate</option>
                <option value="Working Professional">Working Professional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Graduation Year</label>
              <input
                type="text"
                value={formData.graduationYear}
                onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Academic & Career Interests */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
              Academic &amp; Career Interests ({selectedDeptMeta.id.toUpperCase()} Suggestions)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(formData.interests || []).map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        interests: (formData.interests || []).filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedDeptMeta.interestTags
                .filter((t) => !(formData.interests || []).includes(t))
                .slice(0, 4)
                .map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        interests: [...(formData.interests || []), sug],
                      })
                    }
                    className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-600 dark:text-zinc-400 hover:border-orange-500 hover:text-orange-500 transition"
                  >
                    + {sug}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add custom interest (e.g. VLSI Testing, EV Battery, Cloud, Bio-Informatics)"
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const val = newInterest.trim();
                  if (!val || (formData.interests || []).includes(val)) return;
                  setFormData({ ...formData, interests: [...(formData.interests || []), val] });
                  setNewInterest('');
                }}
                className="rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* 2. SKILLS PROFILE */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <Code2 className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Skills Profile & Proficiency</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formData.knownSkills.map((ks, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs"
                >
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{ks.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                      {ks.level}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          knownSkills: formData.knownSkills.filter((_, idx) => idx !== i),
                        })
                      }
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Add known skill (e.g. Embedded C, MATLAB, SolidWorks, TypeScript)"
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value as any)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <button
                type="button"
                onClick={handleAddKnownSkill}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Skill</span>
              </button>
            </div>

            {/* Quick Department Skill Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Quick add for {selectedDeptMeta.id.toUpperCase()}:</span>
              {selectedDeptMeta.coreSkills
                .filter((s) => !formData.knownSkills.some((k) => k.name.toLowerCase() === s.toLowerCase()))
                .slice(0, 5)
                .map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        knownSkills: [...formData.knownSkills, { name: sug, level: 'Intermediate' }],
                      })
                    }
                    className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300 hover:border-orange-500 hover:text-orange-500 transition"
                  >
                    + {sug}
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                Currently Learning
              </span>
              <div className="flex flex-wrap gap-1.5">
                {formData.learningSkills.map((sk, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 text-xs text-sky-800 dark:text-sky-200"
                  >
                    <span>{sk}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          learningSkills: formData.learningSkills.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLearningSkill}
                  onChange={(e) => setNewLearningSkill(e.target.value)}
                  placeholder="Add learning skill..."
                  className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLearningSkill.trim()) return;
                    setFormData({
                      ...formData,
                      learningSkills: [...formData.learningSkills, newLearningSkill.trim()],
                    });
                    setNewLearningSkill('');
                  }}
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                Target Skills Next
              </span>
              <div className="flex flex-wrap gap-1.5">
                {formData.wantToLearnSkills.map((sk, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 text-xs text-amber-800 dark:text-amber-200"
                  >
                    <span>{sk}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          wantToLearnSkills: formData.wantToLearnSkills.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWantSkill}
                  onChange={(e) => setNewWantSkill(e.target.value)}
                  placeholder="Add target skill..."
                  className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newWantSkill.trim()) return;
                    setFormData({
                      ...formData,
                      wantToLearnSkills: [...formData.wantToLearnSkills, newWantSkill.trim()],
                    });
                    setNewWantSkill('');
                  }}
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CAREER GOALS & WEEKLY STUDY TARGET */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <Target className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Career Goals & Learning Targets</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Dream Job / Target Career
              </label>
              <input
                type="text"
                value={formData.careerGoals.dreamJob}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    careerGoals: { ...formData.careerGoals, dreamJob: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Weekly Study Target (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.currentActivities.weeklyTargetHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentActivities: {
                      ...formData.currentActivities,
                      weeklyTargetHours: Number(e.target.value) || 10,
                    },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Target Salary (₹ LPA)
              </label>
              <input
                type="text"
                value={formData.careerGoals.targetSalaryInr}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    careerGoals: { ...formData.careerGoals, targetSalaryInr: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Target Salary ($ USD)
              </label>
              <input
                type="text"
                value={formData.careerGoals.targetSalaryUsd}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    careerGoals: { ...formData.careerGoals, targetSalaryUsd: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Target Companies
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.careerGoals.targetCompanies.map((tc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 px-2.5 py-1 text-xs font-semibold border border-orange-200 dark:border-orange-800"
                  >
                    <span>{tc}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          careerGoals: {
                            ...formData.careerGoals,
                            targetCompanies: formData.careerGoals.targetCompanies.filter((_, i) => i !== idx),
                          },
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTargetCompany}
                  onChange={(e) => setNewTargetCompany(e.target.value)}
                  placeholder="Add target company..."
                  className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTargetCompany.trim()) return;
                    setFormData({
                      ...formData,
                      careerGoals: {
                        ...formData.careerGoals,
                        targetCompanies: [...formData.careerGoals.targetCompanies, newTargetCompany.trim()],
                      },
                    });
                    setNewTargetCompany('');
                  }}
                  className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Add Company
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. AI MODEL & PROVIDER INTEGRATION MANAGEMENT */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  AI Provider & Model Management
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Live server status — API credentials stay strictly server-side. Unconfigured providers are never faked.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadProviders}
              disabled={loadingProviders}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-orange-500"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingProviders ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(providers.length > 0
              ? providers
              : ([
                  {
                    id: 'gemini',
                    name: 'Google Gemini',
                    configured: false,
                    defaultModel: 'gemini-3.1-flash-lite',
                    models: [],
                    statusMessage: 'Checking server...',
                  },
                  {
                    id: 'openai',
                    name: 'OpenAI ChatGPT',
                    configured: false,
                    defaultModel: 'gpt-4o-mini',
                    models: [],
                    statusMessage: 'Checking server...',
                  },
                  {
                    id: 'anthropic',
                    name: 'Anthropic Claude',
                    configured: false,
                    defaultModel: 'claude-3-5-sonnet-latest',
                    models: [],
                    statusMessage: 'Checking server...',
                  },
                ] as AIProviderInfo[])
            ).map((prov) => {
              const selected = activeProviderId === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => handleSelectProvider(prov.id)}
                  className={`text-left rounded-2xl border p-4 space-y-2 transition ${
                    selected
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white">{prov.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        prov.configured
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {prov.configured ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{prov.statusMessage}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Active Model
              </label>
              <select
                value={formData.aiSettings?.model || activeProviderMeta?.defaultModel || 'gemini-3.1-flash-lite'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiSettings: {
                      provider: activeProviderId,
                      model: e.target.value,
                      responseStyle: formData.aiSettings?.responseStyle || 'balanced',
                      difficulty: formData.aiSettings?.difficulty || 'intermediate',
                      allowFallback: formData.aiSettings?.allowFallback !== false,
                    },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              >
                {(activeProviderMeta?.models || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
                {(!activeProviderMeta || activeProviderMeta.models.length === 0) && (
                  <option value={formData.aiSettings?.model || 'gemini-3.1-flash-lite'}>
                    {formData.aiSettings?.model || 'gemini-3.1-flash-lite'}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Response Style
              </label>
              <select
                value={formData.aiSettings?.responseStyle || 'balanced'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiSettings: {
                      provider: activeProviderId,
                      model: formData.aiSettings?.model || 'gemini-3.1-flash-lite',
                      responseStyle: e.target.value as any,
                      difficulty: formData.aiSettings?.difficulty || 'intermediate',
                      allowFallback: formData.aiSettings?.allowFallback !== false,
                    },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="concise">Concise (Fast)</option>
                <option value="balanced">Balanced (Default)</option>
                <option value="comprehensive">Comprehensive Deep-Dive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Default Teaching Level
              </label>
              <select
                value={formData.aiSettings?.difficulty || 'intermediate'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiSettings: {
                      provider: activeProviderId,
                      model: formData.aiSettings?.model || 'gemini-3.1-flash-lite',
                      responseStyle: formData.aiSettings?.responseStyle || 'balanced',
                      difficulty: e.target.value as any,
                      allowFallback: formData.aiSettings?.allowFallback !== false,
                    },
                  })
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.aiSettings?.allowFallback !== false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  aiSettings: {
                    provider: activeProviderId,
                    model: formData.aiSettings?.model || 'gemini-3.1-flash-lite',
                    responseStyle: formData.aiSettings?.responseStyle || 'balanced',
                    difficulty: formData.aiSettings?.difficulty || 'intermediate',
                    allowFallback: e.target.checked,
                  },
                })
              }
              className="rounded border-zinc-400 text-orange-600 focus:ring-orange-500"
            />
            <span>Automatically fall back to another configured AI provider if the selected provider is unconfigured or busy</span>
          </label>
        </div>

        {/* 5. APPEARANCE, LANGUAGE, CURRENCY & REMINDERS */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Appearance, 8+ Custom Themes, Language &amp; Reminders
            </h3>
            <button
              type="button"
              onClick={() => setCustomizerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Custom Colour Studio &amp; 3D Backdrop</span>
            </button>
          </div>

          {/* 8 Curated Theme Presets Quick Strip */}
          <div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
              Quick Theme Switcher (8 Curated Palettes):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const active = themeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setThemePreset(preset.id);
                      const mode: ThemePreference = preset.isDark ? 'dark' : 'light';
                      onChangeThemePreference?.(mode);
                      setFormData({
                        ...formData,
                        themePreference: mode,
                        theme: mode === 'light' ? 'light' : 'dark',
                        customThemeId: preset.id,
                        customThemeColors: preset.colors,
                      });
                    }}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      active
                        ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-400'
                    }`}
                    style={{ backgroundColor: preset.colors.surface, color: preset.colors.textPrimary }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: preset.colors.accent }}
                      />
                      <span className="text-xs font-bold truncate">{preset.name}</span>
                    </div>
                    <p className="text-[10px] opacity-75 truncate">{preset.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3-mode Quick Light/Dark/System Switcher */}
          <div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-2">
              System Light / Dark Mode Override:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'dark' as ThemePreference, label: 'Dark Mode', icon: Moon },
                { id: 'light' as ThemePreference, label: 'Light Mode', icon: Sun },
                { id: 'system' as ThemePreference, label: 'System Default', icon: Monitor },
              ].map((t) => {
                const Icon = t.icon;
                const active = themePreference === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChangeThemePreference?.(t.id);
                      setFormData({
                        ...formData,
                        themePreference: t.id,
                        theme: t.id === 'light' ? 'light' : 'dark',
                      });
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-semibold transition ${
                      active
                        ? 'border-orange-500 bg-orange-500/15 text-orange-700 dark:text-white shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-orange-500" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Salary Currency
              </label>
              <select
                value={formData.currencyPreference}
                onChange={(e) => setFormData({ ...formData, currencyPreference: e.target.value as any })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="both">Both (₹ LPA & $ USD)</option>
                <option value="inr">Rupees only (₹ LPA)</option>
                <option value="usd">USD only ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Learning Language (7 Languages)
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value as LearningLanguage })}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              >
                {LEARNING_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.nativeLabel} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                4GB RAM / Data Saver
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, dataSaverMode: !formData.dataSaverMode })}
                className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition ${
                  formData.dataSaverMode
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${formData.dataSaverMode ? 'fill-emerald-500' : ''}`} />
                <span>{formData.dataSaverMode ? 'Data Saver: ON' : 'Data Saver: OFF'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5 text-xs">
              <Bell className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  Study Reminder Notifications
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Browser permission: {notificationPermissionLabel}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition ${
                formData.privacySettings?.notificationsEnabled
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {formData.privacySettings?.notificationsEnabled ? 'Reminders Enabled' : 'Enable Reminders'}
            </button>
          </div>
        </div>

        {/* SAVE BAR */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>

      {/* 6. ACCOUNT, PRIVACY, CLOUD & DATA SECURITY */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Privacy, Security & Cloud Sync</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {session?.isAuthenticated && !session.isGuest
                  ? `Signed in via ${session.authProvider} (${session.email})`
                  : 'Guest mode (local browser storage active)'}{' '}
                • Workspace: {getWorkspaceAccessToken() ? 'Connected' : 'Not Connected'}
              </p>
            </div>
          </div>

          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Account & Google Workspace</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
            <span className="font-bold text-zinc-900 dark:text-white block">Profile Visibility</span>
            <select
              value={formData.privacySettings?.profileVisibility || 'private'}
              onChange={(e) => {
                const updated = {
                  ...formData,
                  privacySettings: {
                    profileVisibility: e.target.value as 'private' | 'mentors',
                    saveChatHistory: formData.privacySettings?.saveChatHistory !== false,
                    notificationsEnabled: Boolean(formData.privacySettings?.notificationsEnabled),
                  },
                };
                setFormData(updated);
                onUpdateProfile(updated);
              }}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white"
            >
              <option value="private">Private (Owner Only)</option>
              <option value="mentors">Shareable for Resume / Mentors</option>
            </select>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between gap-2">
            <div>
              <span className="font-bold text-zinc-900 dark:text-white block">Save Chat History</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Persist AI Chatbox conversations locally
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.privacySettings?.saveChatHistory !== false}
              onChange={(e) => {
                const updated = {
                  ...formData,
                  privacySettings: {
                    profileVisibility: formData.privacySettings?.profileVisibility || 'private',
                    saveChatHistory: e.target.checked,
                    notificationsEnabled: Boolean(formData.privacySettings?.notificationsEnabled),
                  },
                };
                setFormData(updated);
                onUpdateProfile(updated);
              }}
              className="h-4 w-4 rounded border-zinc-400 text-orange-600 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Mobile Device Permissions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                Mobile Microphone & Camera Permissions
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Test live audio levels and camera snapshots on mobile or desktop
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-2 text-xs font-bold text-white transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open Hardware Tester</span>
          </button>
        </div>

        {/* JSON Backup & Destructive Clear Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 transition"
          >
            <Download className="w-4 h-4 text-orange-500" />
            <span>Export Profile Backup (JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 transition cursor-pointer">
            <Upload className="w-4 h-4 text-amber-500" />
            <span>Import Profile Backup (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
        </div>

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmAction('clear-chat')}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-500 transition"
          >
            Clear Saved Chat History
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('clear-all')}
            className="rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition"
          >
            Clear All Local Data
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('delete-account')}
            className="rounded-xl bg-red-600 hover:bg-red-500 px-3.5 py-2 text-xs font-bold text-white transition"
          >
            Delete Account & Cloud Data
          </button>
        </div>
      </div>

      <DevicePermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        onAvatarCaptured={(capturedPhoto) => {
          const next = { ...formData, avatar: capturedPhoto };
          setFormData(next);
          onUpdateProfile(next);
          showNotice('success', 'Profile photo updated.');
        }}
      />

      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction === 'delete-account'
            ? 'Delete Account & All Data?'
            : confirmAction === 'clear-all'
            ? 'Reset All Local Data?'
            : 'Clear Saved AI Chat History?'
        }
        description={
          confirmAction === 'delete-account'
            ? 'This permanently deletes your cloud profile, notes, roadmaps, and resets local storage. This cannot be undone.'
            : confirmAction === 'clear-all'
            ? 'This erases your local notes, generated roadmaps, resume draft, chat history, and resets profile defaults.'
            : 'This removes your saved AI Chatbox conversation log from this browser.'
        }
        confirmLabel={
          confirmAction === 'delete-account'
            ? 'Delete Account'
            : confirmAction === 'clear-all'
            ? 'Clear Local Data'
            : 'Clear History'
        }
        danger={confirmAction !== 'clear-chat'}
        isLoading={busyAction}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
