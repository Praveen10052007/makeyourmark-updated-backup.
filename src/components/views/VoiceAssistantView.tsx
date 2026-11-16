import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Globe,
  Radio,
  Play,
  Pause,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Code2,
  Target,
  Sliders,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  Award,
  Layers,
  BookmarkPlus,
} from 'lucide-react';
import { requestAIChatDetailed } from '../../services/api';
import { StudyNote, SupportedLanguage, UserProfile } from '../../types';
import { SUPPORTED_CHAT_LANGUAGES, getSpeechLocale } from '../../utils/languages';
import { DevicePermissionsModal } from '../DevicePermissionsModal';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  mode?: string;
  modelUsed?: string;
}

interface VoiceQueryItem {
  id: string;
  label: string;
  prompt: string;
  category: 'jobs' | 'subjects' | 'skills' | 'skill-gap' | 'tamil';
  categoryLabel: string;
  mode: 'career' | 'study' | 'resume' | 'interview';
  badge: string;
}

interface Props {
  userProfile?: UserProfile;
  onAddNote?: (note: StudyNote) => void;
}

export const VoiceAssistantView: React.FC<Props> = ({ userProfile, onAddNote }) => {
  const activeModelLabel = userProfile?.aiSettings?.model || 'Configured AI Engine';
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        `Hello! I am your **MakeYourMark AI Voice Assistant** (${activeModelLabel}).\n\n` +
        `I am equipped to answer voice queries across **Jobs & Campus Placements**, **College Engineering Subjects**, **Tech Skills & Roadmaps**, and **Personalized Skill Gap Analysis**.\n\n` +
        (userProfile?.careerGoals?.dreamJob
          ? `I see your target goal is **${userProfile.careerGoals.dreamJob}** with **${userProfile.knownSkills.length} known skills**. Tap the microphone or select any topic below to begin!`
          : `Tap the microphone button or select any topic query below to begin talking!`),
      timestamp: 'Just now',
    },
  ]);

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(userProfile?.preferredLanguage || 'auto');
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [dataSaver, setDataSaver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Query catalog filter states
  const [activeCategory, setActiveCategory] = useState<'all' | 'jobs' | 'subjects' | 'skills' | 'skill-gap' | 'tamil'>('all');
  const [querySearch, setQuerySearch] = useState('');
  const [showQueryCatalog, setShowQueryCatalog] = useState(true);

  // References to keep callbacks current and avoid stale closures
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const voiceModeActiveRef = useRef<boolean>(voiceModeActive);
  useEffect(() => {
    voiceModeActiveRef.current = voiceModeActive;
  }, [voiceModeActive]);

  const autoSpeakRef = useRef<boolean>(autoSpeak);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Comprehensive Query Catalog: Jobs, Subjects, Skills, Skill Gap Analysis, and Tamil
  const voiceQueryCatalog: VoiceQueryItem[] = [
    // 1. JOBS & CAREERS
    {
      id: 'job-1',
      category: 'jobs',
      categoryLabel: 'Jobs & Placements',
      badge: 'Placement',
      mode: 'career',
      label: 'Zoho & TCS Hiring Rounds',
      prompt: 'What are the exact technical hiring rounds, aptitude criteria, and coding expectations for entry-level Software Engineers at Zoho and TCS?',
    },
    {
      id: 'job-2',
      category: 'jobs',
      categoryLabel: 'Jobs & Placements',
      badge: 'Internships',
      mode: 'career',
      label: 'Zero-Experience Tech Internships',
      prompt: 'How can a college student or fresher get a paid software engineering internship in India with 0 prior corporate experience?',
    },
    {
      id: 'job-3',
      category: 'jobs',
      categoryLabel: 'Jobs & Placements',
      badge: 'Salary & CTC',
      mode: 'career',
      label: 'CTC Breakdown: ₹ LPA vs $ USD',
      prompt: 'Explain the real breakdown between a 6-12 LPA domestic tech package in India versus an equivalent entry-level $70,000 remote or US package, including base pay, stock/ESOPs, and bonuses.',
    },
    {
      id: 'job-4',
      category: 'jobs',
      categoryLabel: 'Jobs & Placements',
      badge: 'HR Round',
      mode: 'interview',
      label: 'Top Campus HR Questions & Answers',
      prompt: 'What are the top 5 behavioral HR questions asked during college placement drives (like "Why this company?" and "Where do you see yourself in 5 years?"), and how should I answer them using the STAR method?',
    },
    {
      id: 'job-5',
      category: 'jobs',
      categoryLabel: 'Jobs & Placements',
      badge: 'Outreach',
      mode: 'career',
      label: 'LinkedIn & GitHub Recruiter Magnet',
      prompt: 'How do I optimize my LinkedIn profile and GitHub repositories to attract messages from tech recruiters without sending cold applications?',
    },

    // 2. COLLEGE SUBJECTS & ACADEMICS
    {
      id: 'subj-1',
      category: 'subjects',
      categoryLabel: 'College Subjects',
      badge: 'DSA',
      mode: 'study',
      label: 'B-Trees vs BST in DB Indexing',
      prompt: 'Explain B-Trees versus Binary Search Trees in Database Indexing from first principles with a practical disk-block analogy.',
    },
    {
      id: 'subj-2',
      category: 'subjects',
      categoryLabel: 'College Subjects',
      badge: 'OS',
      mode: 'study',
      label: 'Process Sync: Mutex vs Semaphore',
      prompt: 'Explain process synchronization in Operating Systems: what is the fundamental difference between a Mutex and a Counting Semaphore? Include a real-world code analogy.',
    },
    {
      id: 'subj-3',
      category: 'subjects',
      categoryLabel: 'College Subjects',
      badge: 'DBMS',
      mode: 'study',
      label: 'Database Normalization: 1NF to BCNF',
      prompt: 'Explain Database Normalization from 1NF through BCNF with a realistic student university enrollment schema, explaining why redundancy causes insertion and deletion anomalies.',
    },
    {
      id: 'subj-4',
      category: 'subjects',
      categoryLabel: 'College Subjects',
      badge: 'Networks',
      mode: 'study',
      label: 'TCP 3-Way Handshake vs UDP',
      prompt: 'Explain the TCP 3-way handshake step-by-step with SYN, SYN-ACK, ACK. Why do live video streaming and multiplayer online games use UDP instead of TCP?',
    },
    {
      id: 'subj-5',
      category: 'subjects',
      categoryLabel: 'College Subjects',
      badge: 'Electronics',
      mode: 'study',
      label: 'Basic Electronics: Transistor Logic',
      prompt: 'Explain Ohm’s Law, Kirchhoff’s Voltage/Current Laws, and how a BJT or MOSFET operates as an electronic digital switch in computer hardware.',
    },
    {
      id: 'subj-6',
      category: 'subjects',
      categoryLabel: 'College Subjects',
      badge: 'Math/AI',
      mode: 'study',
      label: 'Linear Algebra & Matrices in Machine Learning',
      prompt: 'Why are eigenvalues, eigenvectors, and matrix multiplication essential in Machine Learning algorithms like Principal Component Analysis (PCA) and Neural Networks?',
    },

    // 3. SKILLS & FRAMEWORKS
    {
      id: 'skill-1',
      category: 'skills',
      categoryLabel: 'Skills & Tech Stacks',
      badge: 'Frontend',
      mode: 'study',
      label: 'Modern React 19 & TypeScript Roadmap',
      prompt: 'What is the fastest, high-impact learning roadmap for mastering modern React, TypeScript, server state (TanStack Query), and component architecture in 2026?',
    },
    {
      id: 'skill-2',
      category: 'skills',
      categoryLabel: 'Skills & Tech Stacks',
      badge: 'Python & AI',
      mode: 'study',
      label: 'Python Data Science Core Libraries',
      prompt: 'Which core Python libraries should a computer science student master for Data Science and Machine Learning, and what specific purpose does each serve (NumPy, Pandas, Scikit-Learn, PyTorch)?',
    },
    {
      id: 'skill-3',
      category: 'skills',
      categoryLabel: 'Skills & Tech Stacks',
      badge: 'DevOps',
      mode: 'study',
      label: 'Docker Containers vs Virtual Machines',
      prompt: 'Explain Docker containerization versus Virtual Machines. Why do modern tech startups package their microservices in Docker containers with CI/CD pipelines?',
    },
    {
      id: 'skill-4',
      category: 'skills',
      categoryLabel: 'Skills & Tech Stacks',
      badge: 'Architecture',
      mode: 'study',
      label: 'System Design: Scaling, Caching & Sharding',
      prompt: 'Explain high-level system design principles: horizontal scaling vs vertical scaling, Redis caching strategies, and database sharding with simple diagrams in text.',
    },
    {
      id: 'skill-5',
      category: 'skills',
      categoryLabel: 'Skills & Tech Stacks',
      badge: 'Clean Code',
      mode: 'study',
      label: 'Top 5 Clean Code Principles',
      prompt: 'What are the top 5 clean coding principles (SOLID, DRY, KISS, meaningful naming, separation of concerns) that senior software engineers expect junior developers to practice?',
    },

    // 4. SKILL GAP & SKILL ANALYZES
    {
      id: 'gap-1',
      category: 'skill-gap',
      categoryLabel: 'Skill Gap & Analysis',
      badge: 'AI Analysis',
      mode: 'career',
      label: 'Analyze My Profile & Missing Skills',
      prompt: userProfile
        ? `Analyze my student profile for my target career goal of "${userProfile.careerGoals?.dreamJob || 'Software Developer'}". I currently know: ${userProfile.knownSkills.map((s) => `${s.name} (${s.level})`).join(', ')}. What are my high-priority missing skills and critical knowledge gaps?`
        : 'Analyze my skill gap for a Full-Stack Software Developer role. List required skills, missing gaps by High/Medium priority, and why each skill is crucial for hiring.',
    },
    {
      id: 'gap-2',
      category: 'skill-gap',
      categoryLabel: 'Skill Gap & Analysis',
      badge: 'Timetable',
      mode: 'career',
      label: '4-Week Weekly Study Timetable',
      prompt: `Create a customized 4-week weekly study timetable based on ${Math.round((userProfile?.currentActivities?.weeklyTargetHours || 21) / 7)} hours of available daily study time to master my highest-priority skill gaps step by step.`,
    },
    {
      id: 'gap-3',
      category: 'skill-gap',
      categoryLabel: 'Skill Gap & Analysis',
      badge: 'Portfolio',
      mode: 'career',
      label: '3 Standout Portfolio Project Blueprints',
      prompt: `Suggest 3 production-grade portfolio projects for ${userProfile?.careerGoals?.dreamJob || 'a Software Engineer'} that go beyond basic tutorial clones and genuinely impress engineering managers. Include tech stack and measurable metrics.`,
    },
    {
      id: 'gap-4',
      category: 'skill-gap',
      categoryLabel: 'Skill Gap & Analysis',
      badge: 'Certifications',
      mode: 'career',
      label: 'Verified Tech Certifications vs Fluff',
      prompt: 'Which technical certifications (AWS Certified Developer, Azure Fundamentals, CKA, Meta Frontend, Google Cloud) carry genuine weight with tech recruiters versus those that are ignored?',
    },
    {
      id: 'gap-5',
      category: 'skill-gap',
      categoryLabel: 'Skill Gap & Analysis',
      badge: 'Interview Prep',
      mode: 'interview',
      label: 'Gap Analysis: Interview Prep Topics',
      prompt: `Based on my target career of ${userProfile?.careerGoals?.dreamJob || 'Software Developer'}, what are the top 10 technical interview topics I must review to pass round 1 and round 2 screening interviews?`,
    },

    // 5. REGIONAL / TAMIL
    {
      id: 'ta-1',
      category: 'tamil',
      categoryLabel: 'தமிழ் (Tamil)',
      badge: 'தமிழ் Career',
      mode: 'career',
      label: 'சாப்ட்வேர் டெவலப்பர் அடிப்படை திறன்கள்',
      prompt: 'கல்லூரி மாணவர்கள் சாப்ட்வேர் டெவலப்பர் வேலை பெற முதலில் கற்க வேண்டிய 5 முக்கிய தொழில்நுட்ப திறன்கள் என்னென்ன?',
    },
    {
      id: 'ta-2',
      category: 'tamil',
      categoryLabel: 'தமிழ் (Tamil)',
      badge: 'தமிழ் Tech',
      mode: 'study',
      label: 'பைத்தான் vs ஜாவா: எது சிறந்தது?',
      prompt: 'கேம்பஸ் பிளேஸ்மென்ட் மற்றும் முதல் வேலைக்கு பைத்தான் அல்லது ஜாவா - எது சிறந்தது? இரண்டின் நன்மை மற்றும் தீமைகளை தமிழில் விளக்கவும்.',
    },
    {
      id: 'ta-3',
      category: 'tamil',
      categoryLabel: 'தமிழ் (Tamil)',
      badge: 'தமிழ் DSA',
      mode: 'study',
      label: 'டேட்டா ஸ்ட்ரக்சர்ஸ் எளிமையாக',
      prompt: 'டேட்டா ஸ்ட்ரக்சர்ஸ் (Data Structures) என்றால் என்ன? Array, Linked List, Stack மற்றும் Queue ஆகியவற்றை அன்றாட வாழ்க்கையின் உதாரணங்களுடன் தமிழில் விளக்கவும்.',
    },
    {
      id: 'ta-4',
      category: 'tamil',
      categoryLabel: 'தமிழ் (Tamil)',
      badge: 'தமிழ் Resume',
      mode: 'resume',
      label: 'ரெஸ்யூம் தயாரிக்கும் போது தவிர்க்க வேண்டிய தவறுகள்',
      prompt: 'கல்லூரி முடித்த புதியவர்கள் ரெஸ்யூம் (Resume) தயாரிக்கும் போது செய்யும் 4 பெரிய தவறுகள் என்ன, அவற்றை எப்படி சரிசெய்வது?',
    },
  ];

  // Filtered queries based on category and search text
  const filteredQueries = useMemo(() => {
    return voiceQueryCatalog.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        querySearch.trim() === '' ||
        item.label.toLowerCase().includes(querySearch.toLowerCase()) ||
        item.prompt.toLowerCase().includes(querySearch.toLowerCase()) ||
        item.badge.toLowerCase().includes(querySearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, querySearch, userProfile]);

  // Load and cache browser voices
  useEffect(() => {
    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          cachedVoicesRef.current = voices;
        }
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getSpeechLocale(language);

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);

        // Auto-send when final result is captured with sufficient length
        if (event.results && event.results[0] && event.results[0].isFinal && transcript.trim().length > 1) {
          const finalText = transcript.trim();
          handleSendMessage(finalText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone access was denied or blocked by your browser. Tap "Device Permissions" to test and unblock.');
        } else if (event.error === 'no-speech') {
          // Normal timeout when user pauses
        } else if (event.error === 'network') {
          setError('Network issue with speech recognition service. You can type your query directly.');
        } else {
          setError(`Speech input: ${event.error}. You can also click any query button or type.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Web Speech API recognition is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore abort error
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Clean and speak text with voice selection and chunking
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !autoSpeakRef.current) return;

    window.speechSynthesis.cancel(); // Cancel any current utterances

    // Clean markdown, symbols, asterisks, brackets, and code fences for clear voice articulation
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code example provided in transcript.')
      .replace(/[*#`_~[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Mobile speech synthesis is most stable when sentences are spoken in reasonable chunks (<250 chars)
    const locale = getSpeechLocale(language);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.lang = locale;

    // Pick best available voice
    const voices = cachedVoicesRef.current.length > 0 ? cachedVoicesRef.current : window.speechSynthesis.getVoices();
    const targetPrefix = locale.split('-')[0].toLowerCase();
    const matchedVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(targetPrefix));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setSpeechPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setSpeechPaused(false);

      // In continuous Voice Mode, auto-listen for follow-up question
      if (voiceModeActiveRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.lang = getSpeechLocale(language);
            recognitionRef.current.start();
          } catch (e) {
            console.warn('Could not auto-restart recognition:', e);
          }
        }, 600);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeechPlayback = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking && !speechPaused) {
      window.speechSynthesis.pause();
      setSpeechPaused(true);
    } else if (speechPaused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
    } else {
      const lastModelMsg = [...messagesRef.current].reverse().find((m) => m.role === 'model');
      if (lastModelMsg) {
        speakText(lastModelMsg.content);
      }
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setSpeechPaused(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Please use the query buttons or type your question.');
      setShowPermissionsModal(true);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current.lang = getSpeechLocale(language);
        recognitionRef.current.start();
      } catch (err: any) {
        console.warn('Start recognition error:', err);
        // If recognition was already running, stop and start cleanly
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current.start(), 200);
        } catch {
          setError('Could not start microphone. Check browser permissions.');
        }
      }
    }
  };

  const handleSendMessage = async (textToSend?: string, customMode?: 'career' | 'study' | 'resume' | 'interview') => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    // Stop microphone if currently listening
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    stopSpeaking();
    setError(null);
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: customMode,
    };

    // Use current messagesRef to prevent stale closure
    const currentMsgs = messagesRef.current;
    const updated = [...currentMsgs, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      // Determine mode based on prompt or customMode
      const determinedMode =
        customMode ||
        (prompt.toLowerCase().includes('interview')
          ? 'interview'
          : prompt.toLowerCase().includes('resume')
          ? 'resume'
          : prompt.toLowerCase().includes('job') || prompt.toLowerCase().includes('salary') || prompt.toLowerCase().includes('ctc') || prompt.toLowerCase().includes('skill gap')
          ? 'career'
          : 'study');

      const response = await requestAIChatDetailed({
        messages: updated.map((m) => ({ role: m.role, content: m.content })),
        language,
        dataSaver,
        mode: determinedMode,
        userContext: userProfile
          ? {
              name: userProfile.name,
              college: userProfile.college,
              degree: userProfile.degree,
              department: userProfile.department,
              yearOfStudy: userProfile.yearOfStudy,
              targetJob: userProfile.careerGoals?.dreamJob,
              targetCompanies: userProfile.careerGoals?.targetCompanies,
              knownSkills: userProfile.knownSkills,
              learningSkills: userProfile.learningSkills,
              wantToLearnSkills: userProfile.wantToLearnSkills,
              weeklyTargetHours: userProfile.currentActivities?.weeklyTargetHours,
            }
          : undefined,
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: determinedMode,
        modelUsed: response.modelUsed,
      };

      setMessages((prev) => [...prev, modelMsg]);

      // Speak response if autoSpeak or Voice Mode is active
      if (autoSpeakRef.current || voiceModeActiveRef.current) {
        speakText(response.reply);
      }
    } catch (err: any) {
      console.error('Voice Assistant query failure:', err);
      setError(err?.message || 'Failed to get voice assistant response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMessageToNote = (msg: Message) => {
    if (!onAddNote) return;
    const now = new Date().toISOString();
    const firstLine = msg.content.split('\n')[0].replace(/[#*`]/g, '').trim().slice(0, 70) || 'Voice Assistant Note';
    onAddNote({
      id: `note_voice_${Date.now()}`,
      title: firstLine,
      content: msg.content,
      category: msg.mode === 'career' || msg.mode === 'resume' ? 'Career Preparation' : msg.mode === 'interview' ? 'Interview Preparation' : 'College Subjects',
      subject: userProfile?.careerGoals?.dreamJob || 'Voice Session',
      isFavorite: false,
      aiGenerated: true,
      tags: ['voice-assistant', msg.mode || 'study'],
      createdAt: now,
      updatedAt: now,
    });
    setSavedNoteId(msg.id);
    setTimeout(() => setSavedNoteId(null), 2000);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    stopSpeaking();
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        content:
          language === 'ta'
            ? 'அரட்டை வரலாறு அழிக்கப்பட்டது. நீங்கள் வேலைகள், பாடங்கள் அல்லது ஸ்கில் கேப் பற்றி என்ன கேட்க விரும்புகிறீர்கள்?'
            : 'Voice session restarted. What queries related to jobs, subjects, skills, or skill gap analysis can I answer for you?',
        timestamp: 'Just now',
      },
    ]);
  };

  const handleRegenerateLast = () => {
    const currentMsgs = messagesRef.current;
    const lastUserIndex = [...currentMsgs].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualIndex = currentMsgs.length - 1 - lastUserIndex;
    const userMsg = currentMsgs[actualIndex];
    handleSendMessage(userMsg.content, userMsg.mode as any);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. TOP HEADER & AUDIO CONTROLS CARD */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-600/20">
              <Mic className={`w-6 h-6 ${isListening ? 'animate-pulse text-red-200' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
                  AI Voice Assistant
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Voice Engine
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Jobs • Engineering Subjects • Tech Stacks • Skill Gap Analysis • English & தமிழ்
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Select (Auto-Detect + 7 Languages) */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              aria-label="Voice Assistant Language"
              className="rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              {SUPPORTED_CHAT_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.nativeLabel}
                </option>
              ))}
            </select>

            {/* Auto-Speak Sound Output Toggle */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setAutoSpeak(!autoSpeak);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                autoSpeak
                  ? 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
                  : 'border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
              }`}
              title={autoSpeak ? 'Audio speech response enabled' : 'Voice response muted'}
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autoSpeak ? 'Audio On' : 'Muted'}</span>
            </button>

            {/* Device Permissions / Hardware Diagnostics */}
            <button
              onClick={() => setShowPermissionsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-orange-500/60 text-xs font-semibold transition"
              title="Test mobile microphone, camera, and device permissions"
            >
              <Smartphone className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
              <span className="hidden md:inline">Device Permissions</span>
            </button>

            {/* Data Saver Mode */}
            <button
              onClick={() => setDataSaver(!dataSaver)}
              className={`p-2 rounded-xl border transition ${
                dataSaver
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                  : 'border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
              }`}
              title={dataSaver ? 'Data Saver Active (Concise responses for 4GB RAM)' : 'Standard High-Density Mode'}
            >
              <Zap className={`w-3.5 h-3.5 ${dataSaver ? 'fill-emerald-500 text-emerald-500 dark:text-emerald-400' : ''}`} />
            </button>

            {/* Toggle Fullscreen Voice Mode Orb */}
            <button
              onClick={() => setVoiceModeActive(!voiceModeActive)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                voiceModeActive
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{voiceModeActive ? 'Exit Voice Orb' : 'Voice Mode Orb'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. VOICE MODE ORB (ChatGPT VOICE STYLE) */}
      {voiceModeActive && (
        <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-8 text-center text-white shadow-2xl">
          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 py-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-orange-400">
              Interactive Hands-Free Voice Mode
            </span>

            {/* Pulsing Visual Voice Orb */}
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute h-48 w-48 rounded-full border border-orange-400/20 transition-transform duration-700 ${
                  isSpeaking || isListening ? 'scale-125 animate-ping opacity-40' : 'scale-100 opacity-20'
                }`}
              />
              <div
                className={`absolute h-36 w-36 rounded-full bg-gradient-to-tr from-orange-500/30 to-amber-500/30 blur-xl transition-all duration-500 ${
                  isSpeaking ? 'scale-150 animate-pulse' : isListening ? 'scale-125' : 'scale-90'
                }`}
              />

              {/* Central Glowing Orb */}
              <button
                onClick={toggleListening}
                className={`relative flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-95 ${
                  isListening
                    ? 'bg-gradient-to-tr from-rose-500 to-red-500 text-white ring-8 ring-rose-500/30 shadow-rose-500/50'
                    : isSpeaking
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white ring-8 ring-emerald-500/30 shadow-emerald-500/50'
                    : loading
                    ? 'bg-gradient-to-tr from-orange-600 to-amber-600 text-white ring-8 ring-orange-500/30 animate-spin'
                    : 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white hover:scale-105 shadow-orange-600/40'
                }`}
              >
                {loading ? (
                  <Sparkles className="w-10 h-10 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-10 h-10 animate-pulse" />
                ) : isSpeaking ? (
                  <Volume2 className="w-10 h-10 animate-bounce" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
            </div>

            {/* Dynamic Status Text */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {isListening
                  ? 'Listening... Speak your question now'
                  : loading
                  ? `Thinking (${activeModelLabel})...`
                  : isSpeaking
                  ? 'Speaking response aloud...'
                  : 'Tap the orb to start speaking'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {language === 'ta'
                  ? 'தமிழில் பேசலாம்: "Zoho கேம்பஸ் இன்டர்வியூவுக்கு எப்படி தயாராவது?" அல்லது "ஸ்கில் கேப் அனலிசிஸ் செய்"'
                  : 'Ask about: "What are my skill gaps?", "Explain B-Trees vs BST", or "How to prepare for Zoho coding round?"'}
              </p>
            </div>

            {/* Orb Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold shadow-lg transition ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isListening ? 'Stop Listening' : 'Tap to Speak'}</span>
              </button>

              {isSpeaking && (
                <button
                  onClick={toggleSpeechPlayback}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 transition"
                >
                  {speechPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{speechPaused ? 'Resume Voice' : 'Pause Voice'}</span>
                </button>
              )}

              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs font-bold border border-rose-500/30 transition"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop Speech</span>
                </button>
              )}

              <button
                onClick={() => setShowPermissionsModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700 transition"
              >
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                <span>Device Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DEDICATED QUERY LIBRARY (JOBS, SUBJECTS, SKILLS, SKILL GAP ANALYZES) */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Voice Query Library</span>
                <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  {filteredQueries.length} Loaded
                </span>
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                1-tap queries for Jobs, Engineering Subjects, Tech Stacks, and Skill Gap Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQueryCatalog(!showQueryCatalog)}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition"
            >
              <span>{showQueryCatalog ? 'Collapse Library' : 'Expand Library'}</span>
              {showQueryCatalog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showQueryCatalog && (
          <div className="space-y-4">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: `All Queries (${voiceQueryCatalog.length})`, icon: Sparkles },
                  { id: 'jobs', label: 'Jobs & Placements', icon: Briefcase },
                  { id: 'subjects', label: 'College Subjects', icon: BookOpen },
                  { id: 'skills', label: 'Skills & Frameworks', icon: Code2 },
                  { id: 'skill-gap', label: 'Skill Gap & Analysis', icon: Target },
                  { id: 'tamil', label: 'தமிழ் (Tamil)', icon: Globe },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      active
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={querySearch}
                onChange={(e) => setQuerySearch(e.target.value)}
                placeholder="Filter queries by keyword (e.g. 'Zoho', 'B-Tree', 'Skill Gap', 'Docker', 'CTC')..."
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            {/* Query Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredQueries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSendMessage(item.prompt, item.mode)}
                  className="group p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:border-orange-500/50 cursor-pointer transition flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                      {item.badge}
                    </span>
                    <span className="text-[10px] text-zinc-500">{item.categoryLabel}</span>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-300 transition line-clamp-1">
                    {item.label}
                  </h3>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-400">
                    <span>Ask Voice Assistant</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN CONVERSATIONAL INTERFACE */}
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xl overflow-hidden flex flex-col h-[580px]">
        {/* Sub-header Bar with Sound Controls */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Voice Assistant Transcript</span>
            <span className="text-[10px] text-zinc-500">({messages.length} messages)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback speed selector */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              <span>Speech:</span>
              {[0.9, 1.0, 1.2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSpeechRate(rate)}
                  className={`px-1.5 py-0.5 rounded border transition ${
                    speechRate === rate
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold'
                      : 'border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Clear transcript button */}
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-800 hover:text-rose-500 hover:border-rose-500 text-zinc-500 dark:text-zinc-400 transition"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    isUser
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md'
                  }`}
                >
                  {isUser ? <Mic className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-orange-600 text-white rounded-tr-none'
                      : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {msg.content}

                  {/* Bubble Actions */}
                  <div
                    className={`mt-2 flex items-center justify-between pt-1.5 border-t text-[10px] ${
                      isUser
                        ? 'border-orange-500/50 text-orange-200'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <span>
                      {msg.timestamp}
                      {!isUser && msg.modelUsed ? ` • ${msg.modelUsed}` : ''}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!isUser && onAddNote && (
                        <button
                          onClick={() => handleSaveMessageToNote(msg)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-orange-600 dark:hover:text-orange-400 transition"
                          title="Save response to AI Notes"
                        >
                          {savedNoteId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <BookmarkPlus className="w-3 h-3" />
                          )}
                          <span>{savedNoteId === msg.id ? 'Saved' : 'Save Note'}</span>
                        </button>
                      )}

                      {/* Copy message */}
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 hover:text-orange-500 transition"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Read aloud button */}
                      {!isUser && (
                        <button
                          onClick={() => speakText(msg.content)}
                          className="p-1 hover:text-orange-500 transition"
                          title="Read aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking status */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                <span>Thinking ({activeModelLabel})...</span>
              </div>
            </div>
          )}

          <div ref={chatScrollRef} />
        </div>

        {/* Error notification with Permissions trigger */}
        {error && (
          <div className="mx-4 mb-2 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(true)}
                className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold transition"
              >
                Device Permissions
              </button>
              <button
                onClick={() => setError(null)}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Input Bar with Prominent Microphone & Dictation */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Input Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md transition active:scale-95 ${
                isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-400/40 animate-pulse'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input (Speech to Text)'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening to your voice... Speak your question now'
                  : language === 'ta'
                  ? 'வேலைகள், பாடங்கள், அல்லது ஸ்கில் கேப் பற்றி தமிழில் கேட்கவும்...'
                  : 'Ask about jobs, college subjects, skills, or skill gap analysis...'
              }
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-orange-500 focus:outline-none transition"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md disabled:opacity-40 transition active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>

            {/* Regenerate last */}
            {messages.length > 1 && (
              <button
                type="button"
                onClick={handleRegenerateLast}
                disabled={loading}
                className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-orange-500 disabled:opacity-40 transition"
                title="Regenerate last response"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Hardware & Mobile Device Permissions Modal */}
      <DevicePermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
      />
    </div>
  );
};
