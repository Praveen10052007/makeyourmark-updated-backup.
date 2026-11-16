import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  AlertCircle,
  FileCheck,
  TrendingUp,
  ChevronRight,
  Smartphone,
  Sliders,
  XCircle,
  PauseCircle,
  MessageCircleQuestion,
} from 'lucide-react';
import {
  generateInterviewQuestion,
  generateInterviewFollowUp,
  clarifyInterviewQuestion,
  evaluateInterviewAnswer,
  generateInterviewScorecard,
  InterviewQuestionResponse,
  InterviewClarificationResponse,
  InterviewEvaluationResponse,
} from '../../services/api';
import { InterviewScorecard, UserProfile } from '../../types';
import { DevicePermissionsModal } from '../DevicePermissionsModal';

interface Props {
  userProfile?: UserProfile;
  onScoreRecorded?: (score: number) => void;
}

interface CompletedTurn {
  question: string;
  category: string;
  answer: string;
  evaluation: InterviewEvaluationResponse;
}

export const AIInterviewerView: React.FC<Props> = ({ userProfile, onScoreRecorded }) => {
  const [department, setDepartment] = useState(userProfile?.department || 'Computer Science & Engineering');
  const [role, setRole] = useState(userProfile?.careerGoals?.dreamJob || 'Software Developer');
  const [customRole, setCustomRole] = useState('');
  const [difficulty, setDifficulty] = useState('Entry-Level (0-2 Yrs)');
  const [interviewType, setInterviewType] = useState<'Technical' | 'HR' | 'Aptitude' | 'Behavioral' | 'Coding' | 'Mixed'>('Technical');
  const [questionCountTarget, setQuestionCountTarget] = useState<3 | 5 | 8>(5);

  const [questionData, setQuestionData] = useState<InterviewQuestionResponse | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingScorecard, setGeneratingScorecard] = useState(false);

  // Pause & Ask Clarification state (does not score or consume a question)
  const [isClarifyOpen, setIsClarifyOpen] = useState(false);
  const [clarifyLanguage, setClarifyLanguage] = useState<'en' | 'ta' | 'tanglish'>(
    userProfile?.preferredLanguage === 'ta'
      ? 'ta'
      : userProfile?.preferredLanguage === 'tanglish'
      ? 'tanglish'
      : 'en'
  );
  const [clarifyPrompt, setClarifyPrompt] = useState('');
  const [clarifying, setClarifying] = useState(false);
  const [clarificationData, setClarificationData] = useState<InterviewClarificationResponse | null>(null);

  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewEvaluationResponse | null>(null);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState('');
  const [completedTurns, setCompletedTurns] = useState<CompletedTurn[]>([]);
  const [sessionScorecard, setSessionScorecard] = useState<InterviewScorecard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const departments = [
    ...(userProfile?.department ? [userProfile.department] : []),
    'Computer Science & Engineering',
    'IT / AI & Data Science / Cybersecurity',
    'Electronics & Communication (ECE / VLSI / Embedded)',
    'Electrical & Instrumentation (EEE / E&I)',
    'Mechanical / Automobile / Mechatronics',
    'Civil / Chemical / Manufacturing',
    'Biotechnology & Biomedical',
    'Business, Finance & Non-Engineering',
  ].filter((v, i, a) => a.indexOf(v) === i);

  const roles = [
    'Software Developer',
    'Full-Stack Engineer',
    'AI / ML Engineer',
    'Data Analyst',
    'Cybersecurity Analyst',
    'Embedded / VLSI Design Engineer',
    'Electrical / Power Systems Engineer',
    'Mechanical / CAD Design Engineer',
    'Civil / Structural Site Engineer',
    'Biotech / Clinical Research Associate',
    'Product / Business Analyst',
    'Custom Target Role',
  ];

  const difficulties = ['College Fresher / Intern', 'Entry-Level (0-2 Yrs)', 'Mid-Level Engineer', 'Senior Architect'];
  const interviewTypes: ('Technical' | 'HR' | 'Aptitude' | 'Behavioral' | 'Coding' | 'Mixed')[] = [
    'Technical',
    'HR',
    'Aptitude',
    'Behavioral',
    'Coding',
    'Mixed',
  ];

  const effectiveRole = role === 'Custom Target Role' ? customRole.trim() || 'Software Developer' : role;

  const stopSpeechIfActive = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleStartQuestion = async () => {
    stopSpeechIfActive();
    setGenerating(true);
    setError(null);
    setCurrentEvaluation(null);
    setClarificationData(null);
    setIsClarifyOpen(false);
    setClarifyPrompt('');
    setUserAnswer('');

    try {
      const data = await generateInterviewQuestion(effectiveRole, difficulty, interviewType, askedQuestions, department);
      setQuestionData(data);
      setAskedQuestions((prev) => [...prev, data.question]);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate interview question. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAskFollowUp = async () => {
    if (!questionData || !lastSubmittedAnswer) return;
    stopSpeechIfActive();
    setGenerating(true);
    setError(null);
    setCurrentEvaluation(null);
    setClarificationData(null);
    setIsClarifyOpen(false);
    setClarifyPrompt('');
    setUserAnswer('');

    try {
      const data = await generateInterviewFollowUp({
        role: effectiveRole,
        department,
        difficulty,
        category: interviewType,
        previousQuestion: questionData.question,
        userAnswer: lastSubmittedAnswer,
        previousQuestions: askedQuestions,
      });
      setQuestionData(data);
      setAskedQuestions((prev) => [...prev, data.question]);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate contextual follow-up question.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAskClarification = async () => {
    if (!questionData) return;
    setClarifying(true);
    setError(null);
    try {
      const res = await clarifyInterviewQuestion({
        question: questionData.question,
        clarificationRequest: clarifyPrompt.trim() || undefined,
        clarificationLanguage: clarifyLanguage,
        role: effectiveRole,
        department,
        difficulty,
        category: questionData.category,
      });
      setClarificationData(res);
    } catch (err: any) {
      setError(err?.message || 'Could not retrieve question clarification.');
    } finally {
      setClarifying(false);
    }
  };

  const handleSpeechToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Type your response below.');
      return;
    }
    if (isListening) {
      stopSpeechIfActive();
      return;
    }
    try {
      setError(null);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        setIsListening(false);
        setError(`Speech input notice: ${event?.error || 'Check microphone permission'}.`);
      };
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setError('Could not access microphone.');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!questionData || !userAnswer.trim()) return;
    stopSpeechIfActive();
    setEvaluating(true);
    setError(null);
    const trimmedAnswer = userAnswer.trim();

    try {
      const evalResult = await evaluateInterviewAnswer(
        effectiveRole,
        difficulty,
        questionData.question,
        trimmedAnswer,
        interviewType,
        department
      );
      setCurrentEvaluation(evalResult);
      setLastSubmittedAnswer(trimmedAnswer);

      const turn: CompletedTurn = {
        question: questionData.question,
        category: questionData.category,
        answer: trimmedAnswer,
        evaluation: evalResult,
      };
      setCompletedTurns((prev) => [...prev, turn]);

      if (onScoreRecorded && evalResult.score) {
        onScoreRecorded(evalResult.score);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate interview answer.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleFinishSession = async () => {
    if (completedTurns.length === 0) return;
    setGeneratingScorecard(true);
    setError(null);
    try {
      const scorecard = await generateInterviewScorecard({
        role: effectiveRole,
        difficulty,
        interviewHistory: completedTurns.map((t) => ({
          question: t.question,
          answer: t.answer,
          score: t.evaluation.score,
          grade: t.evaluation.grade,
          category: t.category,
        })),
      });
      setSessionScorecard(scorecard);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate session scorecard.');
    } finally {
      setGeneratingScorecard(false);
    }
  };

  const handleResetSession = () => {
    setQuestionData(null);
    setAskedQuestions([]);
    setCurrentEvaluation(null);
    setUserAnswer('');
    setCompletedTurns([]);
    setSessionScorecard(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Mic className="w-4 h-4" />
            <span>AI Interview Trainer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            AI Interview Simulator & Critique
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Practice Technical, HR, Aptitude, Coding, Behavioral, or Mixed rounds with non-repeating questions and rubric feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-orange-500 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Device Permissions</span>
          </button>

          {completedTurns.length > 0 && !sessionScorecard && (
            <button
              onClick={handleFinishSession}
              disabled={generatingScorecard}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{generatingScorecard ? 'Scoring...' : 'View Scorecard'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Config */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Department / Stream</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {departments.map((dep) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Interview Type</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as any)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {interviewTypes.map((t) => (
                <option key={t} value={t}>{t} Round</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Questions in Session</label>
            <select
              value={questionCountTarget}
              onChange={(e) => setQuestionCountTarget(Number(e.target.value) as 3 | 5 | 8)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              <option value={3}>3 Questions (Quick Drill)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={8}>8 Questions (Full Round)</option>
            </select>
          </div>
        </div>

        {role === 'Custom Target Role' && (
          <input
            type="text"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Enter custom target job role..."
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
        )}

        {!questionData && !sessionScorecard && (
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Non-repeating AI questions tailored for {effectiveRole}
            </span>
            <button
              onClick={handleStartQuestion}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Drafting Question...' : 'Start Interview'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-[11px] font-bold"
          >
            <Sliders className="w-3 h-3" /> Permissions
          </button>
        </div>
      )}

      {/* Active Question */}
      {questionData && !sessionScorecard && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-amber-400 text-[11px] font-bold">
                Question {Math.min(completedTurns.length + 1, questionCountTarget)} of {questionCountTarget}
              </span>
              {questionData.isFollowUp && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  Follow-up Probe
                </span>
              )}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">• {questionData.category}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsClarifyOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                isClarifyOpen
                  ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-orange-500'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5 text-orange-500" />
              <span>Pause & Ask Clarification (EN / தமிழ் / Tanglish)</span>
            </button>
          </div>

          <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-relaxed">
            {questionData.question}
          </div>

          {/* Non-penalizing Pause & Ask Clarification Drawer */}
          {isClarifyOpen && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <MessageCircleQuestion className="w-4 h-4" />
                  <span>Interview Paused — Question Clarification (Not Scored)</span>
                </div>
                <div className="inline-flex rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 p-0.5 text-[11px] font-bold">
                  {([
                    { id: 'en', label: 'English' },
                    { id: 'ta', label: 'தமிழ்' },
                    { id: 'tanglish', label: 'Tanglish' },
                  ] as const).map((langOpt) => (
                    <button
                      key={langOpt.id}
                      type="button"
                      onClick={() => setClarifyLanguage(langOpt.id)}
                      className={`px-2.5 py-1 rounded-md transition ${
                        clarifyLanguage === langOpt.id
                          ? 'bg-orange-600 text-white'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {langOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={clarifyPrompt}
                  onChange={(e) => setClarifyPrompt(e.target.value)}
                  placeholder="Optional: ask what confused you (e.g., 'what does trade-off mean?' or 'intha question enna kekudhu?')"
                  className="flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAskClarification}
                  disabled={clarifying}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap"
                >
                  {clarifying ? 'Explaining...' : 'Clarify Question'}
                </button>
              </div>

              {clarificationData && (
                <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{clarificationData.explanation}</p>
                  {clarificationData.hints?.length > 0 && (
                    <div>
                      <div className="font-bold text-orange-600 dark:text-amber-400 mb-1">Helpful Hints:</div>
                      <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-300 space-y-0.5">
                        {clarificationData.hints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {clarificationData.exampleStructure && (
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <strong className="text-zinc-700 dark:text-zinc-200">Suggested Answer Structure: </strong>
                      {clarificationData.exampleStructure}
                    </div>
                  )}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsClarifyOpen(false)}
                      className="text-xs font-bold text-orange-600 dark:text-amber-400 hover:underline"
                    >
                      Resume Answering Question
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {questionData.keyAspectsToLookFor?.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Evaluation Criteria</span>
              </div>
              <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5">
                {questionData.keyAspectsToLookFor.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Your Answer</label>
              <button
                type="button"
                onClick={handleSpeechToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  isListening
                    ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Stop Voice Dictate' : 'Voice Dictate'}</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Explain concepts clearly, mention trade-offs or STAR details..."
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 resize-none"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleStartQuestion}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Skip Question
              </button>

              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={evaluating || !userAnswer.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
                <span>{evaluating ? 'Evaluating...' : 'Submit Answer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Breakdown */}
      {currentEvaluation && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span className="font-extrabold text-sm text-zinc-900 dark:text-white">Rubric Feedback</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-amber-400">
                {currentEvaluation.grade}
              </span>
              <span className="text-xl font-black text-orange-600 dark:text-amber-400">
                {currentEvaluation.score} / 100
              </span>
            </div>
          </div>

          {currentEvaluation.constructiveFeedback && (
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {currentEvaluation.constructiveFeedback}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct Points
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {(currentEvaluation.correctPoints || currentEvaluation.strengths || []).map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Missing Information
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {(currentEvaluation.missingInformation || currentEvaluation.areasForImprovement || []).map((m, idx) => (
                  <li key={idx}>• {m}</li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Mistakes / Gaps
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {(currentEvaluation.mistakes?.length ? currentEvaluation.mistakes : currentEvaluation.areasForImprovement || []).map((m, idx) => (
                  <li key={idx}>• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          {currentEvaluation.idealAnswerSummary && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1">
              <div className="text-xs font-bold text-orange-600 dark:text-amber-400">Model / Stronger Answer Outline</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{currentEvaluation.idealAnswerSummary}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-xs text-zinc-500">
              Completed {completedTurns.length} / {questionCountTarget} questions
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {completedTurns.length < questionCountTarget && (
                <>
                  <button
                    type="button"
                    onClick={handleAskFollowUp}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-amber-300 text-xs font-bold hover:bg-orange-500/20 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generating ? 'Thinking...' : 'Ask Follow-Up Question'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartQuestion}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold disabled:opacity-50"
                  >
                    <span>Next New Question</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleFinishSession}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Generate Final Scorecard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard */}
      {sessionScorecard && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-7 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-orange-600 dark:text-amber-400">Final Assessment</span>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Interview Session Scorecard</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-600 dark:text-amber-400">{sessionScorecard.overallScore} / 100</div>
              <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{sessionScorecard.readinessGrade}</div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{sessionScorecard.executiveSummary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Strengths</div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {sessionScorecard.topStrengths?.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-orange-600 dark:text-amber-400">Areas to Focus</div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {sessionScorecard.areasToFocus?.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
          </div>

          {sessionScorecard.recommendedStudyActions?.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" /> Next Preparation Actions
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {sessionScorecard.recommendedStudyActions.map((act, idx) => (
                  <li key={idx}>{idx + 1}. {act}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleResetSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start New Interview
            </button>
          </div>
        </div>
      )}

      <DevicePermissionsModal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} />
    </div>
  );
};
