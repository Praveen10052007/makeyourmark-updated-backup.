import React from 'react';
import { Home, Layers, Sparkles, Briefcase, User } from 'lucide-react';
import { ViewMode } from '../types';

interface Props {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
}

export const MobileNav: React.FC<Props> = ({ currentView, onNavigate }) => {
  const getIsActive = (tabId: string) => {
    if (tabId === 'home') return currentView === 'home' || currentView === 'tasks';
    if (tabId === 'learn') {
      return (
        currentView === 'learn' ||
        currentView === 'roadmap' ||
        currentView === 'skill-gap' ||
        currentView === 'notes' ||
        currentView === 'videos' ||
        currentView === 'research' ||
        currentView === 'apps'
      );
    }
    if (tabId === 'ai-assistant') {
      return (
        currentView === 'ai-assistant' ||
        currentView === 'voice' ||
        currentView === 'tutor' ||
        currentView === 'chat' ||
        currentView === 'interview' ||
        currentView === 'resume-analyzer' ||
        currentView === 'linkedin'
      );
    }
    if (tabId === 'jobs') {
      return currentView === 'jobs' || currentView === 'companies' || currentView === 'resume-builder';
    }
    if (tabId === 'profile') {
      return currentView === 'profile';
    }
    return false;
  };

  const tabs = [
    { id: 'home' as ViewMode, label: 'Home', icon: Home },
    { id: 'learn' as ViewMode, label: 'Learn', icon: Layers },
    { id: 'ai-assistant' as ViewMode, label: 'AI Assistant', icon: Sparkles },
    { id: 'jobs' as ViewMode, label: 'Jobs', icon: Briefcase },
    { id: 'profile' as ViewMode, label: 'Profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#141417]/95 backdrop-blur-lg px-2 py-1 safe-area-pb transition-colors shadow-lg print:hidden">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = getIsActive(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition ${
                isActive
                  ? 'text-orange-600 dark:text-amber-400 font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
