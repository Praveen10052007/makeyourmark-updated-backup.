import React, { useState, useMemo } from 'react';
import {
  NotebookPen,
  Sparkles,
  Search,
  Star,
  Plus,
  Trash2,
  Edit3,
  Download,
  Check,
  FileText,
  Tag,
  Link2,
  AlertCircle,
  Loader2,
  Cloud,
} from 'lucide-react';
import {
  StudyNote,
  StudyNoteCategory,
  CareerRoadmapPlan,
  UserSession,
  LearningLanguage,
} from '../../types';
import { requestAINoteGeneration } from '../../services/api';
import { exportTextToGoogleDoc } from '../../services/firebaseClient';
import { ConfirmModal } from '../ConfirmModal';

interface Props {
  notes: StudyNote[];
  onAddNote: (note: StudyNote) => void;
  onUpdateNote: (note: StudyNote) => void;
  onDeleteNote: (noteId: string) => void;
  roadmaps?: CareerRoadmapPlan[];
  preferredLanguage?: LearningLanguage;
  session?: UserSession;
  onOpenAuthModal?: () => void;
}

const CATEGORIES: StudyNoteCategory[] = [
  'College Subjects',
  'Programming',
  'Technical Skills',
  'Career Preparation',
  'Interview Preparation',
  'Courses',
  'Personal Notes',
];

