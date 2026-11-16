import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  Filter,
  Check,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import { UserProfile, WeeklyTask, StreakData, DayOfWeek } from '../../types';
import { generateAIWeeklySprint } from '../../services/api';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const CATEGORIES: WeeklyTask['category'][] = [
  'Coding & DSA',
  'Academic & Department',
  'Study Schedule',
  'Interview Prep',
  'Resume & LinkedIn',
  'Projects',
  'Core CS & System Design',
];

const BADGE_DEFINITIONS = [
  { id: 'first-step', label: 'First Step', desc: 'Complete your first study task', check: (s: StreakData) => s.totalTasksCompleted >= 1 },
  { id: 'streak-3', label: '3-Day Consistency', desc: 'Reach a 3-day study streak', check: (s: StreakData) => s.longestStreak >= 3 },
  { id: 'streak-7', label: '7-Day Focus', desc: 'Reach a 7-day study streak', check: (s: StreakData) => s.longestStreak >= 7 },
  { id: 'finisher-5', label: 'Task Finisher', desc: 'Complete 5+ study tasks', check: (s: StreakData) => s.totalTasksCompleted >= 5 },
  { id: 'points-100', label: '100 Learning Pts', desc: 'Earn 100+ non-monetary milestone points', check: (s: StreakData) => (s.rewardPoints || 0) >= 100 },
];

const EMPTY_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCheckInDate: '',
  activeDaysThisWeek: [],
  totalTasksCompleted: 0,
  freezeAvailable: true,
  checkInHistory: [],
  rewardPoints: 0,
  badges: [],
  rewardedTaskIds: [],
  rewardedCheckInDates: [],
};

