import React, { useState } from 'react';
import {
  Share2,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Users,
  Briefcase,
  Lightbulb,
  Cloud,
  FileText,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { StudyNote, UserProfile, UserSession } from '../../types';
import { requestLinkedInAssist, LinkedInAssistResponse } from '../../services/api';
import {
  DriveFileSummary,
  deleteDriveFile,
  exportTextToGoogleDoc,
  getWorkspaceAccessToken,
  listAppDriveFiles,
} from '../../services/firebaseClient';
import { ConfirmModal } from '../ConfirmModal';

interface Props {
  userProfile: UserProfile;
  session?: UserSession;
  studyNotes?: StudyNote[];
  onOpenAuthModal?: () => void;
}

export const LinkedInView: React.FC<Props> = ({
  userProfile,
  session,
  studyNotes = [],
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'headline' | 'about' | 'outreach'>('headline');
  const [targetRole, setTargetRole] = useState(userProfile.careerGoals.dreamJob || 'Software Development Engineer');
  const [studentDetails, setStudentDetails] = useState(
    `${userProfile.name}, ${userProfile.yearOfStudy} ${userProfile.degree} at ${userProfile.college}. Stack: ${userProfile.knownSkills
      .map((s) => s.name)
      .join(', ')}. Target Companies: ${userProfile.careerGoals.targetCompanies.join(', ')}.`
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkedInAssistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Google Workspace Hub states
  const [driveFiles, setDriveFiles] = useState<DriveFileSummary[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(studyNotes[0]?.id || '');
  const [workspaceStatus, setWorkspaceStatus] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);
  const [confirmDocExport, setConfirmDocExport] = useState<{ title: string; body: string } | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveFileSummary | null>(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);

  const hasWorkspaceToken = Boolean(getWorkspaceAccessToken());

  const handleGenerate = async (tab: 'headline' | 'about' | 'outreach') => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestLinkedInAssist(tab, targetRole, studentDetails);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate LinkedIn copy.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRefreshDrive = async () => {
    if (!getWorkspaceAccessToken()) {
      setWorkspaceStatus({
        type: 'error',
        text: 'Sign in with Google Workspace first to view app-created Drive files.',
      });
      onOpenAuthModal?.();
      return;
    }
    setLoadingDrive(true);
    setWorkspaceStatus(null);
    try {
      const files = await listAppDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      setWorkspaceStatus({ type: 'error', text: err?.message || 'Failed to list Google Drive files.' });
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleConfirmDocExport = async () => {
    if (!confirmDocExport) return;
    setWorkspaceBusy(true);
    setWorkspaceStatus(null);
    try {
      const doc = await exportTextToGoogleDoc(confirmDocExport.title, confirmDocExport.body);
      setConfirmDocExport(null);
      setWorkspaceStatus({
        type: 'success',
        text: `Created Google Doc "${doc.title}".`,
        url: doc.docUrl,
      });
      if (getWorkspaceAccessToken()) {
        listAppDriveFiles().then(setDriveFiles).catch(() => {});
      }
    } catch (err: any) {
      setConfirmDocExport(null);
      setWorkspaceStatus({ type: 'error', text: err?.message || 'Export to Google Docs failed.' });
    } finally {
      setWorkspaceBusy(false);
    }
  };

  const handleConfirmDeleteDrive = async () => {
    if (!confirmDeleteFile) return;
    setWorkspaceBusy(true);
    setWorkspaceStatus(null);
    try {
      await deleteDriveFile(confirmDeleteFile.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== confirmDeleteFile.id));
      setWorkspaceStatus({ type: 'success', text: `Deleted "${confirmDeleteFile.name}" from Drive.` });
      setConfirmDeleteFile(null);
    } catch (err: any) {
      setConfirmDeleteFile(null);
      setWorkspaceStatus({ type: 'error', text: err?.message || 'Failed to delete Drive file.' });
    } finally {
      setWorkspaceBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Share2 className="w-4 h-4" />
            <span>Career Networking & Workspace Cloud Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            LinkedIn & Google Workspace Suite
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Craft recruiter-ready LinkedIn copy, search entry roles, and export documents directly to Google Docs & Drive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(targetRole)}&f_E=1%2C2`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/40 px-3 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition shadow-sm"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Entry Jobs on LinkedIn</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* GOOGLE WORKSPACE & CLOUD SYNC HUB */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Google Workspace & Cloud Sync
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {session?.emailVerified
                  ? `Signed in (${session.email}) • Firestore Cloud Sync Active`
                  : 'Sign in with Google Workspace to export Study Notes & LinkedIn summaries to Google Docs and manage app Drive files.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasWorkspaceToken && onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Connect Google Workspace</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRefreshDrive}
              disabled={loadingDrive}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
              <span>{loadingDrive ? 'Loading Drive...' : 'List My Drive Docs'}</span>
            </button>
          </div>
        </div>

        {workspaceStatus && (
          <div
            className={`rounded-xl border p-3 text-xs flex flex-wrap items-center justify-between gap-2 ${
              workspaceStatus.type === 'error'
                ? 'border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200'
                : 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {workspaceStatus.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{workspaceStatus.text}</span>
            </div>
            {workspaceStatus.url && (
              <a
                href={workspaceStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold underline"
              >
                <span>Open in Google Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Quick Export Study Note to Google Docs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={selectedNoteId}
            onChange={(e) => setSelectedNoteId(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
          >
            {studyNotes.length === 0 && <option value="">No AI Notes saved yet</option>}
            {studyNotes.map((n) => (
              <option key={n.id} value={n.id}>
                Note: {n.title} ({n.category})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedNoteId}
            onClick={() => {
              const note = studyNotes.find((n) => n.id === selectedNoteId);
              if (!note) return;
              if (!getWorkspaceAccessToken()) {
                setWorkspaceStatus({
                  type: 'error',
                  text: 'Connect Google Workspace first to export a Study Note to Google Docs.',
                });
                onOpenAuthModal?.();
                return;
              }
              setConfirmDocExport({
                title: note.title,
                body: `${note.title}\nCategory: ${note.category}\nTags: ${note.tags.join(', ')}\n\n${note.content}`,
              });
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-40 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Note to Google Docs</span>
          </button>
        </div>

        {/* App-created Drive Files List */}
        {driveFiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Recent MakeYourMark Drive Documents ({driveFiles.length})
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {driveFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="font-semibold text-zinc-900 dark:text-white truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 dark:text-sky-400 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteFile(file)}
                      className="text-zinc-400 hover:text-rose-500 p-1"
                      title="Delete file from Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LINKEDIN TABS */}
      <div className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-1.5 border border-zinc-200 dark:border-zinc-800">
        {(
          [
            { id: 'headline', label: '1. Headline Generator' },
            { id: 'about', label: "2. 'About' Summary" },
            { id: 'outreach', label: '3. Outreach Notes' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              setResult(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
              activeTab === t.id
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input parameters card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
              Target Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Associate Software Engineer"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
              Student Context & Skills
            </label>
            <input
              type="text"
              value={studentDetails}
              onChange={(e) => setStudentDetails(e.target.value)}
              placeholder="Degree, year, key technical skills, target companies"
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {activeTab === 'headline' && 'Generates 3 recruiter-optimized headlines.'}
            {activeTab === 'about' && 'Creates a 3-paragraph authentic profile summary.'}
            {activeTab === 'outreach' && 'Crafts concise connection requests under 300 characters.'}
          </span>

          <button
            onClick={() => handleGenerate(activeTab)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition disabled:opacity-50 active:scale-95"
          >
            <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {loading
                ? 'Crafting Copy...'
                : `Generate ${
                    activeTab === 'headline' ? 'Headlines' : activeTab === 'about' ? 'About Section' : 'Outreach Note'
                  }`}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* RESULTS DISPLAY */}
      {result && (
        <div className="space-y-4">
          {result.tip && (
            <div className="rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-orange-800 dark:text-orange-200">AI Career Coach Advice</span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">{result.tip}</p>
              </div>
            </div>
          )}

          {activeTab === 'headline' && result.headlines && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Recommended Headline Styles</h3>
              {result.headlines.map((hl, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-100 flex-1">{hl}</p>
                  <button
                    onClick={() => copyToClipboard(hl, `hl-${idx}`)}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-orange-500 transition shrink-0 self-end sm:self-center"
                  >
                    {copiedKey === `hl-${idx}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Headline</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'about' && result.about && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Your LinkedIn Summary</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!getWorkspaceAccessToken()) {
                        setWorkspaceStatus({
                          type: 'error',
                          text: 'Connect Google Workspace first to save this summary as a Google Doc.',
                        });
                        onOpenAuthModal?.();
                        return;
                      }
                      setConfirmDocExport({
                        title: `LinkedIn About Summary - ${targetRole}`,
                        body: result.about!,
                      });
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Save to Google Docs</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(result.about!, 'about')}
                    className="flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
                  >
                    {copiedKey === 'about' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy About</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {result.about}
              </div>

              {result.keyHighlights && (
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Key Highlights:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {result.keyHighlights.map((hl, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60 px-2 py-0.5 text-xs text-orange-700 dark:text-orange-300"
                      >
                        {hl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'outreach' && result.message && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    LinkedIn Connection Note
                  </span>
                  <span className="ml-2 text-[11px] text-zinc-500">
                    ({result.message.length}/300 chars)
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(result.message!, 'outreach')}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition"
                >
                  {copiedKey === 'outreach' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Note</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 font-mono text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {result.message}
              </div>

              {result.alternativeSubject && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Recommended Email Subject: </span>
                  {result.alternativeSubject}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Networking Best Practices Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <span>Networking Best Practices</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-900 dark:text-white block mb-1">1. Connect with Alumni First</span>
            Seniors from your university ({userProfile.college || 'your campus'}) often respond readily to thoughtful questions.
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-900 dark:text-white block mb-1">2. Add Personal Context</span>
            State shared coursework, a project you admired, or why their engineering team caught your eye.
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-900 dark:text-white block mb-1">3. Ask for Advice First</span>
            Start by asking about preparation or team challenges before asking for referrals.
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmDocExport)}
        title="Export to Google Docs?"
        description={`Create a new Google Doc titled "${confirmDocExport?.title || ''}" in your Google Drive?`}
        confirmLabel="Create Google Doc"
        isLoading={workspaceBusy}
        onConfirm={handleConfirmDocExport}
        onCancel={() => setConfirmDocExport(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteFile)}
        title="Delete Google Drive File?"
        description={`Permanently delete "${confirmDeleteFile?.name || ''}" from your Google Drive?`}
        confirmLabel="Delete File"
        danger
        isLoading={workspaceBusy}
        onConfirm={handleConfirmDeleteDrive}
        onCancel={() => setConfirmDeleteFile(null)}
      />
    </div>
  );
};