export const AINotesView: React.FC<Props> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  roadmaps = [],
  preferredLanguage = 'en',
  session,
  onOpenAuthModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || '');

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<StudyNoteCategory>('College Subjects');
  const [editSubject, setEditSubject] = useState('');
  const [editTagsText, setEditTagsText] = useState('');
  const [editLinkedSkillId, setEditLinkedSkillId] = useState('');

  // AI generator state
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiAction, setAiAction] = useState<
    'generate-from-topic' | 'generate-from-skill' | 'summarize-material' | 'revision-from-explanation' | 'interview-prep-notes'
  >('generate-from-topic');
  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceMaterial, setAiSourceMaterial] = useState('');
  const [aiCategory, setAiCategory] = useState<StudyNoteCategory>('College Subjects');
  const [aiLinkedSkillId, setAiLinkedSkillId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Confirm / Docs export modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [exportDocConfirm, setExportDocConfirm] = useState(false);
  const [docExportStatus, setDocExportStatus] = useState<{ url?: string; error?: string; loading?: boolean }>({});

  const roadmapSkills = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    roadmaps.forEach((rm) => {
      rm.stages?.forEach((st) => {
        st.skills?.forEach((sk) => {
          list.push({ id: sk.id, name: `${sk.name} (${rm.careerTitle})` });
        });
      });
    });
    return list;
  }, [roadmaps]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedCategory !== 'All' && n.category !== selectedCategory) return false;
      if (favoritesOnly && !n.isFavorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        const matchTags = n.tags.some((t) => t.toLowerCase().includes(q));
        const matchSubject = (n.subject || '').toLowerCase().includes(q);
        return matchTitle || matchContent || matchTags || matchSubject;
      }
      return true;
    });
  }, [notes, selectedCategory, favoritesOnly, searchQuery]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || null;

  const startNewNote = () => {
    setEditId(null);
    setEditTitle('');
    setEditContent('');
    setEditCategory('Personal Notes');
    setEditSubject('');
    setEditTagsText('');
    setEditLinkedSkillId('');
    setIsEditing(true);
    setShowAIGenerator(false);
  };

  const startEditNote = (note: StudyNote) => {
    setEditId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
    setEditSubject(note.subject || '');
    setEditTagsText(note.tags.join(', '));
    setEditLinkedSkillId(note.linkedSkillId || '');
    setIsEditing(true);
    setShowAIGenerator(false);
  };

  const handleSaveManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) return;
    const matchedSkill = roadmapSkills.find((s) => s.id === editLinkedSkillId);
    const now = new Date().toISOString();
    const tags = editTagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editId) {
      const existing = notes.find((n) => n.id === editId);
      if (existing) {
        onUpdateNote({
          ...existing,
          title: editTitle.trim(),
          content: editContent,
          category: editCategory,
          subject: editSubject.trim(),
          linkedSkillId: editLinkedSkillId || undefined,
          linkedSkillName: matchedSkill?.name || existing.linkedSkillName,
          tags,
          updatedAt: now,
        });
        setActiveNoteId(editId);
      }
    } else {
      const newNote: StudyNote = {
        id: `note_${Date.now()}`,
        title: editTitle.trim(),
        content: editContent,
        category: editCategory,
        subject: editSubject.trim(),
        linkedSkillId: editLinkedSkillId || undefined,
        linkedSkillName: matchedSkill?.name,
        isFavorite: false,
        aiGenerated: false,
        tags,
        createdAt: now,
        updatedAt: now,
      };
      onAddNote(newNote);
      setActiveNoteId(newNote.id);
    }
    setIsEditing(false);
  };

  const handleGenerateAINote = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSkill = roadmapSkills.find((s) => s.id === aiLinkedSkillId);
    const topicValue = aiTopic.trim() || matchedSkill?.name || '';
    if (!topicValue && !aiSourceMaterial.trim()) {
      setAiError('Enter a topic, skill, or study material to generate structured notes.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await requestAINoteGeneration({
        action: aiAction,
        topic: topicValue,
        sourceMaterial: aiSourceMaterial.trim() || undefined,
        category: aiCategory,
        skillName: matchedSkill?.name,
        language: preferredLanguage,
      });
      const now = new Date().toISOString();
      const created: StudyNote = {
        id: `note_ai_${Date.now()}`,
        title: res.title || topicValue || 'AI Study Note',
        content: res.content,
        category: res.category || aiCategory,
        subject: topicValue,
        linkedSkillId: aiLinkedSkillId || undefined,
        linkedSkillName: matchedSkill?.name,
        isFavorite: false,
        aiGenerated: true,
        tags: res.suggestedTags?.length ? res.suggestedTags : ['AI Notes', aiCategory],
        createdAt: now,
        updatedAt: now,
      };
      onAddNote(created);
      setActiveNoteId(created.id);
      setShowAIGenerator(false);
      setAiTopic('');
      setAiSourceMaterial('');
    } catch (err: any) {
      setAiError(err.message || 'AI note generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadMarkdown = (note: StudyNote) => {
    const md = `# ${note.title}\n\nCategory: ${note.category}${note.subject ? ` | Subject: ${note.subject}` : ''}\nTags: ${note.tags.join(', ')}\n\n---\n\n${note.content}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllJson = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `makeyourmark-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportToGoogleDoc = async () => {
    if (!activeNote) return;
    setExportDocConfirm(false);
    setDocExportStatus({ loading: true });
    try {
      const result = await exportTextToGoogleDoc(
        `MakeYourMark Note: ${activeNote.title}`,
        `Category: ${activeNote.category}\nTags: ${activeNote.tags.join(', ')}\n\n${activeNote.content}`
      );
      setDocExportStatus({ url: result.docUrl });
    } catch (err: any) {
      setDocExportStatus({ error: err.message || 'Could not export note to Google Docs.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold text-orange-600 dark:text-amber-400 border border-orange-500/25 mb-2">
            <NotebookPen className="w-3.5 h-3.5" /> Study Knowledge Base
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            AI Notes & Study Material
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Generate structured AI revision notes, organize study material by category, attach notes to roadmap skills, and export anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setShowAIGenerator(!showAIGenerator);
              setIsEditing(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:opacity-95 transition"
          >
            <Sparkles className="w-4 h-4" />
            Generate AI Notes
          </button>
          <button
            onClick={startNewNote}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:border-orange-500 transition"
          >
            <Plus className="w-4 h-4 text-orange-500" />
            New Note
          </button>
          <button
            onClick={handleExportAllJson}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-orange-500 transition"
            title="Download all notes as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Backup
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, topics, subjects, tags..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] pl-9 pr-3 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
              selectedCategory === 'All'
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All ({notes.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition border ${
              favoritesOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Star className="w-3 h-3 fill-current" /> Favorites
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List */}
        <div className="lg:col-span-4 space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
          {filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 text-center space-y-2">
              <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No matching notes found.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setFavoritesOnly(false);
                }}
                className="text-xs font-bold text-orange-600 dark:text-amber-400 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const selected = activeNote?.id === note.id && !isEditing && !showAIGenerator;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    setActiveNoteId(note.id);
                    setIsEditing(false);
                    setShowAIGenerator(false);
                  }}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    selected
                      ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] hover:border-orange-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">
                      {note.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNote({ ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() });
                      }}
                      aria-label="Toggle favorite"
                      className="text-zinc-400 hover:text-amber-400"
                    >
                      <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {note.category}
                    </span>
                    {note.aiGenerated && (
                      <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-amber-400">
                        AI Generated
                      </span>
                    )}
                    {note.linkedSkillName && (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 line-clamp-1">
                        Skill: {note.linkedSkillName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-2">
                    {note.content.replace(/[#*`]/g, '').slice(0, 120)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail / Editor / AI Generator */}
        <div className="lg:col-span-8">
          {showAIGenerator ? (
            <form
              onSubmit={handleGenerateAINote}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 sm:p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" /> AI Note Generator
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAIGenerator(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {aiError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Generation Mode</label>
                  <select
                    value={aiAction}
                    onChange={(e) => setAiAction(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="generate-from-topic">Notes from Topic / Syllabus</option>
                    <option value="generate-from-skill">Notes for Selected Skill</option>
                    <option value="summarize-material">Summarize Uploaded/Pasted Study Material</option>
                    <option value="revision-from-explanation">Revision Sheet & Key Formulas</option>
                    <option value="interview-prep-notes">Interview Q&A Study Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as StudyNoteCategory)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Topic / Concept Name
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Dynamic Programming, ACID Transactions, Normalization"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Attach to Roadmap Skill (Optional)
                  </label>
                  <select
                    value={aiLinkedSkillId}
                    onChange={(e) => setAiLinkedSkillId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">-- No linked skill --</option>
                    {roadmapSkills.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Source Text / Lecture Transcript / Syllabus (Optional)
                </label>
                <textarea
                  rows={5}
                  value={aiSourceMaterial}
                  onChange={(e) => setAiSourceMaterial(e.target.value)}
                  placeholder="Paste textbook paragraphs, code, lecture notes, or syllabus points to convert into clean revision notes..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={aiLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-60"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Generating Study Notes...' : 'Generate & Save Note'}
              </button>
            </form>
          ) : isEditing ? (
            <form
              onSubmit={handleSaveManualNote}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 sm:p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  {editId ? 'Edit Study Note' : 'Create New Study Note'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Operating Systems - Deadlocks & Semaphores"
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as StudyNoteCategory)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="e.g. DBMS / CS301"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Attach Roadmap Skill</label>
                  <select
                    value={editLinkedSkillId}
                    onChange={(e) => setEditLinkedSkillId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">None</option>
                    {roadmapSkills.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTagsText}
                  onChange={(e) => setEditTagsText(e.target.value)}
                  placeholder="DSA, Semester 5, Revision"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Note Content (Markdown supported)</label>
                <textarea
                  rows={12}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Write clear explanations, examples, formulas, code snippets..."
                  required
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                <Check className="w-4 h-4" /> Save Note
              </button>
            </form>
          ) : activeNote ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="rounded-lg bg-orange-500/15 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-amber-400">
                      {activeNote.category}
                    </span>
                    {activeNote.subject && (
                      <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        {activeNote.subject}
                      </span>
                    )}
                    {activeNote.linkedSkillName && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <Link2 className="w-3 h-3" /> {activeNote.linkedSkillName}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">{activeNote.title}</h2>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Last updated {new Date(activeNote.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => startEditNote(activeNote)}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDownloadMarkdown(activeNote)}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500"
                  >
                    <Download className="w-3.5 h-3.5" /> .MD
                  </button>
                  <button
                    onClick={() => {
                      if (!session?.workspaceConnected && onOpenAuthModal) {
                        onOpenAuthModal();
                      } else {
                        setExportDocConfirm(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500"
                  >
                    <Cloud className="w-3.5 h-3.5 text-orange-500" /> Google Docs
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(activeNote.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {docExportStatus.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-300">
                  {docExportStatus.error}
                </div>
              )}
              {docExportStatus.url && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <span>Note exported to Google Docs successfully.</span>
                  <a href={docExportStatus.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                    Open Document
                  </a>
                </div>
              )}

              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {activeNote.content}
              </div>

              {activeNote.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  {activeNote.tags.map((t, i) => (
                    <span key={i} className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-12 text-center space-y-3">
              <NotebookPen className="w-10 h-10 text-orange-500 mx-auto" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Select or create a study note</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Keep your college lecture summaries, coding algorithms, and interview notes organized in one place.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Study Note?"
        description="This will permanently delete the selected note from your workspace."
        confirmLabel="Delete Note"
        danger={true}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteNote(deleteConfirmId);
            if (activeNoteId === deleteConfirmId) setActiveNoteId('');
          }
          setDeleteConfirmId(null);
        }}
      />

      {/* Export to Google Docs confirmation */}
      <ConfirmModal
        isOpen={exportDocConfirm}
        title="Export Note to Google Docs?"
        description={`Create a new Google Doc titled "MakeYourMark Note: ${activeNote?.title || ''}" in your connected Google Drive?`}
        confirmLabel="Export to Google Docs"
        onCancel={() => setExportDocConfirm(false)}
        onConfirm={handleExportToGoogleDoc}
      />
    </div>
  );
};
