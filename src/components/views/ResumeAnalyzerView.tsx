import React, { useState, useRef } from 'react';
import {
  FileSearch,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Tag,
  RefreshCw,
  FileText,
  AlertCircle,
  Upload,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { analyzeResume, ResumeAnalysisResponse } from '../../services/api';

export const ResumeAnalyzerView: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('Full Stack Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadSample = () => {
    const sample = `Alex Rivera
alex.rivera.dev@gmail.com | Austin, TX | https://alexrivera.dev

PROFESSIONAL SUMMARY
Dedicated Full-Stack Software Engineer with 3+ years experience building web applications using React, TypeScript, Node.js, and cloud architectures.

EXPERIENCE
Apex Digital Solutions — Full-Stack Software Engineer (2023 - Present)
- Engineered responsive client portals in React & TypeScript, boosting mobile engagement by 38% and maintaining 99.9% uptime.
- Refactored REST endpoints into modular Express services, cutting P95 API response times from 420ms to 95ms.
- Implemented automated PWA caching and offline fallback, reducing repeat visitor network payload by 65%.

PROJECTS
TaskFlow Realtime — React, TypeScript, WebSockets
- Built a low-latency collaborative Kanban workspace with optimistic UI updates.

EDUCATION
B.S. in Computer Science — University of Texas at Austin (GPA: 3.8/4.0)

SKILLS
React, TypeScript, JavaScript, Node.js, Express, PostgreSQL, Docker, Git, CI/CD, PWA, Tailwind CSS`;

    setResumeText(sample);
    setUploadNotice('Loaded sample resume.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadNotice(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['txt', 'md', 'json', 'csv'].includes(ext)) {
      setError(
        `".${ext}" binary parsing is not enabled offline. Please export your resume as .txt/.md or paste the resume text directly below.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '').slice(0, 18000);
      setResumeText(content);
      setUploadNotice(`Loaded "${file.name}" (${content.length} characters).`);
    };
    reader.onerror = () => {
      setError('Could not read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resumeText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzeResume(
        resumeText.trim(),
        targetRole.trim() || 'Software Engineer',
        jobDescription.trim() || undefined
      );
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze resume. Please check your AI provider configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <FileSearch className="w-4 h-4" />
            <span>ATS Readiness & Job Description Matcher</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            AI Resume Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Upload plain-text/Markdown or paste your resume, match against an optional job description, check sections & formatting, and polish weak bullets.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <Upload className="w-3.5 h-3.5 text-orange-500" />
            <span>Upload (.txt / .md)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Sample</span>
          </button>
        </div>
      </div>

      {/* Transparency Banner */}
      <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>
          Scores are AI-estimated readiness indices based on section structure, action-verb impact, and keyword overlap — real company ATS filters vary by employer.
        </span>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleAnalyze}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-lg space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
              Target Job Title *
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Frontend Developer, Data Analyst"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            {uploadNotice && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pb-2">
                {uploadNotice}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Resume Text *
            </label>
            <span className="text-[11px] text-zinc-500">{resumeText.length} characters</span>
          </div>
          <textarea
            rows={8}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your plain-text resume here, including contact info, summary, experience, projects, education, and skills..."
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
            Optional: Paste Target Job Description (for Keyword Match)
          </label>
          <textarea
            rows={3}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste requirements from a real job posting to compare keyword overlap..."
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading || !resumeText.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 transition active:scale-95"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
            <span>{loading ? 'Analyzing Resume...' : 'Analyze Resume'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-red-950/30 p-3.5 text-xs text-rose-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          {resumeText.trim() && (
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Analysis Results View */}
      {result && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-xl space-y-6">
          {/* Top Score Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Resume Audit Report</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                {result.summary}
              </p>
              {result.disclaimer && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1.5 italic">
                  {result.disclaimer}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                  Estimated Score
                </span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  {result.atsScore >= 80 ? 'Strong Draft' : result.atsScore >= 60 ? 'Needs Tuning' : 'Needs Work'}
                </p>
              </div>

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-center shadow-md ${
                  result.atsScore >= 80
                    ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : result.atsScore >= 60
                    ? 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                    : 'border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div>
                  <span className="text-2xl font-black">{result.atsScore}</span>
                  <span className="block text-[9px] text-zinc-500 dark:text-zinc-400">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Completeness Checks */}
          {result.sectionChecks && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Section Completeness Check
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(result.sectionChecks).map(([sec, present]) => (
                  <div
                    key={sec}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold flex items-center justify-between ${
                      present
                        ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <span className="capitalize">{sec}</span>
                    <span>{present ? '✓' : 'Missing'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar & Formatting */}
          {(result.grammarAndReadability || result.formattingFeedback) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.grammarAndReadability && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Grammar & Readability
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {result.grammarAndReadability}
                  </p>
                </div>
              )}
              {result.formattingFeedback && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Structure & Formatting
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {result.formattingFeedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Optional JD Match */}
          {result.jdMatchAnalysis?.provided && (
            <div className="rounded-xl border border-sky-300 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/20 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider">
                <Briefcase className="w-4 h-4" />
                <span>Job Description Keyword Alignment</span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">{result.jdMatchAnalysis.relevanceNote}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                    Matched from JD:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.jdMatchAnalysis.matchedKeywords || []).map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      >
                        ✓ {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                    Missing from JD:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.jdMatchAnalysis.missingFromJd || []).map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                      >
                        + {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Missing Keywords Box */}
          {result.missingKeywords && result.missingKeywords.length > 0 && (
            <div className="rounded-xl border border-orange-300 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-xs font-semibold uppercase tracking-wider">
                <Tag className="w-4 h-4" />
                <span>Suggested Keywords for {targetRole}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {result.missingKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-white dark:bg-zinc-900 border border-orange-300 dark:border-orange-700/50 px-2.5 py-1 text-xs font-medium text-orange-800 dark:text-orange-200"
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Strengths</span>
              </div>
              <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                {result.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-300 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>High-Priority Improvements</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                {result.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bullet Point Rewrites */}
          {result.bulletRewrites && result.bulletRewrites.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-500" />
                <span>Recommended Bullet Rewrites</span>
              </h4>

              <div className="space-y-3">
                {result.bulletRewrites.map((rw, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-rose-600 dark:text-rose-400 uppercase text-[10px] tracking-wider">
                        Original:
                      </span>
                      <p className="text-zinc-500 dark:text-zinc-400 line-through mt-0.5">{rw.original}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider">
                        Improved:
                      </span>
                      <p className="text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">{rw.improved}</p>
                    </div>

                    <p className="text-[11px] text-zinc-500 italic pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      Why: {rw.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
