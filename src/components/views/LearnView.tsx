import React, { useState } from 'react';
import { Layers, Map, Video, Globe, Smartphone, NotebookPen } from 'lucide-react';
import { UserProfile, StudyNote, CareerRoadmapPlan, UserSession, ViewMode } from '../../types';
import { CareerRoadmapView } from './CareerRoadmapView';
import { AINotesView } from './AINotesView';
import { VideoSearchView } from './VideoSearchView';
import { WebsiteResearchView } from './WebsiteResearchView';
import { AppResearchView } from './AppResearchView';

interface Props {
  userProfile: UserProfile;
  studyNotes?: StudyNote[];
  generatedRoadmaps?: CareerRoadmapPlan[];
  onAddNote?: (note: StudyNote) => void;
  onUpdateNote?: (note: StudyNote) => void;
  onDeleteNote?: (id: string) => void;
  onSaveRoadmap?: (plan: CareerRoadmapPlan) => void;
  onToggleNodeCompleted: (nodeId: string) => void;
  onToggleBookmarkVideo?: (videoId: string) => void;
  onNavigate?: (view: ViewMode) => void;
  session?: UserSession;
  onOpenAuthModal?: () => void;
  initialTab?: 'roadmap' | 'notes' | 'videos' | 'research' | 'apps';
}

export const LearnView: React.FC<Props> = ({
  userProfile,
  studyNotes = [],
  generatedRoadmaps = [],
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onSaveRoadmap,
  onToggleNodeCompleted,
  onToggleBookmarkVideo,
  onNavigate,
  session,
  onOpenAuthModal,
  initialTab = 'roadmap',
}) => {
  const [activeTab, setActiveTab] = useState<'roadmap' | 'notes' | 'videos' | 'research' | 'apps'>(initialTab);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Learn Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Learning Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Career Roadmaps, Notes & Resources
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Personalized multi-stage roadmaps, AI study notes, YouTube video courses, official docs, and curated tools.
          </p>
        </div>

        <div className="flex flex-wrap rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-1 text-xs font-bold gap-1">
          {[
            { id: 'roadmap', label: 'Roadmaps', icon: Map },
            { id: 'notes', label: 'AI Notes', icon: NotebookPen },
            { id: 'videos', label: 'Videos', icon: Video },
            { id: 'research', label: 'Docs', icon: Globe },
            { id: 'apps', label: 'Apps', icon: Smartphone },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  active
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'roadmap' && (
        <CareerRoadmapView
          userProfile={userProfile}
          generatedRoadmaps={generatedRoadmaps}
          onSaveRoadmap={onSaveRoadmap}
          onToggleNodeCompleted={onToggleNodeCompleted}
          studyNotes={studyNotes}
          onAddNote={onAddNote}
          onNavigate={onNavigate}
        />
      )}
      {activeTab === 'notes' && (
        <AINotesView
          notes={studyNotes}
          onAddNote={onAddNote || (() => {})}
          onUpdateNote={onUpdateNote || (() => {})}
          onDeleteNote={onDeleteNote || (() => {})}
          roadmaps={generatedRoadmaps}
          preferredLanguage={userProfile.preferredLanguage}
          session={session}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}
      {activeTab === 'videos' && (
        <VideoSearchView
          bookmarkedVideos={userProfile.bookmarkedVideos}
          onToggleBookmark={onToggleBookmarkVideo}
          generatedRoadmaps={generatedRoadmaps}
        />
      )}
      {activeTab === 'research' && <WebsiteResearchView />}
      {activeTab === 'apps' && <AppResearchView />}
    </div>
  );
};
