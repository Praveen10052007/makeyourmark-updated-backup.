import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Briefcase,
  Clock,
  Code2,
  Bookmark,
  Wand2,
  Mic,
  ArrowRight,
  Layers,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Target,
  Compass,
  Flame,
  Radio,
  MessageSquare,
  FileText,
  Cloud,
} from 'lucide-react';
import { ViewMode, UserProfile, KnownSkill } from '../../types';
import { JOB_LISTINGS } from '../../data/mockData';
import { generatePersonalizedRoadmap, PersonalizedRoadmapResponse } from '../../services/api';

interface Props {
  onNavigate: (view: ViewMode) => void;
  userProfile: UserProfile;
  notesCount?: number;
  onToggleSaveJob?: (jobId: string) => void;
}

export const HomeView: React.FC<Props> = ({
  onNavigate,
  userProfile,
  notesCount = 0,
  onToggleSaveJob,
}) => {
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [aiRoadmap, setAiRoadmap] = useState<PersonalizedRoadmapResponse | null>(null);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  const recommendedJobs = JOB_LISTINGS.slice(0, 3);
  const currentStreak = userProfile.streakData?.currentStreak || 0;
  const longestStreak = userProfile.streakData?.longestStreak || 0;

  const handleGenerateAiRoadmap = async () => {
    setGeneratingRoadmap(true);
    setRoadmapError(null);
    try {
      const res = await generatePersonalizedRoadmap({
        targetRole: userProfile.careerGoals.dreamJob || 'Software Development Engineer',
        currentSkills: userProfile.knownSkills.map((s) => s.name),
        learningSkills: userProfile.learningSkills,
        degree: `${userProfile.degree} (${userProfile.yearOfStudy})`,
        targetCompanies: userProfile.careerGoals.targetCompanies,
      });
      setAiRoadmap(res);
    } catch (err: any) {
      setRoadmapError(err?.message || 'Failed to generate personalized roadmap.');
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const getLevelColor = (level: KnownSkill['level']) => {
    switch (level) {
      case 'Advanced':
        return {
          bar: 'bg-emerald-500',
          width: 'w-full',
          percent: '100%',
          badge:
            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'Intermediate':
        return {
          bar: 'bg-orange-500',
          width: 'w-2/3',
          percent: '66%',
          badge:
            'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        };
      case 'Beginner':
      default:
        return {
          bar: 'bg-amber-500',
          width: 'w-1/3',
          percent: '33%',
          badge:
            'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. PERSONAL IDENTITY & WELCOME HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-[#18181b] to-orange-950/60 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Career, Learning & Professional Platform</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                Welcome, {userProfile.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-300 font-medium">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  {userProfile.college}
                </span>
                <span>•</span>
                <span>{userProfile.degree}</span>
                <span>•</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white border border-white/15">
                  {userProfile.yearOfStudy} ({userProfile.graduationYear})
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Target Role: <strong className="text-white">{userProfile.careerGoals.dreamJob}</strong> •{' '}
              <span className="text-amber-300 font-semibold">{userProfile.careerGoals.targetSalaryInr}</span> (
              {userProfile.careerGoals.targetSalaryUsd})
            </p>
          </div>

          {/* Quick Hub Access Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigate('roadmap')}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg hover:from-orange-500 hover:to-amber-400 transition active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>Career Roadmap</span>
            </button>
            <button
              onClick={() => onNavigate('skill-gap')}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition active:scale-95"
            >
              <Target className="w-4 h-4 text-amber-300" />
              <span>Skill Gap Analyzer</span>
            </button>
            <button
              onClick={() => onNavigate('tutor')}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 text-xs font-semibold text-white transition"
            >
              <GraduationCap className="w-3.5 h-3.5 text-orange-300" />
              <span>AI Learning Assistant</span>
            </button>
            <button
              onClick={() => onNavigate('tasks')}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 text-xs font-semibold text-white transition"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Streak ({currentStreak} Days)</span>
            </button>
          </div>
        </div>

        {/* Live Quick Counters (Real metrics only) */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-zinc-400 block text-[11px]">Known Skills</span>
            <span className="text-lg font-black text-white">{userProfile.knownSkills.length} Added</span>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-zinc-400 block text-[11px]">AI Study Notes</span>
            <span className="text-lg font-black text-amber-300">{notesCount} Saved</span>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-zinc-400 block text-[11px]">Study Streak</span>
            <span className="text-lg font-black text-orange-400">{currentStreak} Days</span>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <span className="text-zinc-400 block text-[11px]">Saved Opportunities</span>
            <span className="text-lg font-black text-emerald-300">{userProfile.savedJobs.length} Jobs</span>
          </div>
        </div>
      </section>

      {/* 2. DAILY STREAK & WEEKLY GOALS SPRINT WIDGET */}
      <section className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-[#18181b] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md">
              <Flame className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                  Daily Habit Streak & Weekly Sprint
                </h2>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {currentStreak}-Day Streak
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Weekly Target: {userProfile.currentActivities.weeklyTargetHours} hours • Best Record: {longestStreak} days
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('tasks')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition self-start sm:self-center"
          >
            <span>Open Weekly Planner</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(userProfile.weeklyTasks || []).length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(userProfile.weeklyTasks || []).slice(0, 3).map((task) => (
              <div
                key={task.id}
                onClick={() => onNavigate('tasks')}
                className={`rounded-2xl border p-3.5 cursor-pointer transition ${
                  task.completed
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  <span className="text-orange-600 dark:text-orange-400 font-bold">{task.dayOfWeek}</span>
                  <span className="rounded bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px]">
                    {task.category}
                  </span>
                </div>
                <p
                  className={`text-xs font-bold ${
                    task.completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'
                  }`}
                >
                  {task.title}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{task.estimatedMinutes} mins</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {task.completed ? '✓ Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>No weekly tasks added yet. Schedule your study week or generate an AI 7-Day Sprint.</span>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-orange-600 dark:text-orange-400 font-bold hover:underline self-start sm:self-auto"
            >
              Add First Task →
            </button>
          </div>
        )}
      </section>

      {/* 3. CURRENT ACTIVITIES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Current Focus & Learning</h2>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
          >
            <span>Edit Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Current Study Track</span>
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">
              {userProfile.currentActivities.currentCourse}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Weekly target: <strong>{userProfile.currentActivities.weeklyTargetHours} hours / week</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Code2 className="w-4 h-4" />
              <span>Active Project</span>
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">
              {userProfile.currentActivities.currentProject}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Practicing: <strong>{userProfile.currentActivities.skillsPracticing}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>Career Search Status</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {userProfile.currentActivities.internshipSearchStatus}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Goal: {userProfile.currentActivities.currentLearningGoals}
            </p>
          </div>
        </div>
      </section>

      {/* 4. SKILLS PROFILE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Skills Profile</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Your self-reported proficiency breakdown.</p>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            Manage Skills
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {userProfile.knownSkills.map((skill, idx) => {
            const config = getLevelColor(skill.level);
            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-900 dark:text-white">{skill.name}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${config.badge}`}>
                    {skill.level}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className={`h-full rounded-full ${config.bar} ${config.width}`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Proficiency</span>
                    <span>{config.percent}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. CAREER TRAJECTORY & QUICK AI ROADMAP PREVIEW */}
      <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Career Trajectory & Goals</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-1">
              Target: {userProfile.careerGoals.dreamJob}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Target Companies:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {userProfile.careerGoals.targetCompanies.join(', ')}
              </strong>{' '}
              • Workplace:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">{userProfile.careerGoals.workplacePreference}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('roadmap')}
              className="flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2.5 text-xs font-bold text-orange-700 dark:text-orange-300 transition"
            >
              <Layers className="w-4 h-4" />
              <span>Open Full Roadmap Builder</span>
            </button>
            <button
              onClick={handleGenerateAiRoadmap}
              disabled={generatingRoadmap}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`w-4 h-4 ${generatingRoadmap ? 'animate-spin' : ''}`} />
              <span>{generatingRoadmap ? 'Crafting Preview...' : 'Quick AI Milestone Preview'}</span>
            </button>
          </div>
        </div>

        {roadmapError && (
          <div className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-700 dark:text-rose-300">
            {roadmapError}
          </div>
        )}

        {aiRoadmap ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4">
              <span className="text-xs font-bold text-orange-700 dark:text-orange-300">AI Trajectory Preview</span>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                {aiRoadmap.summary} (Estimated: <strong>{aiRoadmap.estimatedMonths} Months</strong>)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiRoadmap.milestones.map((ms) => (
                <div
                  key={ms.step}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-white font-bold text-xs">
                      {ms.step}
                    </span>
                    <span className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {ms.timeframe}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{ms.title}</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      {ms.recommendedAction}
                    </p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">Project Idea:</span>
                    <span className="font-mono text-[11px] text-orange-600 dark:text-orange-400 block bg-orange-50 dark:bg-orange-950/40 p-2 rounded-lg">
                      {ms.projectToBuild}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">Short-Term Goal:</span>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {userProfile.careerGoals.shortTermGoals}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">Long-Term Vision:</span>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {userProfile.careerGoals.longTermGoals}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 6. RECOMMENDED CAREER PORTALS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Briefcase className="w-4 h-4" />
              <span>Curated Official Career Portals</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mt-0.5">
              Featured Job & Internship Portals
            </h2>
          </div>

          <button
            onClick={() => onNavigate('jobs')}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline self-start sm:self-auto"
          >
            <span>Explore All ({JOB_LISTINGS.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedJobs.map((job) => {
            const isSaved = userProfile.savedJobs.includes(job.id);
            return (
              <div
                key={job.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm flex flex-col justify-between hover:border-orange-500/60 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {job.company}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">{job.title}</h3>
                    </div>
                    <span className="rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300 shrink-0">
                      {job.type}
                    </span>
                  </div>

                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-2.5 border border-zinc-200 dark:border-zinc-800 text-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">
                      Estimated Benchmark:
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block">
                      {job.packageCombined}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-500">{job.location}</span>

                  <div className="flex items-center gap-1.5">
                    {onToggleSaveJob && (
                      <button
                        onClick={() => onToggleSaveJob(job.id)}
                        className={`p-1.5 rounded-lg border transition ${
                          isSaved
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-600'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white'
                        }`}
                        title={isSaved ? 'Remove Bookmark' : 'Save Job'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-orange-500' : ''}`} />
                      </button>
                    )}
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                    >
                      <span>Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. QUICK PLATFORM LAUNCHERS */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">All Platform Modules</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Jump directly into any learning, resume, or career preparation workspace.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { id: 'skill-gap' as ViewMode, name: 'Skill Gap', icon: Target, color: 'text-orange-500' },
            { id: 'roadmap' as ViewMode, name: 'Roadmaps', icon: Compass, color: 'text-amber-500' },
            { id: 'tutor' as ViewMode, name: 'AI Tutor', icon: GraduationCap, color: 'text-orange-400' },
            { id: 'notes' as ViewMode, name: 'AI Notes', icon: FileText, color: 'text-amber-400' },
            { id: 'chat' as ViewMode, name: 'AI Chat', icon: MessageSquare, color: 'text-sky-500' },
            { id: 'voice' as ViewMode, name: 'Voice AI', icon: Radio, color: 'text-rose-500' },
            { id: 'interview' as ViewMode, name: 'Interview', icon: Mic, color: 'text-purple-500' },
            { id: 'resume-builder' as ViewMode, name: 'Resume', icon: Wand2, color: 'text-emerald-500' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="group flex flex-col items-center justify-center p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] hover:border-orange-500 hover:shadow-md transition text-center space-y-2 active:scale-95"
              >
                <div className={`p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 ${item.color}`}>
                  <Icon className="w-4 h-4 group-hover:scale-110 transition" />
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-[#18181b] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
            <Cloud className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Need Google Docs export, Drive file management, or LinkedIn outreach drafting?</span>
          </div>
          <button
            onClick={() => onNavigate('linkedin')}
            className="text-orange-600 dark:text-orange-400 font-bold hover:underline self-start sm:self-auto"
          >
            Open Workspace & LinkedIn Hub →
          </button>
        </div>
      </section>
    </div>
  );
};
