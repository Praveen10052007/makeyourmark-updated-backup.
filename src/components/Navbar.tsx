import React, { useState } from 'react';
import {
  Compass,
  GraduationCap,
  MessageSquare,
  Video,
  Globe,
  Smartphone,
  Mic,
  FileSearch,
  Briefcase,
  Building2,
  Map,
  User,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
  Flame,
  Radio,
  Layers,
  Wand2,
  Share2,
  LogIn,
  Target,
  NotebookPen,
} from 'lucide-react';
import { ViewMode, UserSession } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeQuickButton } from './ThemeCustomizer';

interface Props {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  serverOnline: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  session?: UserSession;
  onOpenAuthModal?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentView,
  onNavigate,
  theme,
  onToggleTheme,
  session,
  onOpenAuthModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopPrimaryNav = [
    { id: 'home' as ViewMode, label: 'Dashboard' },
    { id: 'skill-gap' as ViewMode, label: 'Skill Gap' },
    { id: 'roadmap' as ViewMode, label: 'Roadmap' },
    { id: 'notes' as ViewMode, label: 'AI Notes' },
    { id: 'learn' as ViewMode, label: 'Learn' },
    { id: 'ai-assistant' as ViewMode, label: 'AI Suite' },
    { id: 'jobs' as ViewMode, label: 'Jobs' },
    { id: 'resume-builder' as ViewMode, label: 'Resume' },
    { id: 'linkedin' as ViewMode, label: 'Workspace' },
  ];

  const fullDrawerSections = [
    {
      label: 'Learning & Career Path',
      items: [
        { id: 'home' as ViewMode, label: 'Dashboard Overview', icon: Compass },
        { id: 'skill-gap' as ViewMode, label: 'Goal & Skill Gap Analyzer', icon: Target },
        { id: 'roadmap' as ViewMode, label: 'Personalized Career Roadmap', icon: Map },
        { id: 'notes' as ViewMode, label: 'AI Notes & Study Material', icon: NotebookPen },
        { id: 'tasks' as ViewMode, label: 'Weekly Tasks & Streaks', icon: Flame },
        { id: 'learn' as ViewMode, label: 'Learning Tracks Hub', icon: Layers },
        { id: 'videos' as ViewMode, label: 'YouTube Learning Videos', icon: Video },
        { id: 'research' as ViewMode, label: 'Official Docs & Guides', icon: Globe },
        { id: 'apps' as ViewMode, label: 'Mobile Study Apps', icon: Smartphone },
      ],
    },
    {
      label: 'AI Learning & Interview Suite',
      items: [
        { id: 'ai-assistant' as ViewMode, label: 'AI Suite Hub', icon: Sparkles },
        { id: 'tutor' as ViewMode, label: 'AI Tutor (7 Languages)', icon: GraduationCap },
        { id: 'chat' as ViewMode, label: 'AI Chat Assistant', icon: MessageSquare },
        { id: 'voice' as ViewMode, label: 'AI Voice Assistant', icon: Radio },
        { id: 'interview' as ViewMode, label: 'AI Interview Trainer', icon: Mic },
        { id: 'resume-analyzer' as ViewMode, label: 'Resume Analyzer & JD Match', icon: FileSearch },
      ],
    },
    {
      label: 'Careers, Resume & Cloud',
      items: [
        { id: 'jobs' as ViewMode, label: 'Job Search (₹ & $)', icon: Briefcase },
        { id: 'companies' as ViewMode, label: 'Company Portals Directory', icon: Building2 },
        { id: 'resume-builder' as ViewMode, label: 'Resume Builder (6 Templates)', icon: Wand2 },
        { id: 'linkedin' as ViewMode, label: 'LinkedIn & Google Workspace', icon: Share2 },
        { id: 'profile' as ViewMode, label: 'Settings & AI Models', icon: User },
      ],
    },
  ];

  const handleNavClick = (view: ViewMode) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="mym-themed-header sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-md transition-colors print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white dark:bg-[#141417]">
              <Sparkles className="w-5 h-5 text-orange-600 dark:text-amber-400 transition" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                MakeYourMark
              </span>
              <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-amber-400 border border-orange-500/25">
                AI
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none">
              Career & Learning Platform
            </p>
          </div>
        </div>

        {/* Desktop Primary Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {desktopPrimaryNav.map((item) => {
            const isActive =
              currentView === item.id ||
              (item.id === 'learn' && ['videos', 'research', 'apps'].includes(currentView)) ||
              (item.id === 'ai-assistant' && ['tutor', 'chat', 'interview', 'resume-analyzer', 'voice'].includes(currentView)) ||
              (item.id === 'jobs' && currentView === 'companies');
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-700 dark:text-amber-400 border border-orange-500/25'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <PWAInstallButton variant="compact" />

          <ThemeQuickButton compact />

          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-orange-500/50 transition"
            title={`Switch to ${theme === 'dark' ? 'Warm Cream' : 'Sunset Dark'} Theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>

          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 transition"
            >
              {session?.isAuthenticated ? (
                <>
                  <div className="h-5 w-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {session.name ? session.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate">{session.name}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-orange-500" />
                  <span className="hidden sm:inline">Sign In</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle all modules menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition lg:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Full Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-zinc-200 dark:border-zinc-800 bg-white/98 dark:bg-[#141417]/98 backdrop-blur-xl px-4 py-5 shadow-2xl lg:hidden">
          <div className="space-y-6">
            {fullDrawerSections.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block px-2">
                  {section.label}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition ${
                          isActive
                            ? 'bg-orange-500/15 text-orange-600 dark:text-amber-400 border border-orange-500/25'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-zinc-500'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
