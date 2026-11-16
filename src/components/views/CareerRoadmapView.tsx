import React, { useState, useMemo } from 'react';
import {
  Map,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Sparkles,
  Calendar,
  BookOpen,
  Play,
  NotebookPen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Layers,
  Wrench,
} from 'lucide-react';
import { CAREER_CATEGORIES, CAREER_TRACKS } from '../../data/mockData';
import { findDepartmentMeta } from '../../data/departments';
import {
  UserProfile,
  CareerRoadmapPlan,
  RoadmapSkillStatus,
  StudyNote,
  ViewMode,
  DynamicRoadmapSkill,
} from '../../types';
import { generateDynamicCareerRoadmap } from '../../services/api';

interface Props {
  userProfile: UserProfile;
  generatedRoadmaps?: CareerRoadmapPlan[];
  onSaveRoadmap?: (plan: CareerRoadmapPlan) => void;
  onToggleNodeCompleted: (nodeId: string) => void;
  studyNotes?: StudyNote[];
  onAddNote?: (note: StudyNote) => void;
  onNavigate?: (view: ViewMode) => void;
}

export const CareerRoadmapView: React.FC<Props> = ({
  userProfile,
  generatedRoadmaps = [],
  onSaveRoadmap,
  onToggleNodeCompleted,
  studyNotes = [],
  onAddNote,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    userProfile.careerGoals?.careerCategory || CAREER_CATEGORIES[0].category
  );
  const [selectedRole, setSelectedRole] = useState<string>(
    userProfile.careerGoals?.dreamJob || 'Software Developer'
  );
  const [customCareer, setCustomCareer] = useState<string>('');
  const [dailyHours, setDailyHours] = useState<number>(2);
  const [targetMonths, setTargetMonths] = useState<number>(6);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeRoadmapId, setActiveRoadmapId] = useState<string>(generatedRoadmaps[0]?.id || '');
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [scheduleTab, setScheduleTab] = useState<'stages' | 'weekly' | 'monthly'>('stages');

  // Quick static blueprint state
  const [selectedStaticTrackId, setSelectedStaticTrackId] = useState<string>('track-frontend');
  const [noteToast, setNoteToast] = useState<string | null>(null);

  const currentCategoryRoles = useMemo(() => {
    return CAREER_CATEGORIES.find((c) => c.category === selectedCategory)?.roles || ['Custom Career Goal'];
  }, [selectedCategory]);

  const activeDynamicRoadmap = useMemo(() => {
    return generatedRoadmaps.find((r) => r.id === activeRoadmapId) || generatedRoadmaps[0] || null;
  }, [generatedRoadmaps, activeRoadmapId]);

  const dynamicProgress = useMemo(() => {
    if (!activeDynamicRoadmap) return { completed: 0, learning: 0, total: 0, percent: 0 };
    let total = 0;
    let completed = 0;
    let learning = 0;
    activeDynamicRoadmap.stages?.forEach((st) => {
      st.skills?.forEach((sk) => {
        total++;
        if (sk.status === 'completed') completed++;
        else if (sk.status === 'learning') learning++;
      });
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, learning, total, percent };
  }, [activeDynamicRoadmap]);

  const handleGenerateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    const goal =
      selectedCategory === 'Other / Custom Career' || selectedRole === 'Custom Career Goal'
        ? customCareer.trim() || selectedRole
        : selectedRole;

    if (!goal) {
      setError('Please enter or select a career goal.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const plan = await generateDynamicCareerRoadmap({
        careerGoal: goal,
        careerCategory: selectedCategory,
        currentSkills: userProfile.knownSkills.map((s) => `${s.name} (${s.level})`),
        experienceLevel: userProfile.yearOfStudy,
        dailyStudyHours: dailyHours,
        targetMonths,
        language: userProfile.preferredLanguage,
      });

      // Strictly enforce manual-only completion: never auto-mark completed
      const cleanPlan: CareerRoadmapPlan = {
        ...plan,
        stages: (plan.stages || []).map((st) => ({
          ...st,
          skills: (st.skills || []).map((sk) => ({
            ...sk,
            status: 'not-started' as RoadmapSkillStatus,
          })),
        })),
      };

      onSaveRoadmap?.(cleanPlan);
      setActiveRoadmapId(cleanPlan.id);
    } catch (err: any) {
      setError(err.message || 'Could not generate roadmap. Verify AI provider configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSkillStatus = (skillId: string, nextStatus: RoadmapSkillStatus) => {
    if (!activeDynamicRoadmap || !onSaveRoadmap) return;
    const updated: CareerRoadmapPlan = {
      ...activeDynamicRoadmap,
      stages: activeDynamicRoadmap.stages.map((st) => ({
        ...st,
        skills: st.skills.map((sk) => (sk.id === skillId ? { ...sk, status: nextStatus } : sk)),
      })),
      updatedAt: new Date().toISOString(),
    };
    onSaveRoadmap(updated);
  };

  const handleCreateNoteForSkill = (skill: DynamicRoadmapSkill) => {
    if (!onAddNote) return;
    const now = new Date().toISOString();
    const newNote: StudyNote = {
      id: `note_skill_${Date.now()}`,
      title: `${skill.name} — Study Notes`,
      content: `# ${skill.name}\n\n## What it means\n${skill.meaning}\n\n## Why required\n${skill.whyRequired}\n\n## Key topics to learn\n${skill.whatToLearn.map((t) => `- ${t}`).join('\n')}\n\n## Practical exercises\n${skill.practicalExercises.map((p) => `- ${p}`).join('\n')}\n\n## My Notes\n- `,
      category: 'Technical Skills',
      subject: activeDynamicRoadmap?.careerTitle || skill.name,
      linkedSkillId: skill.id,
      linkedSkillName: skill.name,
      isFavorite: false,
      aiGenerated: false,
      tags: ['Roadmap', skill.name],
      createdAt: now,
      updatedAt: now,
    };
    onAddNote(newNote);
    setNoteToast(`Created study note attached to "${skill.name}".`);
    setTimeout(() => setNoteToast(null), 4000);
  };

  const currentTrack = CAREER_TRACKS.find((t) => t.id === selectedStaticTrackId) || CAREER_TRACKS[0];
  const staticCompletedCount = currentTrack.nodes.filter((n) => userProfile.completedRoadmapNodes.includes(n.id)).length;
  const staticPercent = Math.round((staticCompletedCount / currentTrack.nodes.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Map className="w-4 h-4" />
            <span>Personalized AI Career Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            AI Career Roadmap Generator
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Generate structured learning stages across 12+ industries or custom careers. Track progress manually skill-by-skill.
          </p>
        </div>
      </div>

      {noteToast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span>{noteToast}</span>
          {onNavigate && (
            <button onClick={() => onNavigate('notes')} className="font-bold underline">
              Open AI Notes
            </button>
          )}
        </div>
      )}

      {/* Generator Form */}
      <form
        onSubmit={handleGenerateRoadmap}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Career Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setSelectedCategory(cat);
                const firstRole = CAREER_CATEGORIES.find((c) => c.category === cat)?.roles[0] || '';
                setSelectedRole(firstRole);
              }}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              {CAREER_CATEGORIES.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              {currentCategoryRoles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Custom Career Goal">Enter Custom Career...</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Study Hours / Day</label>
            <select
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              <option value={1}>1 hr / day</option>
              <option value={2}>2 hrs / day</option>
              <option value={3}>3 hrs / day</option>
              <option value={4}>4+ hrs / day</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target Timeline</label>
            <select
              value={targetMonths}
              onChange={(e) => setTargetMonths(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={9}>9 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>
        </div>

        {(selectedCategory === 'Other / Custom Career' || selectedRole === 'Custom Career Goal') && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Custom Career Goal</label>
            <input
              type="text"
              value={customCareer}
              onChange={(e) => setCustomCareer(e.target.value)}
              placeholder="e.g. VLSI Physical Design Engineer, EV Powertrain Lead, Bioprocess Specialist, Technical Product Manager..."
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
        )}

        {/* Quick Department Role Picks */}
        {(() => {
          const deptMeta = findDepartmentMeta(userProfile.department);
          return (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                Quick picks for {userProfile.department || deptMeta.name}:
              </span>
              {deptMeta.careerRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Other / Custom Career');
                    setSelectedRole('Custom Career Goal');
                    setCustomCareer(role);
                  }}
                  className={`rounded-lg border px-2 py-0.5 transition ${
                    customCareer === role || selectedRole === role
                      ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-amber-400 font-bold'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-orange-400'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          );
        })()}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Skills remain <strong className="text-zinc-700 dark:text-zinc-200">Not Started</strong> until you manually mark them Learning or Completed.
          </p>
          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:opacity-95 transition disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating Personalized Roadmap...' : 'Generate AI Roadmap'}
          </button>
        </div>
      </form>

      {/* Saved Generated Roadmaps Switcher */}
      {generatedRoadmaps.length > 0 && (
        <div className="space-y-4">
          {generatedRoadmaps.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {generatedRoadmaps.map((rm) => (
                <button
                  key={rm.id}
                  onClick={() => setActiveRoadmapId(rm.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    activeDynamicRoadmap?.id === rm.id
                      ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-amber-400'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {rm.careerTitle}
                </button>
              ))}
            </div>
          )}

          {activeDynamicRoadmap && (
            <div className="space-y-5">
              {/* Summary & Progress Header */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-amber-400">
                      {activeDynamicRoadmap.careerCategory} • Est. {activeDynamicRoadmap.estimatedMonths} Months
                    </span>
                    <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
                      {activeDynamicRoadmap.careerTitle}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{activeDynamicRoadmap.summary}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-2xl font-black text-orange-600 dark:text-amber-400">{dynamicProgress.percent}%</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {dynamicProgress.completed} completed • {dynamicProgress.learning} learning • {dynamicProgress.total} skills
                    </div>
                  </div>
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-900 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-orange-600 to-amber-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${dynamicProgress.percent}%` }}
                  />
                </div>

                {activeDynamicRoadmap.disclaimer && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">{activeDynamicRoadmap.disclaimer}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { id: 'stages', label: `Stages & Skills (${activeDynamicRoadmap.stages?.length || 0})`, icon: Layers },
                    { id: 'weekly', label: 'Weekly Schedule', icon: Calendar },
                    { id: 'monthly', label: 'Monthly Milestones', icon: Clock },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setScheduleTab(tab.id as any)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                          scheduleTab === tab.id
                            ? 'bg-orange-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stages View */}
              {scheduleTab === 'stages' && (
                <div className="space-y-5">
                  {activeDynamicRoadmap.stages?.map((stage) => (
                    <div
                      key={stage.id}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 space-y-4 shadow-sm"
                    >
                      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-amber-400">
                          Stage {stage.stageNumber}
                        </span>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{stage.title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{stage.description}</p>
                      </div>

                      <div className="space-y-3">
                        {stage.skills?.map((skill) => {
                          const isExpanded = Boolean(expandedSkills[skill.id]);
                          const attachedCount = studyNotes.filter((n) => n.linkedSkillId === skill.id).length;

                          return (
                            <div
                              key={skill.id}
                              className={`rounded-xl border p-4 transition ${
                                skill.status === 'completed'
                                  ? 'border-emerald-500/40 bg-emerald-500/5'
                                  : skill.status === 'learning'
                                  ? 'border-amber-500/40 bg-amber-500/5'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{skill.name}</h4>
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {skill.estimatedTimeLabel}
                                    </span>
                                    {attachedCount > 0 && (
                                      <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-amber-400">
                                        {attachedCount} Note{attachedCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{skill.meaning}</p>
                                </div>

                                {/* Manual-only Status Selector */}
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  {(['not-started', 'learning', 'completed'] as RoadmapSkillStatus[]).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => handleUpdateSkillStatus(skill.id, st)}
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                                        skill.status === st
                                          ? st === 'completed'
                                            ? 'bg-emerald-600 text-white border-emerald-500'
                                            : st === 'learning'
                                            ? 'bg-amber-600 text-white border-amber-500'
                                            : 'bg-zinc-700 text-white border-zinc-600'
                                          : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-500'
                                      }`}
                                    >
                                      {st === 'not-started' ? 'Not Started' : st === 'learning' ? 'Learning' : 'Completed'}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedSkills((prev) => ({ ...prev, [skill.id]: !prev[skill.id] }))
                                    }
                                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    aria-label="Toggle skill details"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
                                  <div>
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Why Required: </span>
                                    <span className="text-zinc-600 dark:text-zinc-400">{skill.whyRequired}</span>
                                  </div>

                                  {skill.whatToLearn?.length > 0 && (
                                    <div>
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mb-1">
                                        <BookOpen className="w-3.5 h-3.5 text-orange-500" /> Syllabus Topics
                                      </span>
                                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-zinc-600 dark:text-zinc-400">
                                        {skill.whatToLearn.map((topic, idx) => (
                                          <li key={idx}>• {topic}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {skill.practicalExercises?.length > 0 && (
                                    <div>
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mb-1">
                                        <Wrench className="w-3.5 h-3.5 text-amber-500" /> Practical Exercises
                                      </span>
                                      <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                                        {skill.practicalExercises.map((ex, idx) => (
                                          <li key={idx}>• {ex}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {skill.resources?.map((r, idx) => (
                                      <a
                                        key={idx}
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:text-amber-400 hover:border-orange-500"
                                      >
                                        <span>{r.name} ({r.type})</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                    {skill.youtubeTopics?.map((yt, idx) => (
                                      <a
                                        key={`yt-${idx}`}
                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(yt)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20"
                                      >
                                        <Play className="w-3 h-3" /> YouTube: {yt}
                                      </a>
                                    ))}
                                    {onAddNote && (
                                      <button
                                        type="button"
                                        onClick={() => handleCreateNoteForSkill(skill)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-500"
                                      >
                                        <NotebookPen className="w-3 h-3" /> Create Note for Skill
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Weekly Schedule View */}
              {scheduleTab === 'weekly' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeDynamicRoadmap.weeklySchedule?.map((slot, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">{slot.day}</span>
                        <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-600 dark:text-amber-400">
                          {slot.hours}h
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{slot.focus}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{slot.activity}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Monthly Milestones View */}
              {scheduleTab === 'monthly' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeDynamicRoadmap.monthlyPlan?.map((m) => (
                    <div
                      key={m.month}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 space-y-2"
                    >
                      <span className="text-[11px] font-bold uppercase text-orange-600 dark:text-amber-400">
                        Month {m.month}
                      </span>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white">{m.theme}</h4>
                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {m.goals?.map((g, i) => (
                          <li key={i}>• {g}</li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                        <strong className="text-zinc-800 dark:text-zinc-200">Milestone Project: </strong>
                        <span className="text-zinc-600 dark:text-zinc-400">{m.milestoneProject}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Curated Quick Blueprints */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Curated Quick-Start Tracks</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Instant offline blueprints for popular software engineering paths.</p>
          </div>
          <span className="text-xs font-bold text-orange-600 dark:text-amber-400">{staticPercent}% Completed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CAREER_TRACKS.map((track) => {
            const isSelected = track.id === selectedStaticTrackId;
            return (
              <button
                key={track.id}
                onClick={() => setSelectedStaticTrackId(track.id)}
                className={`rounded-2xl p-4 text-left border transition ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-amber-400">
                  {track.difficulty}
                </span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-1">{track.title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{track.avgSalaryCombined}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {currentTrack.nodes.map((node, index) => {
            const isDone = userProfile.completedRoadmapNodes.includes(node.id);
            return (
              <div
                key={node.id}
                className={`flex items-start gap-4 rounded-2xl border p-4 transition ${
                  isDone
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b]'
                }`}
              >
                <button
                  onClick={() => onToggleNodeCompleted(node.id)}
                  aria-label={`Toggle milestone ${node.title}`}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:border-orange-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-bold ${isDone ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                      Step {index + 1}: {node.title}
                    </h4>
                    <span className="text-xs text-zinc-500">Est. {node.duration}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{node.description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {node.resources.map((r, i) => (
                      <a
                        key={i}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-amber-400 hover:underline"
                      >
                        {r.name} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
