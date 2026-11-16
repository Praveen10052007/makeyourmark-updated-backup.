import React, { useState, useEffect } from 'react';
import { Sparkles, GraduationCap, MessageSquare, Mic, FileSearch, Share2, Radio } from 'lucide-react';
import { UserProfile, StudyNote } from '../../types';
import { fetchAIProviders } from '../../services/api';
import { AITutorView } from './AITutorView';
import { AIChatbotView } from './AIChatbotView';
import { AIInterviewerView } from './AIInterviewerView';
import { ResumeAnalyzerView } from './ResumeAnalyzerView';
import { LinkedInView } from './LinkedInView';
import { VoiceAssistantView } from './VoiceAssistantView';

interface Props {
  userProfile: UserProfile;
  onRecordInterviewScore: (score: number) => void;
  onAddNote?: (note: StudyNote) => void;
  initialTab?: 'voice' | 'tutor' | 'chat' | 'interview' | 'resume-analyzer' | 'linkedin';
}

export const AIAssistantView: React.FC<Props> = ({
  userProfile,
  onRecordInterviewScore,
  onAddNote,
  initialTab = 'tutor',
}) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'tutor' | 'chat' | 'interview' | 'resume-analyzer' | 'linkedin'>(
    initialTab
  );
  const [providerLabel, setProviderLabel] = useState<string>(
    userProfile.aiSettings?.model || 'Configured AI Provider'
  );

  useEffect(() => {
    fetchAIProviders()
      .then((res) => {
        const activeId = userProfile.aiSettings?.provider || res.defaultProvider;
        const found = res.providers.find((p) => p.id === activeId);
        if (found) {
          setProviderLabel(
            `${found.name} (${userProfile.aiSettings?.model || found.defaultModel})${found.configured ? '' : ' • Setup Required'}`
          );
        }
      })
      .catch(() => {});
  }, [userProfile.aiSettings?.provider, userProfile.aiSettings?.model]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AI Career & Learning Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            AI Learning, Interview & Career Suite
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Active Engine: <strong className="text-zinc-800 dark:text-zinc-200">{providerLabel}</strong> • English & தமிழ்
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-1 text-xs font-bold gap-1">
          {[
            { id: 'tutor', label: 'AI Tutor', icon: GraduationCap },
            { id: 'chat', label: 'AI Chat', icon: MessageSquare },
            { id: 'voice', label: 'Voice', icon: Radio },
            { id: 'interview', label: 'Interviewer', icon: Mic },
            { id: 'resume-analyzer', label: 'ATS Scanner', icon: FileSearch },
            { id: 'linkedin', label: 'Workspace', icon: Share2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  active
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'voice' && <VoiceAssistantView userProfile={userProfile} onAddNote={onAddNote} />}
      {activeTab === 'tutor' && <AITutorView userProfile={userProfile} onAddNote={onAddNote} />}
      {activeTab === 'chat' && <AIChatbotView userProfile={userProfile} onAddNote={onAddNote} />}
      {activeTab === 'interview' && <AIInterviewerView userProfile={userProfile} onScoreRecorded={onRecordInterviewScore} />}
      {activeTab === 'resume-analyzer' && <ResumeAnalyzerView />}
      {activeTab === 'linkedin' && <LinkedInView userProfile={userProfile} />}
    </div>
  );
};
