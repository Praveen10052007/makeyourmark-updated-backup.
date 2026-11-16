import React, { useState, useRef } from 'react';
import {
  GraduationCap,
  Sparkles,
  Copy,
  Check,
  BookOpen,
  HelpCircle,
  Code2,
  AlertCircle,
  Zap,
  Upload,
  FileText,
  RotateCcw,
  ListOrdered,
  Layers,
  NotebookPen,
  Briefcase,
  Languages,
} from 'lucide-react';
import { requestAITutorDetailed } from '../../services/api';
import { UserProfile, StudyNote, SupportedLanguage } from '../../types';
import { SUPPORTED_CHAT_LANGUAGES } from '../../utils/languages';

interface Props {
  userProfile?: UserProfile;
  onAddNote?: (note: StudyNote) => void;
}

interface TutorTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  topicTitle?: string;
  subject?: string;
  providerLabel?: string;
  timestamp: string;
}

export const AITutorView: React.FC<Props> = ({ userProfile, onAddNote }) => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState(
    userProfile?.department ? `${userProfile.department}` : 'Computer Science & Engineering (CSE / IT / AI&ML)'
  );
  const [customSubject, setCustomSubject] = useState('');
  const [mode, setMode] = useState<string>('simple-explanation');
  const [skillLevel, setSkillLevel] = useState<string>(userProfile?.aiSettings?.difficulty || 'intermediate');
  const [language, setLanguage] = useState<SupportedLanguage>(userProfile?.preferredLanguage || 'en');
  const [dataSaver, setDataSaver] = useState(userProfile?.dataSaverMode || false);

  const [documentContext, setDocumentContext] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversation, setConversation] = useState<TutorTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedTopic, setLastFailedTopic] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const academicSubjects = [
    ...(userProfile?.department ? [userProfile.department] : []),
    'Computer Science & Engineering (CSE / IT / AI&ML)',
    'Programming, DSA & Cybersecurity',
    'Engineering Mathematics & Discrete Math',
    'Electronics, VLSI & Embedded Systems (ECE)',
    'Electrical, Power & Instrumentation (EEE / E&I)',
    'Mechanical, Automobile & Mechatronics',
    'Civil, Chemical & Manufacturing Engineering',
    'Biotechnology & Biomedical Engineering',
    'Business, Finance & Non-Engineering Courses',
    'Custom Subject / Topic',
  ].filter((val, idx, arr) => arr.indexOf(val) === idx);

  const effectiveSubject = subject === 'Custom Subject / Topic' ? customSubject.trim() || 'General Academics' : subject;

  const quickModes = [
    { id: 'simple-explanation', label: 'Simple Explanation', icon: BookOpen },
    { id: 'detailed-explanation', label: 'Detailed Explanation', icon: Layers },
    { id: 'step-by-step', label: 'Step-by-Step Teaching', icon: ListOrdered },
    { id: 'practice-questions', label: 'Worked Examples & Practice', icon: Sparkles },
    { id: 'exam-preparation', label: 'Exam Preparation', icon: GraduationCap },
    { id: 'short-notes', label: 'Short Notes', icon: FileText },
    { id: 'quiz-generation', label: 'Quiz Generation', icon: HelpCircle },
    { id: 'code-explanation', label: 'Code / Formula Breakdown', icon: Code2 },
    { id: 'interview-preparation', label: 'Interview Prep', icon: Briefcase },
  ];

  const suggestedTopics: Record<string, string[]> = {
    'Computer Science & Engineering (CSE / IT / AI&ML)': [
      'B-Tree vs B+ Tree Indexing in Databases',
      'Virtual Memory & Paging in Operating Systems',
      'Bias-Variance Tradeoff in Machine Learning',
    ],
    'Programming, DSA & Cybersecurity': [
      'Dijkstra Shortest Path Algorithm Step-by-Step',
      'Dynamic Programming: 0/1 Knapsack Problem',
      'SQL Injection Prevention & Prepared Statements',
    ],
    'Engineering Mathematics & Discrete Math': [
      'Eigenvalues & Eigenvectors Intuition',
      'Bayes Theorem & Conditional Probability',
      'Laplace Transforms Step-by-Step',
    ],
    'Electronics, VLSI & Embedded Systems (ECE)': [
      'Karnaugh Maps (K-Maps) 4-Variable Simplification',
      'Finite State Machines (Mealy vs Moore)',
      'MOSFET Switching & CMOS Inverter Characteristics',
    ],
    'Electrical, Power & Instrumentation (EEE / E&I)': [
      'PID Controller Tuning Intuitively Explained',
      'Three-Phase Induction Motor Working & Slip',
      'Thevenin & Norton Equivalent Circuits',
    ],
    'Mechanical, Automobile & Mechatronics': [
      'First & Second Laws of Thermodynamics',
      'Stress-Strain Curve & Factor of Safety',
      'Otto Cycle vs Diesel Cycle Efficiency',
    ],
    'Civil, Chemical & Manufacturing Engineering': [
      'Shear Force & Bending Moment Diagrams (SFD & BMD)',
      'Mass Balance in Chemical Reactors',
      'Six Sigma & Lean Manufacturing Principles',
    ],
    'Biotechnology & Biomedical Engineering': [
      'PCR (Polymerase Chain Reaction) Steps & Primers',
      'ECG Waveform PQRST Interpretation',
    ],
    'Business, Finance & Non-Engineering Courses': [
      'NPV vs IRR in Financial Analysis',
      'Supply & Demand Elasticity Examples',
    ],
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds 2 MB. Please upload a smaller text or markdown file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDocumentContext(text.slice(0, 12000));
        setUploadedFileName(file.name);
        setError(null);
      }
    };
    reader.onerror = () => setError('Failed to read file. Please paste text directly.');
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setDocumentContext('');
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent, explicitTopic?: string) => {
    if (e) e.preventDefault();
    const queryTopic = (explicitTopic ?? topic).trim();
    if (!queryTopic || loading) return;

    setLoading(true);
    setError(null);
    setLastFailedTopic(queryTopic);

    const newTurnUser: TutorTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: queryTopic,
      topicTitle: queryTopic,
      subject: effectiveSubject,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentHistory = conversation.map((c) => ({ role: c.role, content: c.content }));
    setConversation((prev) => [...prev, newTurnUser]);
    if (!explicitTopic) setTopic('');

    try {
      const res = await requestAITutorDetailed({
        topic: queryTopic,
        subject: effectiveSubject,
        mode,
        skillLevel,
        language,
        dataSaver,
        documentContext: documentContext.trim() || undefined,
        conversationHistory: currentHistory,
      });

      const newTurnModel: TutorTurn = {
        id: `m-${Date.now()}`,
        role: 'model',
        content: res.result,
        topicTitle: queryTopic,
        subject: effectiveSubject,
        providerLabel: `${res.providerUsed.toUpperCase()} • ${res.modelUsed}${res.fallbackFrom ? ` (Fallback from ${res.fallbackFrom})` : ''}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setConversation((prev) => [...prev, newTurnModel]);
    } catch (err: any) {
      setError(err?.message || 'AI Tutor service is unavailable. Verify your API key configuration on the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNotes = (turn: TutorTurn) => {
    if (!onAddNote) return;
    const now = new Date().toISOString();
    onAddNote({
      id: `note_tutor_${Date.now()}`,
      title: turn.topicTitle ? `${turn.topicTitle} (AI Tutor)` : `Study Note: ${turn.subject || subject}`,
      content: turn.content,
      category: 'College Subjects',
      subject: turn.subject || subject,
      isFavorite: false,
      aiGenerated: true,
      tags: ['AI Tutor', mode],
      createdAt: now,
      updatedAt: now,
    });
    setSavedNoteId(turn.id);
    setTimeout(() => setSavedNoteId(null), 2500);
  };

  const handleResetSession = () => {
    setConversation([]);
    setTopic('');
    setError(null);
    handleClearFile();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>All-Department STEM & Academic Tutor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            MakeYourMark AI Tutor
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Step-by-step teaching, examples, practice questions, exam revision & multi-turn doubt solving in 7+ languages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] px-2.5 py-1.5 text-xs">
            <Languages className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <select
              aria-label="Tutor Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              {SUPPORTED_CHAT_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-white dark:bg-zinc-900">
                  {lang.label === lang.nativeLabel ? lang.label : `${lang.label} (${lang.nativeLabel})`}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setDataSaver(!dataSaver)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              dataSaver
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Data Saver</span>
          </button>
        </div>
      </div>

      {/* Controls Card */}
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Department / Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              {academicSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {subject === 'Custom Subject / Topic' && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter your department or subject..."
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Explanation Level</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="beginner">Beginner (Simple Analogies)</option>
              <option value="intermediate">Intermediate (Exam & Engineering)</option>
              <option value="advanced">Advanced (Edge Cases & Deep Theory)</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Attach Study Material (Optional)
            </label>
            <div className="flex items-center gap-2">
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
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:border-orange-500 transition"
              >
                <Upload className="w-3.5 h-3.5 text-orange-500" />
                <span className="truncate">{uploadedFileName || 'Upload .txt / .md Notes'}</span>
              </button>
              {uploadedFileName && (
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="px-2.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 8 Learning Modes */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Learning Mode (8 Modes):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickModes.map((qm) => {
              const Icon = qm.icon;
              const isActive = mode === qm.id;
              return (
                <button
                  key={qm.id}
                  type="button"
                  onClick={() => setMode(qm.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                    isActive
                      ? 'bg-orange-500/15 border-orange-500 text-orange-700 dark:text-amber-300 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-orange-500/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-500' : 'text-zinc-400'}`} />
                  <span className="text-[11px] font-bold leading-tight">{qm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt Input */}
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-3 pt-2">
          <textarea
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={`Ask any question, paste code to explain, or request a quiz on ${subject}...`}
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500 resize-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Maintains conversation memory for follow-up questions.
            </span>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Teaching...' : 'Ask AI Tutor'}</span>
            </button>
          </div>
        </form>

        {/* Suggested Topics */}
        {suggestedTopics[subject] && conversation.length === 0 && (
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Quick examples for {subject}:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTopics[subject].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSubmit(undefined, item)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-orange-500 transition"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real Error Banner with Retry */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold mb-0.5">AI Tutor Service Unavailable</div>
            <p>{error}</p>
            <button
              onClick={() => handleSubmit(undefined, lastFailedTopic || topic)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-500"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Question
            </button>
          </div>
        </div>
      )}

      {/* Multi-turn Conversation */}
      {conversation.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Tutor Session ({Math.ceil(conversation.length / 2)} exchanges)
            </span>
            <button
              onClick={handleResetSession}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          </div>

          {conversation.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                className={`rounded-2xl p-5 border transition ${
                  isUser
                    ? 'bg-orange-500/10 border-orange-500/30 ml-4 sm:ml-12'
                    : 'bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 mr-2 sm:mr-8 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isUser
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                          : 'bg-gradient-to-br from-orange-600 to-amber-500 text-white'
                      }`}
                    >
                      {isUser ? 'Q' : 'AI'}
                    </span>
                    <span className="font-bold text-xs text-zinc-900 dark:text-white">
                      {isUser ? 'Your Question' : 'AI Tutor Response'}
                    </span>
                    {turn.providerLabel && (
                      <span className="text-[10px] text-orange-600 dark:text-amber-400 bg-orange-500/10 px-2 py-0.5 rounded font-mono">
                        {turn.providerLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">{turn.timestamp}</span>
                    {!isUser && (
                      <>
                        {onAddNote && (
                          <button
                            onClick={() => handleSaveToNotes(turn)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-amber-400 hover:underline px-2 py-1 rounded bg-orange-500/10"
                          >
                            <NotebookPen className="w-3 h-3" />
                            <span>{savedNoteId === turn.id ? 'Saved!' : 'Save to AI Notes'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(turn.id, turn.content)}
                          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700"
                        >
                          {copiedId === turn.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                  {turn.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
