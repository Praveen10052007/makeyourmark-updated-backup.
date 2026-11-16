import React, { useState } from 'react';
import {
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FolderGit2,
  TrendingUp,
  Brain,
  Info,
} from 'lucide-react';
import { UserProfile, SkillGapAnalysisResult } from '../../types';
import { requestSkillGapAnalysis } from '../../services/api';
import { CAREER_CATEGORIES } from '../../data/mockData';
import { ALL_DEPARTMENTS, findDepartmentMeta } from '../../data/departments';

interface Props {
  userProfile: UserProfile;
  onUpdateProfile?: (updated: UserProfile) => void;
}

export const SkillGapView: React.FC<Props> = ({ userProfile, onUpdateProfile }) => {
  const [careerCategory, setCareerCategory] = useState<string>(
    userProfile.careerGoals?.careerCategory || CAREER_CATEGORIES[0].category
  );
  const [careerGoal, setCareerGoal] = useState<string>(
    userProfile.careerGoals?.dreamJob || 'Software Developer'
  );
  const [targetCompany, setTargetCompany] = useState<string>(
    userProfile.careerGoals?.targetCompanies?.join(', ') || 'Zoho, Google, Microsoft, TCS Digital'
  );
  const [degree, setDegree] = useState<string>(userProfile.degree || 'B.E. Computer Science');
  const [department, setDepartment] = useState<string>(userProfile.department || 'Computer Science & Engineering');
  const [yearOfStudy, setYearOfStudy] = useState<string>(userProfile.yearOfStudy || '3rd Year');

  const [knownSkillsList, setKnownSkillsList] = useState<{ name: string; level: 'Beginner' | 'Intermediate' | 'Advanced' }[]>(
    userProfile.knownSkills && userProfile.knownSkills.length > 0
      ? userProfile.knownSkills
      : [
          { name: 'JavaScript', level: 'Intermediate' },
          { name: 'React', level: 'Intermediate' },
          { name: 'Python', level: 'Beginner' },
          { name: 'Data Structures', level: 'Intermediate' },
          { name: 'SQL', level: 'Intermediate' },
        ]
  );
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');

  const [dailyHours, setDailyHours] = useState<number>(
    userProfile.currentActivities?.weeklyTargetHours
      ? Math.max(1, Math.round(userProfile.currentActivities.weeklyTargetHours / 7))
      : 2
  );
  const [targetTimeline, setTargetTimeline] = useState<string>('6 months');
  const [learningMethod, setLearningMethod] = useState<string>('Hands-on projects & building apps');

  const [experienceSummary, setExperienceSummary] = useState<string>(
    userProfile.internships?.map((i) => `${i.role} at ${i.company}`).join('; ') || ''
  );
  const [projectsSummary, setProjectsSummary] = useState<string>(
    userProfile.completedProjects?.map((p) => p.title).join('; ') || ''
  );
  const [certificationsSummary, setCertificationsSummary] = useState<string>(
    userProfile.certifications?.map((c) => c.name).join('; ') || ''
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SkillGapAnalysisResult | null>(() => {
    const saved = localStorage.getItem('mym_skill_gap_result');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'matrix' | 'roadmap' | 'timetable' | 'projects' | 'resources'>('matrix');

  const categoryRoles = CAREER_CATEGORIES.find((c) => c.category === careerCategory)?.roles || [];

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const trimmed = newSkillInput.trim();
    if (!knownSkillsList.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setKnownSkillsList([...knownSkillsList, { name: trimmed, level: newSkillLevel }]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (name: string) => {
    setKnownSkillsList(knownSkillsList.filter((s) => s.name !== name));
  };

  const handleUpdateProficiency = (name: string, level: 'Beginner' | 'Intermediate' | 'Advanced') => {
    setKnownSkillsList(knownSkillsList.map((s) => (s.name === name ? { ...s, level } : s)));
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);

    const skillProficienciesMap: Record<string, string> = {};
    knownSkillsList.forEach((s) => {
      skillProficienciesMap[s.name] = s.level;
    });

    try {
      const data = await requestSkillGapAnalysis({
        careerGoal,
        targetCompany,
        education: degree,
        department,
        yearOfStudy,
        currentSkills: knownSkillsList.map((s) => s.name),
        skillProficiencies: skillProficienciesMap,
        projects: projectsSummary,
        internships: experienceSummary,
        certifications: certificationsSummary,
        dailyStudyHours: dailyHours,
        targetDate: targetTimeline,
        preferredLearningMethods: learningMethod,
      });

      setAnalysisResult(data);
      localStorage.setItem('mym_skill_gap_result', JSON.stringify(data));

      if (onUpdateProfile) {
        onUpdateProfile({
          ...userProfile,
          knownSkills: knownSkillsList,
          careerGoals: {
            ...userProfile.careerGoals,
            careerCategory,
            dreamJob: careerGoal,
            targetCompanies: targetCompany.split(',').map((c) => c.trim()).filter(Boolean),
          },
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to generate skill gap analysis. Please check your network or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGapStatus = (skillId: string) => {
    if (!analysisResult) return;

    const updatedMissing = analysisResult.missingSkills.map((item) => {
      if (item.id === skillId) {
        let nextStatus: 'not-started' | 'in-progress' | 'completed' = 'in-progress';
        if (item.status === 'not-started') nextStatus = 'in-progress';
        else if (item.status === 'in-progress') nextStatus = 'completed';
        else nextStatus = 'not-started';
        return { ...item, status: nextStatus };
      }
      return item;
    });

    const totalRequired = analysisResult.requiredSkills.length || 10;
    const completedGaps = updatedMissing.filter((s) => s.status === 'completed').length;
    const initialMastered = analysisResult.acquiredSkills.length;
    const currentMastered = initialMastered + completedGaps;
    const recalculatedPercentage = Math.min(100, Math.round((currentMastered / Math.max(totalRequired, 1)) * 100));

    const updatedResult: SkillGapAnalysisResult = {
      ...analysisResult,
      missingSkills: updatedMissing,
      progressSummary: {
        ...analysisResult.progressSummary,
        skillsMastered: currentMastered,
        skillsMissing: updatedMissing.filter((s) => s.status !== 'completed').length,
        matchPercentage: recalculatedPercentage,
      },
    };

    setAnalysisResult(updatedResult);
    localStorage.setItem('mym_skill_gap_result', JSON.stringify(updatedResult));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>AI Career Architect & Skill Gap Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Goal Setting & Skill Gap Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Select your dream career across 12+ industries or enter a custom goal, map skill gaps, and follow a personalized weekly schedule.
          </p>
        </div>

        {analysisResult && (
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-xl text-right shadow-xs">
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">Goal Match</div>
              <div className="text-lg font-black text-orange-600 dark:text-amber-400">
                {analysisResult.progressSummary?.matchPercentage ?? 65}%
              </div>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing...' : 'Recalculate Gap'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Goal Setting Form */}
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-amber-400 font-bold text-xs">
              1
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Your Target Goal & Profile</h2>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">All 12+ Career Categories Supported</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Career Category */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Career Field / Category</label>
            <select
              value={careerCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setCareerCategory(cat);
                const first = CAREER_CATEGORIES.find((c) => c.category === cat)?.roles[0];
                if (first && first !== 'Custom Career Goal') setCareerGoal(first);
              }}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              {CAREER_CATEGORIES.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>

          {/* Target Role */}
          <div className="lg:col-span-2 space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Target Career Role or Custom Goal <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="Enter any career goal (e.g. Software Developer, Data Analyst, VLSI Engineer, Medical Coder)"
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categoryRoles.filter((r) => r !== 'Custom Career Goal').slice(0, 5).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCareerGoal(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    careerGoal === preset
                      ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-amber-400 font-semibold'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-orange-500/40'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Target Companies / Industry (Optional)</label>
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. Google, Zoho, FinTech, Healthcare"
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Academic Department</label>
            <select
              value={ALL_DEPARTMENTS.some((d) => d.name === department) ? department : 'custom'}
              onChange={(e) => {
                if (e.target.value !== 'custom') {
                  const meta = findDepartmentMeta(e.target.value);
                  setDepartment(meta.name);
                }
              }}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              {ALL_DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
              {!ALL_DEPARTMENTS.some((d) => d.name === department) && (
                <option value="custom">{department || 'Custom Department'}</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Qualification / Degree</label>
            <input
              type="text"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="B.E. / B.Tech / B.Sc / MBA"
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Current Stage / Year</label>
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="Final Year">Final Year</option>
              <option value="Recent Graduate">Recent Graduate / Fresher</option>
              <option value="Working Professional">Working Professional</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Study Time / Day</label>
            <select
              value={dailyHours}
              onChange={(e) => setDailyHours(parseInt(e.target.value, 10))}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value={1}>1 hour / day (~7 hrs/wk)</option>
              <option value={2}>2 hours / day (~14 hrs/wk)</option>
              <option value={3}>3 hours / day (~21 hrs/wk)</option>
              <option value={4}>4+ hours / day (Intensive)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Target Timeline</label>
            <select
              value={targetTimeline}
              onChange={(e) => setTargetTimeline(e.target.value)}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="3 months">3 Months</option>
              <option value="6 months">6 Months</option>
              <option value="12 months">12 Months</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Projects / Internships / Certs</label>
            <input
              type="text"
              value={projectsSummary}
              onChange={(e) => setProjectsSummary(e.target.value)}
              placeholder="e.g. Portfolio App, Cloud Cert..."
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="lg:col-span-3 space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Preferred Learning Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                'Hands-on projects & building apps',
                'Algorithmic problem solving (LeetCode/DSA)',
                'Reading official documentation & textbooks',
                'Video lectures (MIT OCW, freeCodeCamp)',
              ].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setLearningMethod(method)}
                  className={`text-left text-xs px-3 py-2 rounded-xl border transition ${
                    learningMethod === method
                      ? 'bg-orange-500/15 border-orange-500 text-orange-700 dark:text-amber-300 font-semibold'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Proficiency Matrix */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-3">
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Current Technical & Soft Skills
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Specify Beginner, Intermediate, or Advanced for accurate gap estimation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              placeholder="Add skill (e.g. TypeScript, Excel, AutoCAD, Financial Modeling)..."
              className="flex-1 min-w-[200px] rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500"
            />
            <select
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(e.target.value as any)}
              className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition"
            >
              Add Skill
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
            {knownSkillsList.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl"
              >
                <div className="truncate font-medium text-xs text-zinc-800 dark:text-zinc-200 mr-2">{skill.name}</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={skill.level}
                    onChange={(e) => handleUpdateProficiency(skill.name, e.target.value as any)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-zinc-400 hover:text-red-500 text-xs px-1"
                    title="Remove skill"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={loading || !careerGoal.trim()}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-orange-600/20 transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing Skill Gap...' : 'Generate 12-Point Skill Gap Analysis'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-700 dark:text-red-300 mb-1">Analysis Notice</div>
            <p>{error}</p>
            <button
              onClick={handleRunAnalysis}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-500 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
            </button>
          </div>
        </div>
      )}

      {/* Results Dashboard */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Role Match Readiness</span>
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-orange-600 dark:text-amber-400">
                  {analysisResult.progressSummary?.matchPercentage ?? 65}%
                </span>
                <span className="text-xs text-zinc-500">
                  ({analysisResult.progressSummary?.skillsMastered ?? 0}/{analysisResult.progressSummary?.totalRequired ?? 10} skills)
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${analysisResult.progressSummary?.matchPercentage ?? 65}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Remaining Skill Gaps</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">
                  {analysisResult.progressSummary?.skillsMissing ?? analysisResult.missingSkills?.length ?? 0}
                </span>
                <span className="text-xs text-zinc-500">priority gaps</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Toggle skill status below to track progress</p>
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Estimated Timeline</span>
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">
                  ~{analysisResult.estimatedTimeline?.totalMonths ?? 4} Mos
                </span>
                <span className="text-xs text-zinc-500">@{dailyHours}h/day</span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                *Estimate based on study pace, not a hiring guarantee.
              </p>
            </div>

            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Immediate Next Focus</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2">
                {analysisResult.progressSummary?.recommendedNextStep || 'Complete Phase 1 foundations'}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Paced for {dailyHours}h daily schedule.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
            {[
              { id: 'matrix', label: '1. Skill Gap Matrix' },
              { id: 'roadmap', label: '2. 4-Phase Roadmap' },
              { id: 'timetable', label: '3. Weekly Timetable' },
              { id: 'projects', label: '4. Projects & Certs' },
              { id: 'resources', label: '5. Verified Resources' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'matrix' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">Priority Missing Skills & Knowledge Gaps</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Click the status button on any skill to mark In Progress or Mastered.</p>
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">{analysisResult.missingSkills?.length || 0} gaps</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.missingSkills?.map((gap) => (
                    <div
                      key={gap.id || gap.name}
                      className={`rounded-xl border p-4 transition space-y-3 ${
                        gap.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : gap.status === 'in-progress'
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-zinc-900 dark:text-white">{gap.name}</div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {gap.category} • ~{gap.estimatedWeeks} weeks
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              gap.priority === 'High'
                                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                : gap.priority === 'Medium'
                                ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {gap.priority}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleGapStatus(gap.id)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                              gap.status === 'completed'
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : gap.status === 'in-progress'
                                ? 'bg-amber-600 text-white border-amber-500'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
                            }`}
                          >
                            {gap.status === 'completed' ? 'Completed' : gap.status === 'in-progress' ? 'In Progress' : 'Start'}
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                        <strong className="text-zinc-800 dark:text-zinc-200">Why this matters: </strong>
                        {gap.whyImportant}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Skills You Possess ({analysisResult.acquiredSkills?.length || 0})
                  </h3>
                  <div className="space-y-2.5">
                    {analysisResult.acquiredSkills?.map((s) => (
                      <div key={s.name} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-white">{s.name}</span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/15">
                            {s.level}
                          </span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">{s.assessment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <Layers className="w-4 h-4 text-orange-500" />
                    Target Role Requirements ({analysisResult.requiredSkills?.length || 0})
                  </h3>
                  <div className="space-y-2.5">
                    {analysisResult.requiredSkills?.map((r) => (
                      <div key={r.name} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-white">{r.name}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">{r.category}</span>
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">{r.importance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Beginner-to-Advanced Learning Phases
              </h3>
              <div className="space-y-4">
                {analysisResult.learningRoadmap?.map((phase, idx) => (
                  <div key={phase.phase || idx} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-orange-600 dark:text-amber-400">
                        {phase.phase} • {phase.timeframe}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">Milestone {idx + 1}</span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{phase.title}</h4>
                    <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      {phase.milestones?.map((m, mi) => (
                        <li key={mi}>• {m}</li>
                      ))}
                    </ul>
                    {phase.recommendedDeliverable && (
                      <div className="rounded-xl bg-orange-500/10 border border-orange-500/25 p-3 text-xs text-zinc-800 dark:text-zinc-200">
                        <strong>Deliverable: </strong>{phase.recommendedDeliverable}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  Weekly Study Timetable ({dailyHours * 7} hrs / week)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisResult.weeklyTimetable?.map((slot) => (
                  <div key={slot.day} className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">{slot.day}</span>
                      <span className="text-[11px] font-bold text-orange-600 dark:text-amber-400 bg-orange-500/15 px-2 py-0.5 rounded">
                        {slot.hours} hrs
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{slot.focus}</div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      {slot.actionItems}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <FolderGit2 className="w-5 h-5 text-orange-500" />
                  Portfolio Projects
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.portfolioProjects?.map((proj, idx) => (
                    <div key={idx} className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{proj.title}</h4>
                      <div className="text-xs text-orange-600 dark:text-amber-400 font-mono">{proj.techStack}</div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{proj.concept}</p>
                      <div className="text-xs bg-white dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 italic text-zinc-700 dark:text-zinc-300">
                        "{proj.resumeBullet}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Relevant Certifications
                  </h3>
                  <div className="space-y-3">
                    {analysisResult.certificationsAndInterviews?.certifications?.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                        <div className="font-bold text-zinc-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] text-orange-600 dark:text-amber-400 font-semibold">{c.issuer}</div>
                        <p className="text-zinc-500 dark:text-zinc-400">{c.whyValuable}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <Brain className="w-4 h-4 text-orange-500" />
                    Key Interview Preparation Topics
                  </h3>
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {analysisResult.certificationsAndInterviews?.topInterviewTopics?.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <span className="w-5 h-5 rounded-full bg-orange-500/15 text-orange-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Verified Learning Resources
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysisResult.recommendedResources?.map((res, i) => (
                  <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{res.name}</h4>
                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {res.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{res.topics}</p>
                    </div>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-amber-400 hover:underline pt-2"
                    >
                      <span>Open Resource</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-zinc-800 dark:text-zinc-200">Estimate Notice: </strong>
              {analysisResult.disclaimer ||
                'This learning timeline and skill breakdown are AI estimates based on your daily study commitment, not a hiring guarantee.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