export const WeeklyTasksStreakView: React.FC<Props> = ({ userProfile, onUpdateProfile }) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<WeeklyTask['category'] | 'All'>('All');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [generatingAiSprint, setGeneratingAiSprint] = useState(false);
  const [sprintNotice, setSprintNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  // Task form state (used for both Add & Edit)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDay, setTaskDay] = useState<DayOfWeek>('Monday');
  const [taskCategory, setTaskCategory] = useState<WeeklyTask['category']>('Coding & DSA');
  const [taskPriority, setTaskPriority] = useState<WeeklyTask['priority']>('High');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  const tasks: WeeklyTask[] = userProfile.weeklyTasks || [];
  const streak: StreakData = userProfile.streakData || EMPTY_STREAK;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const isCheckedInToday = streak.lastCheckInDate === todayStr;

  const dayIndex = new Date().getDay();
  const todayDayName: DayOfWeek = dayIndex === 0 ? 'Sunday' : DAYS_OF_WEEK[dayIndex - 1] || 'Monday';

  const computeUnlockedBadges = (s: StreakData): string[] => {
    const existing = new Set(s.badges || []);
    for (const b of BADGE_DEFINITIONS) {
      if (b.check(s)) existing.add(b.label);
    }
    return Array.from(existing);
  };

  const computeNextStreakOnActivity = (
    base: StreakData,
    incrementTasksBy = 0,
    rewardedTaskId?: string,
    isDailyCheckIn = false
  ): StreakData => {
    const nextTotal = Math.max(0, base.totalTasksCompleted + incrementTasksBy);
    const rewardedTasks = new Set(base.rewardedTaskIds || []);
    const rewardedDates = new Set(base.rewardedCheckInDates || []);
    let nextPoints = Number(base.rewardPoints || 0);

    // Duplicate-reward prevention: award task points at most once per unique task ID
    if (rewardedTaskId && !rewardedTasks.has(rewardedTaskId)) {
      rewardedTasks.add(rewardedTaskId);
      nextPoints += 15;
    }
    // Award daily check-in points at most once per calendar date
    if (isDailyCheckIn && !rewardedDates.has(todayStr)) {
      rewardedDates.add(todayStr);
      nextPoints += 20;
    }

    if (base.lastCheckInDate === todayStr) {
      const updated: StreakData = {
        ...base,
        totalTasksCompleted: nextTotal,
        rewardPoints: nextPoints,
        rewardedTaskIds: Array.from(rewardedTasks),
        rewardedCheckInDates: Array.from(rewardedDates),
        activeDaysThisWeek: base.activeDaysThisWeek.includes(todayDayName)
          ? base.activeDaysThisWeek
          : [...base.activeDaysThisWeek, todayDayName],
      };
      return { ...updated, badges: computeUnlockedBadges(updated) };
    }

    // Genuine streak continuation: continues if last check-in was yesterday (or 0 -> 1)
    const continued = base.lastCheckInDate === yesterdayStr;
    const nextCurrent = continued ? base.currentStreak + 1 : 1;
    const updated: StreakData = {
      ...base,
      currentStreak: nextCurrent,
      longestStreak: Math.max(base.longestStreak, nextCurrent),
      lastCheckInDate: todayStr,
      totalTasksCompleted: nextTotal,
      rewardPoints: nextPoints,
      rewardedTaskIds: Array.from(rewardedTasks),
      rewardedCheckInDates: Array.from(rewardedDates),
      activeDaysThisWeek: base.activeDaysThisWeek.includes(todayDayName)
        ? base.activeDaysThisWeek
        : [...base.activeDaysThisWeek, todayDayName],
      checkInHistory: base.checkInHistory.includes(todayStr)
        ? base.checkInHistory
        : [...base.checkInHistory, todayStr],
    };
    return { ...updated, badges: computeUnlockedBadges(updated) };
  };

  const handleToggleTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : undefined,
          }
        : t
    );

    let nextStreak = { ...streak };
    if (targetTask && !targetTask.completed) {
      nextStreak = computeNextStreakOnActivity(nextStreak, 1, taskId, false);
    } else if (targetTask && targetTask.completed) {
      nextStreak = {
        ...nextStreak,
        totalTasksCompleted: Math.max(0, nextStreak.totalTasksCompleted - 1),
      };
    }

    onUpdateProfile({
      ...userProfile,
      weeklyTasks: updatedTasks,
      streakData: nextStreak,
    });
  };

  const handleClaimStreak = () => {
    if (isCheckedInToday) return;
    const nextStreak = computeNextStreakOnActivity(streak, 0, undefined, true);
    onUpdateProfile({
      ...userProfile,
      streakData: nextStreak,
    });
  };

  const openAddModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDay('Monday');
    setTaskCategory('Coding & DSA');
    setTaskPriority('High');
    setTaskMinutes(45);
    setTaskDeadline('');
    setTaskNotes('');
    setShowTaskModal(true);
  };

  const openEditModal = (task: WeeklyTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDay(task.dayOfWeek);
    setTaskCategory(task.category);
    setTaskPriority(task.priority);
    setTaskMinutes(task.estimatedMinutes);
    setTaskDeadline(task.deadline || '');
    setTaskNotes(task.notes || '');
    setShowTaskModal(true);
  };

  const handleSaveTaskModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTaskId) {
      const updated = tasks.map((t) =>
        t.id === editingTaskId
          ? {
              ...t,
              title: taskTitle.trim(),
              dayOfWeek: taskDay,
              category: taskCategory,
              priority: taskPriority,
              estimatedMinutes: Number(taskMinutes) || 45,
              deadline: taskDeadline.trim() || undefined,
              notes: taskNotes.trim() || undefined,
            }
          : t
      );
      onUpdateProfile({ ...userProfile, weeklyTasks: updated });
    } else {
      const created: WeeklyTask = {
        id: `task-${Date.now()}`,
        title: taskTitle.trim(),
        dayOfWeek: taskDay,
        category: taskCategory,
        priority: taskPriority,
        estimatedMinutes: Number(taskMinutes) || 45,
        deadline: taskDeadline.trim() || undefined,
        notes: taskNotes.trim() || undefined,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      onUpdateProfile({ ...userProfile, weeklyTasks: [...tasks, created] });
    }

    setShowTaskModal(false);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateProfile({
      ...userProfile,
      weeklyTasks: tasks.filter((t) => t.id !== taskId),
    });
  };

  const handleClearCompleted = () => {
    onUpdateProfile({
      ...userProfile,
      weeklyTasks: tasks.filter((t) => !t.completed),
    });
  };

  const handleGenerateAiSprint = async () => {
    setGeneratingAiSprint(true);
    setSprintNotice(null);

    try {
      const res = await generateAIWeeklySprint({
        targetRole: userProfile.careerGoals.dreamJob || 'Software Development Engineer',
        currentSkills: userProfile.knownSkills.map((s) => s.name),
        weeklyTargetHours: userProfile.currentActivities.weeklyTargetHours || 15,
      });

      if (res && res.tasks && res.tasks.length > 0) {
        const newSprintTasks: WeeklyTask[] = res.tasks.map((t, idx) => ({
          id: `ai-task-${Date.now()}-${idx}`,
          title: t.title,
          dayOfWeek: t.dayOfWeek,
          category: t.category,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes || 45,
          notes: t.notes,
          completed: false,
          createdAt: new Date().toISOString(),
        }));

        onUpdateProfile({
          ...userProfile,
          weeklyTasks: [...tasks, ...newSprintTasks],
        });

        setSprintNotice({
          type: 'info',
          text: `AI Sprint Added: "${res.weeklyGoal}". ${res.motivationalQuote}`,
        });
      }
    } catch (err: any) {
      setSprintNotice({
        type: 'error',
        text: err?.message || 'Could not reach AI service to generate sprint tasks.',
      });
    } finally {
      setGeneratingAiSprint(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedDay !== 'All' && t.dayOfWeek !== selectedDay) return false;
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const totalMinutes = tasks.reduce((acc, curr) => acc + (curr.completed ? curr.estimatedMinutes : 0), 0);
  const totalHoursLogged = (totalMinutes / 60).toFixed(1);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. STREAK HERO CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 via-[#18181b] to-orange-950/70 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Genuine Activity Streak & Study Sprint</span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight flex items-center gap-2">
                  <Flame className="w-10 h-10 fill-amber-500 text-amber-400" />
                  {streak.currentStreak}-Day Streak
                </span>
              </div>
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                {isCheckedInToday
                  ? "Checked in today! Completing tasks and daily check-ins genuinely builds your streak record."
                  : streak.currentStreak === 0
                  ? 'Complete your first task or check in today to begin a genuine study streak.'
                  : 'Check in today or complete a scheduled study task to continue your streak.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200 border border-white/10">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Best Streak: <strong>{streak.longestStreak} Days</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tasks Completed: <strong>{streak.totalTasksCompleted}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-amber-200 border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Learning Pts: <strong>{streak.rewardPoints || 0}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Logged: <strong>{totalHoursLogged} hrs</strong> / {userProfile.currentActivities.weeklyTargetHours} hrs
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={handleClaimStreak}
              disabled={isCheckedInToday}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-xl transition active:scale-95 ${
                isCheckedInToday
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white'
              }`}
            >
              {isCheckedInToday ? (
                <>
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>Checked In Today</span>
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 fill-white" />
                  <span>Daily Study Check-In</span>
                </>
              )}
            </button>

            <button
              onClick={handleGenerateAiSprint}
              disabled={generatingAiSprint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${generatingAiSprint ? 'animate-spin' : ''}`} />
              <span>{generatingAiSprint ? 'Generating Sprint...' : 'AI-Generate 7-Day Sprint'}</span>
            </button>
          </div>
        </div>

        {/* 7-DAY CALENDAR STRIP */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <span className="text-xs uppercase font-extrabold tracking-wider text-zinc-400 block mb-3">
            Weekly Activity Strip
          </span>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isToday = day === todayDayName;
              const hasActivity =
                streak.activeDaysThisWeek.includes(day) ||
                tasks.some((t) => t.dayOfWeek === day && t.completed);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center justify-center rounded-2xl p-2.5 text-center transition ${
                    selectedDay === day
                      ? 'bg-amber-500 text-white font-bold shadow-lg ring-2 ring-white/50'
                      : hasActivity
                      ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                      : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold">{day.substring(0, 3)}</span>
                  <div className="my-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                    {hasActivity ? (
                      <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 opacity-30" />
                    )}
                  </div>
                  <span className="text-[10px]">{isToday ? 'Today' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {sprintNotice && (
        <div
          className={`rounded-2xl border p-4 text-xs flex items-center justify-between gap-2 ${
            sprintNotice.type === 'error'
              ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200'
              : 'border-orange-300 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {sprintNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
            )}
            <span>{sprintNotice.text}</span>
          </div>
          <button onClick={() => setSprintNotice(null)} className="font-bold underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Achievement Badges & Non-Monetary Reward Points */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Achievement Badges &amp; Study Milestones</span>
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Non-monetary progress points: +15 pts per unique completed task, +20 pts per unique daily check-in.
            </p>
          </div>
          <span className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
            Total Earned: {streak.rewardPoints || 0} pts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {BADGE_DEFINITIONS.map((badge) => {
            const unlocked = (streak.badges || []).includes(badge.label) || badge.check(streak);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl border p-3 text-xs transition ${
                  unlocked
                    ? 'border-amber-400/50 bg-amber-500/10 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 opacity-55 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Award className={`w-4 h-4 ${unlocked ? 'text-amber-500' : 'text-zinc-400'}`} />
                  <span className="text-[10px] font-bold uppercase">
                    {unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <p className="font-bold leading-tight">{badge.label}</p>
                <p className="text-[10px] opacity-80 mt-0.5 leading-snug">{badge.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. WEEKLY TASK PLANNER */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">Weekly Study & Sprint Tasks</h2>
              <span className="rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-300">
                {completedCount} / {tasks.length} Done ({progressPercent}%)
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Add, edit, set deadlines, and mark study tasks done to track real progress.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>

            {completedCount > 0 && (
              <button
                onClick={handleClearCompleted}
                className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-rose-400 hover:text-rose-500 text-zinc-600 dark:text-zinc-400 text-xs font-semibold transition"
              >
                Clear Done
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span>Weekly Target Completion</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedDay('All')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedDay === 'All'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              All Days
            </button>
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                  selectedDay === day
                    ? 'bg-orange-600 text-white font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 pt-2">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center space-y-2">
              <Calendar className="w-8 h-8 text-zinc-400 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                No tasks scheduled for this filter
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Add a task manually or click "AI-Generate 7-Day Sprint" above to populate your study week.
              </p>
              <button
                onClick={openAddModal}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityColor =
                task.priority === 'High'
                  ? 'border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                  : task.priority === 'Medium'
                  ? 'border-amber-300 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                  : 'border-sky-300 dark:border-sky-900/60 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40';

              return (
                <div
                  key={task.id}
                  className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                    task.completed
                      ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 opacity-85'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 hover:border-orange-400'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 shrink-0 transition active:scale-90"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-400 hover:text-orange-500" />
                      )}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${priorityColor}`}>
                          {task.priority} Priority
                        </span>
                        {task.deadline && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            Due: {task.deadline}
                          </span>
                        )}
                      </div>

                      {task.notes && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{task.notes}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-orange-600 dark:text-orange-400">{task.dayOfWeek}</span>
                        <span>•</span>
                        <span className="rounded bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5">{task.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimatedMinutes} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 transition"
                      title="Edit task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 transition"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADD / EDIT TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {editingTaskId ? (
                  <Edit3 className="w-4 h-4 text-orange-500" />
                ) : (
                  <Plus className="w-4 h-4 text-orange-500" />
                )}
                <span>{editingTaskId ? 'Edit Study Task' : 'Add Weekly Sprint Task'}</span>
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTaskModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Solve 2 array & sliding window problems"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Day of Week</label>
                  <select
                    value={taskDay}
                    onChange={(e) => setTaskDay(e.target.value as DayOfWeek)}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Duration (mins)</label>
                  <select
                    value={taskMinutes}
                    onChange={(e) => setTaskMinutes(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                    <option value={90}>90 mins</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Deadline (Optional)</label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Resources, problem links, or focus notes..."
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md"
                >
                  {editingTaskId ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
