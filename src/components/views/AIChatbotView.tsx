import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  Trash2,
  AlertCircle,
  Zap,
  Mic,
  MicOff,
  Copy,
  Check,
  Globe,
  FileText,
  BookOpen,
  Briefcase,
  FileCheck2,
  Users2,
  NotebookPen,
  Info,
  Languages,
} from 'lucide-react';
import { requestAIChatDetailed } from '../../services/api';
import { UserProfile, StudyNote, SupportedLanguage } from '../../types';
import { SUPPORTED_CHAT_LANGUAGES, getSpeechLocale } from '../../utils/languages';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  mode?: 'study' | 'career' | 'resume' | 'interview';
  providerLabel?: string;
  websiteFetchInfo?: {
    url: string;
    status: 'fetched' | 'failed';
    title?: string;
    message: string;
  } | null;
  timestamp: string;
}

interface Props {
  userProfile?: UserProfile;
  onAddNote?: (note: StudyNote) => void;
}

export const AIChatbotView: React.FC<Props> = ({ userProfile, onAddNote }) => {
  const [mode, setMode] = useState<'study' | 'career' | 'resume' | 'interview'>('career');
  const [language, setLanguage] = useState<SupportedLanguage>('auto');
  const [dataSaver, setDataSaver] = useState(userProfile?.dataSaverMode || false);
  const saveHistory = userProfile?.privacySettings?.saveChatHistory !== false;

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [documentSnippet, setDocumentSnippet] = useState('');
  const [showDocInput, setShowDocInput] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (saveHistory) {
      const saved = localStorage.getItem('mym_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [
      {
        id: 'welcome',
        role: 'model',
        content:
          'Welcome to the **MakeYourMark AI Assistant**. Ask questions across college academics, algorithms, roadmaps, resume bullets, or interview prep. Use Study, Career, Resume, or Interview modes above.',
        timestamp: 'Just now',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saveHistory) {
      localStorage.setItem('mym_chat_history', JSON.stringify(messages));
    }
  }, [messages, saveHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getSpeechLocale(language === 'auto' ? (userProfile?.preferredLanguage || 'en') : language);
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [language, userProfile?.preferredLanguage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Microphone speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setError(null);
        recognitionRef.current.lang = getSpeechLocale(language === 'auto' ? (userProfile?.preferredLanguage || 'en') : language);
        recognitionRef.current.start();
      } catch {
        setError('Could not start microphone.');
      }
    }
  };

  const handleSend = async (overrideText?: string, isRetry = false) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend || loading) return;

    setError(null);
    setLastFailedPrompt(textToSend);

    let nextMessages = messages;
    const lastMsg = messages[messages.length - 1];
    if (!isRetry || !lastMsg || lastMsg.role !== 'user' || lastMsg.content !== textToSend) {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: textToSend,
        mode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
    }
    if (!isRetry) setInput('');
    setLoading(true);

    try {
      const res = await requestAIChatDetailed({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        mode,
        language,
        dataSaver,
        userContext: userProfile
          ? {
              department: userProfile.department,
              targetRole: userProfile.careerGoals?.dreamJob,
              knownSkills: userProfile.knownSkills?.map((s) => s.name),
              interests: userProfile.interests,
              degree: userProfile.degree,
              yearOfStudy: userProfile.yearOfStudy,
              careerGoals: userProfile.careerGoals?.shortTermGoals,
            }
          : undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        documentSnippet: documentSnippet.trim() || undefined,
      });

      const modelMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        content: res.reply,
        mode,
        providerLabel: res.providerUsed ? `${res.providerUsed.toUpperCase()} • ${res.modelUsed}` : undefined,
        websiteFetchInfo: res.websiteFetchInfo || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...nextMessages, modelMsg]);
      if (websiteUrl) setWebsiteUrl('');
      if (documentSnippet) setDocumentSnippet('');
    } catch (err: any) {
      setError(err?.message || 'Failed to get AI response. Check server connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('mym_chat_history');
    setMessages([
      {
        id: 'welcome-cleared',
        role: 'model',
        content: 'Conversation history cleared. How can I assist your studies or career today?',
        timestamp: 'Just now',
      },
    ]);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNotes = (msg: ChatMessage) => {
    if (!onAddNote) return;
    const now = new Date().toISOString();
    onAddNote({
      id: `note_chat_${Date.now()}`,
      title: `AI Advisor Note (${msg.mode || mode})`,
      content: msg.content,
      category: msg.mode === 'interview' ? 'Interview Preparation' : msg.mode === 'study' ? 'College Subjects' : 'Career Preparation',
      isFavorite: false,
      aiGenerated: true,
      tags: ['AI Chat', msg.mode || mode],
      createdAt: now,
      updatedAt: now,
    });
    setSavedNoteId(msg.id);
    setTimeout(() => setSavedNoteId(null), 2500);
  };

  const starterPrompts = {
    career: [
      'What skills do I need for an entry-level role in my department?',
      'bro fresher job kidaika 6 month plan sollu (Tanglish)',
    ],
    study: [
      'Explain DBMS normalization 1NF 2NF 3NF simple example',
      'Explain PID controller or MOSFET switching step by step',
    ],
    resume: [
      'Rewrite a college project bullet using measurable impact.',
      'What sections make an ATS-friendly fresher resume?',
    ],
    interview: [
      'Give me a technical + HR screening prompt for freshers.',
      'How do I answer "Tell me about a difficult project challenge"?',
    ],
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" />
            <span>Multilingual Friendly AI Mentor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            MakeYourMark AI Chatbox
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Supports English, தமிழ், Tanglish, हिन्दी, తెలుగు, മലയാളം, ಕನ್ನಡ & Auto-Detect. {saveHistory ? 'History saved locally.' : 'Privacy mode active.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] px-2.5 py-1.5 text-xs">
            <Languages className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <select
              aria-label="Response Language"
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
            onClick={handleClearHistory}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-xs text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#18181b] p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          {[
            { id: 'career', label: 'Career', icon: Briefcase },
            { id: 'study', label: 'Study', icon: BookOpen },
            { id: 'resume', label: 'Resume', icon: FileCheck2 },
            { id: 'interview', label: 'Interview', icon: Users2 },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  mode === m.id ? 'bg-orange-600 text-white' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              websiteUrl || showUrlInput
                ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-amber-300 font-bold'
                : 'bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Analyze URL</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDocInput(!showDocInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              documentSnippet || showDocInput
                ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-amber-300 font-bold'
                : 'bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>

          <button
            type="button"
            onClick={() => setDataSaver(!dataSaver)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              dataSaver
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                : 'bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showUrlInput && (
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl flex items-center gap-2">
          <Globe className="w-4 h-4 text-orange-500 shrink-0" />
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Enter public https:// documentation or article URL to fetch & summarize..."
            className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
          {websiteUrl && (
            <button onClick={() => setWebsiteUrl('')} className="text-xs text-zinc-500 px-2">Clear</button>
          )}
        </div>
      )}

      {showDocInput && (
        <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl space-y-2">
          <textarea
            rows={3}
            value={documentSnippet}
            onChange={(e) => setDocumentSnippet(e.target.value)}
            placeholder="Paste syllabus text, code snippet, or study material here..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>
      )}

      {/* Messages Feed */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-[#141417] p-4 sm:p-6 space-y-4 min-h-[380px] max-h-[580px] overflow-y-auto">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' : 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2 shadow-xs ${
                  isUser
                    ? 'bg-orange-600 text-white'
                    : 'bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                <div className={`flex items-center justify-between gap-3 text-[10px] border-b pb-1 ${isUser ? 'border-orange-500 text-orange-100' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                  <span>{isUser ? 'You' : m.providerLabel || 'Advisor'}</span>
                  <div className="flex items-center gap-2">
                    <span>{m.timestamp}</span>
                    {!isUser && (
                      <>
                        {onAddNote && (
                          <button
                            type="button"
                            onClick={() => handleSaveToNotes(m)}
                            className="text-orange-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <NotebookPen className="w-3 h-3" />
                            <span>{savedNoteId === m.id ? 'Saved' : 'Save Note'}</span>
                          </button>
                        )}
                        <button onClick={() => handleCopy(m.id, m.content)} title="Copy">
                          {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {m.websiteFetchInfo && (
                  <div
                    className={`rounded-lg p-2 text-[11px] flex items-start gap-1.5 border ${
                      m.websiteFetchInfo.status === 'fetched'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{m.websiteFetchInfo.message}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-2xl text-xs text-zinc-500 dark:text-zinc-400">
              Generating grounded guidance...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-1.5">
          {starterPrompts[mode]?.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="text-left text-[11px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-orange-500 transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => handleSend(lastFailedPrompt, true)}
            className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold text-xs"
          >
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 rounded-xl border transition ${
            isListening
              ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
              : 'bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-orange-500'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask in ${mode} mode...`}
          className="flex-1 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
