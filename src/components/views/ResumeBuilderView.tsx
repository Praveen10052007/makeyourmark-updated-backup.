import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  Eye,
  Wand2,
  Layout,
  UserCheck,
  AlertCircle,
  RotateCcw,
  Cloud,
  ExternalLink,
  Award,
  Globe,
  Download,
} from 'lucide-react';
import { ResumeData, UserProfile, UserSession } from '../../types';
import { INITIAL_RESUME } from '../../data/mockData';
import { coachResumeSummary, coachResumeBullets, coachResumeSkills } from '../../services/api';
import { downloadResumePdf } from '../../utils/resumePdf';
import {
  exportTextToGoogleDoc,
  getWorkspaceAccessToken,
  syncResumeToFirestore,
} from '../../services/firebaseClient';
import { ConfirmModal } from '../ConfirmModal';

interface Props {
  userProfile?: UserProfile;
  session?: UserSession;
  onOpenAuthModal?: () => void;
}

export type ResumeTemplateType =
  | 'ats-classic'
  | 'modern-pro'
  | 'modern-fresher'
  | 'software-engineer'
  | 'college-intern'
  | 'experienced-pro';

function formatResumeAsPlainText(resume: ResumeData, targetRole: string): string {
  const lines: string[] = [
    resume.personalInfo.fullName || 'Candidate Name',
    targetRole,
    [
      resume.personalInfo.email,
      resume.personalInfo.phone,
      resume.personalInfo.location,
      resume.personalInfo.linkedinUrl,
      resume.personalInfo.githubUrl || resume.personalInfo.portfolioUrl,
    ]
      .filter(Boolean)
      .join(' | '),
    '',
  ];

  if (resume.summary) {
    lines.push('SUMMARY', resume.summary, '');
  }

  if (resume.skills?.length) {
    lines.push('SKILLS');
    resume.skills.forEach((s) => lines.push(`- ${s.category}: ${s.items}`));
    lines.push('');
  }

  if (resume.experience?.length) {
    lines.push('EXPERIENCE');
    resume.experience.forEach((exp) => {
      lines.push(`${exp.title} — ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})`);
      exp.bullets.forEach((b) => lines.push(`  • ${b}`));
    });
    lines.push('');
  }

  if (resume.projects?.length) {
    lines.push('PROJECTS');
    resume.projects.forEach((p) => {
      lines.push(`${p.name} (${p.technologies})`);
      if (p.description) lines.push(`  ${p.description}`);
    });
    lines.push('');
  }

  if (resume.education?.length) {
    lines.push('EDUCATION');
    resume.education.forEach((edu) => {
      lines.push(`${edu.degree} — ${edu.institution} (${edu.graduationYear})${edu.gpa ? ` | ${edu.gpa}` : ''}`);
    });
    lines.push('');
  }

  if (resume.certifications?.length) {
    lines.push('CERTIFICATIONS');
    resume.certifications.forEach((c) => lines.push(`- ${c.name} (${c.issuer}, ${c.year})`));
    lines.push('');
  }

  if (resume.achievements?.length) {
    lines.push('ACHIEVEMENTS');
    resume.achievements.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  if (resume.languages?.length) {
    lines.push(`LANGUAGES: ${resume.languages.join(', ')}`);
  }

  return lines.join('\n');
}

function formatResumeAsMarkdown(resume: ResumeData, targetRole: string): string {
  const parts: string[] = [
    `# ${resume.personalInfo.fullName || 'Candidate Name'}`,
    `**${targetRole}**`,
    [
      resume.personalInfo.email,
      resume.personalInfo.phone,
      resume.personalInfo.location,
      resume.personalInfo.portfolioUrl,
      resume.personalInfo.linkedinUrl,
      resume.personalInfo.githubUrl,
    ]
      .filter(Boolean)
      .join(' | '),
  ];

  if (resume.summary) {
    parts.push(`\n## Professional Summary\n${resume.summary}`);
  }
  if (resume.skills.length) {
    parts.push(`\n## Skills\n${resume.skills.map((s) => `- **${s.category}:** ${s.items}`).join('\n')}`);
  }
  if (resume.experience.length) {
    parts.push(
      `\n## Experience\n${resume.experience
        .map(
          (exp) =>
            `### ${exp.title} — ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})\n${exp.bullets
              .map((b) => `- ${b}`)
              .join('\n')}`
        )
        .join('\n\n')}`
    );
  }
  if (resume.projects.length) {
    parts.push(
      `\n## Projects\n${resume.projects
        .map((p) => `### ${p.name} (${p.technologies})\n${p.description}`)
        .join('\n\n')}`
    );
  }
  if (resume.education.length) {
    parts.push(
      `\n## Education\n${resume.education
        .map((edu) => `- **${edu.degree}** — ${edu.institution} (${edu.graduationYear})${edu.gpa ? ` • ${edu.gpa}` : ''}`)
        .join('\n')}`
    );
  }
  if (resume.certifications?.length) {
    parts.push(
      `\n## Certifications\n${resume.certifications.map((c) => `- ${c.name} — ${c.issuer} (${c.year})`).join('\n')}`
    );
  }
  if (resume.achievements?.length) {
    parts.push(`\n## Achievements\n${resume.achievements.map((a) => `- ${a}`).join('\n')}`);
  }
  if (resume.languages?.length) {
    parts.push(`\n## Languages\n${resume.languages.join(', ')}`);
  }

  return parts.join('\n');
}

export const ResumeBuilderView: React.FC<Props> = ({ userProfile, session, onOpenAuthModal }) => {
  const [resume, setResume] = useState<ResumeData>(() => {
    const saved = localStorage.getItem('mym_resume_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_RESUME,
          ...parsed,
          certifications: parsed.certifications || INITIAL_RESUME.certifications || [],
          achievements: parsed.achievements || INITIAL_RESUME.achievements || [],
          languages: parsed.languages || INITIAL_RESUME.languages || [],
        };
      } catch {
        // ignore
      }
    }
    return INITIAL_RESUME;
  });

  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateType>('ats-classic');
  const [targetRole, setTargetRole] = useState(userProfile?.careerGoals?.dreamJob || 'Full Stack Software Engineer');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copiedMode, setCopiedMode] = useState<'md' | 'txt' | null>(null);
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string; url?: string } | null>(null);

  // Google Docs & PDF export state
  const [showDocConfirm, setShowDocConfirm] = useState(false);
  const [exportingDoc, setExportingDoc] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Extras input helpers
  const [newAchievement, setNewAchievement] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // AI Assistant states
  const [loadingSummaryAI, setLoadingSummaryAI] = useState(false);
  const [summaryOptions, setSummaryOptions] = useState<{ title: string; text: string }[] | null>(null);
  const [summaryTip, setSummaryTip] = useState<string | null>(null);

  const [activeExpIndex, setActiveExpIndex] = useState<number>(0);
  const [roughBulletInput, setRoughBulletInput] = useState('');
  const [loadingBulletAI, setLoadingBulletAI] = useState(false);
  const [suggestedBullets, setSuggestedBullets] = useState<string[] | null>(null);
  const [bulletTip, setBulletTip] = useState<string | null>(null);

  const [loadingSkillsAI, setLoadingSkillsAI] = useState(false);
  const [suggestedSkillCategories, setSuggestedSkillCategories] = useState<
    { category: string; skills: string[] }[] | null
  >(null);

  useEffect(() => {
    localStorage.setItem('mym_resume_draft', JSON.stringify(resume));
  }, [resume]);

  const isUsingSample = resume.personalInfo.fullName === INITIAL_RESUME.personalInfo.fullName;

  const handleResetToSample = () => {
    setResume(INITIAL_RESUME);
    setBanner({ type: 'success', text: 'Sample resume template restored.' });
    setTimeout(() => setBanner(null), 2500);
  };

  const handlePreFillFromProfile = () => {
    if (!userProfile) return;
    const skillsByCategory: { category: string; items: string }[] = [];
    if (userProfile.knownSkills && userProfile.knownSkills.length > 0) {
      skillsByCategory.push({
        category: 'Technical Skills',
        items: userProfile.knownSkills.map((s) => s.name).join(', '),
      });
    }

    const nextResume: ResumeData = {
      personalInfo: {
        fullName: userProfile.name || resume.personalInfo.fullName,
        email: userProfile.email || resume.personalInfo.email,
        phone: userProfile.phone || resume.personalInfo.phone,
        location: `${userProfile.city || 'Chennai'}, ${userProfile.country || 'India'}`,
        portfolioUrl: resume.personalInfo.portfolioUrl,
        linkedinUrl: resume.personalInfo.linkedinUrl,
        githubUrl: resume.personalInfo.githubUrl,
      },
      summary: userProfile.careerGoals?.shortTermGoals
        ? `Dedicated ${userProfile.degree || 'Computer Science'} student targeting ${
            userProfile.careerGoals.dreamJob || 'Software Engineering'
          }. ${userProfile.careerGoals.shortTermGoals}`
        : resume.summary,
      experience: userProfile.internships?.length
        ? userProfile.internships.map((intern, i) => ({
            id: `exp-${i}`,
            title: intern.role,
            company: intern.company,
            location: 'Hybrid',
            startDate: intern.duration.split(' - ')[0] || '2025',
            endDate: intern.duration.split(' - ')[1] || 'Present',
            current: intern.duration.includes('Present'),
            bullets: [intern.description],
          }))
        : resume.experience,
      education: [
        {
          id: 'edu-1',
          degree: `${userProfile.degree || 'Bachelor of Engineering'}${
            userProfile.department ? ` - ${userProfile.department}` : ''
          }`,
          institution: userProfile.college || 'University',
          graduationYear: userProfile.graduationYear || '2026',
          gpa: '',
        },
      ],
      projects: userProfile.completedProjects?.length
        ? userProfile.completedProjects.map((p, i) => ({
            id: `proj-${i}`,
            name: p.title,
            technologies: p.technologies,
            link: p.link,
            description: p.description,
          }))
        : resume.projects,
      skills: skillsByCategory.length > 0 ? skillsByCategory : resume.skills,
      certifications: userProfile.certifications?.length
        ? userProfile.certifications.map((c) => ({
            id: c.id,
            name: c.name,
            issuer: c.issuer,
            year: c.year,
          }))
        : resume.certifications || [],
      achievements: resume.achievements || [],
      languages: resume.languages || ['English'],
    };

    setResume(nextResume);
    if (userProfile.careerGoals?.dreamJob) {
      setTargetRole(userProfile.careerGoals.dreamJob);
    }
    setBanner({ type: 'success', text: 'Pre-filled resume details from your MakeYourMark profile.' });
    setTimeout(() => setBanner(null), 2500);
  };

  const handleCopy = (format: 'md' | 'txt') => {
    const output =
      format === 'md' ? formatResumeAsMarkdown(resume, targetRole) : formatResumeAsPlainText(resume, targetRole);
    navigator.clipboard.writeText(output);
    setCopiedMode(format);
    setTimeout(() => setCopiedMode(null), 2000);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setBanner(null);
    try {
      const res = await downloadResumePdf(resume, selectedTemplate, targetRole);
      if (session?.emailVerified) {
        syncResumeToFirestore(resume, selectedTemplate, targetRole).catch(() => {});
      }
      setBanner({
        type: 'success',
        text: `Downloaded "${res.filename}" (${res.sizeLabel}) using the ${selectedTemplate} layout.`,
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err?.message || 'Unable to generate PDF file. Try the Print / Save PDF or Copy Text option.',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRequestGoogleDocExport = () => {
    if (!getWorkspaceAccessToken()) {
      setBanner({
        type: 'error',
        text: 'Sign in with Google Workspace first to create and save a Google Doc directly to your Drive.',
      });
      onOpenAuthModal?.();
      return;
    }
    setShowDocConfirm(true);
  };

  const handleConfirmGoogleDocExport = async () => {
    setExportingDoc(true);
    setBanner(null);
    try {
      const title = `${resume.personalInfo.fullName || 'Candidate'} - ${targetRole} Resume`;
      const body = formatResumeAsPlainText(resume, targetRole);
      const res = await exportTextToGoogleDoc(title, body);
      if (session?.emailVerified) {
        syncResumeToFirestore(resume, selectedTemplate, targetRole).catch(() => {});
      }
      setShowDocConfirm(false);
      setBanner({
        type: 'success',
        text: `Exported "${res.title}" to Google Docs.`,
        url: res.docUrl,
      });
    } catch (err: any) {
      setShowDocConfirm(false);
      setBanner({ type: 'error', text: err?.message || 'Failed to export resume to Google Docs.' });
    } finally {
      setExportingDoc(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingSummaryAI(true);
    setBanner(null);
    try {
      const res = await coachResumeSummary(targetRole, resume.summary || 'Software developer building web applications.');
      setSummaryOptions(res.options);
      setSummaryTip(res.teachingTip);
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Could not reach AI coach. Please check AI settings and retry.' });
    } finally {
      setLoadingSummaryAI(false);
    }
  };

  const handleEnhanceBullet = async () => {
    if (!roughBulletInput.trim()) return;
    setLoadingBulletAI(true);
    setBanner(null);
    try {
      const res = await coachResumeBullets(targetRole, roughBulletInput);
      setSuggestedBullets(res.bullets);
      setBulletTip(res.teachingTip);
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Could not polish bullet point. Please retry.' });
    } finally {
      setLoadingBulletAI(false);
    }
  };

  const handleAddBulletToExperience = (bulletText: string) => {
    const expList = [...resume.experience];
    if (!expList[activeExpIndex]) return;
    expList[activeExpIndex] = {
      ...expList[activeExpIndex],
      bullets: [...expList[activeExpIndex].bullets, bulletText],
    };
    setResume({ ...resume, experience: expList });
  };

  const handleSuggestSkills = async () => {
    setLoadingSkillsAI(true);
    setBanner(null);
    try {
      const res = await coachResumeSkills(targetRole);
      setSuggestedSkillCategories(res.categories);
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Could not suggest skills right now.' });
    } finally {
      setLoadingSkillsAI(false);
    }
  };

  const handleApplySkillCategory = (cat: { category: string; skills: string[] }) => {
    const existingIdx = resume.skills.findIndex((s) => s.category.toLowerCase() === cat.category.toLowerCase());
    const nextSkills = [...resume.skills];
    if (existingIdx >= 0) {
      nextSkills[existingIdx] = {
        ...nextSkills[existingIdx],
        items: Array.from(
          new Set([
            ...nextSkills[existingIdx].items
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
            ...cat.skills,
          ])
        ).join(', '),
      };
    } else {
      nextSkills.push({
        category: cat.category,
        items: cat.skills.join(', '),
      });
    }
    setResume({ ...resume, skills: nextSkills });
  };

  const steps = [
    { num: 1, title: 'Basics & Contact' },
    { num: 2, title: 'Summary (AI)' },
    { num: 3, title: 'Experience & Bullets' },
    { num: 4, title: 'Skills, Edu & Extras' },
    { num: 5, title: 'Preview & Export' },
  ];

  // Shared Extras renderer inside printable templates
  const renderCredentialsExtras = (headingClass: string) => (
    <>
      {resume.certifications && resume.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h2 className={headingClass}>Certifications</h2>
          <ul className="space-y-1 text-xs text-slate-800">
            {resume.certifications.map((cert) => (
              <li key={cert.id} className="flex items-center justify-between">
                <span>
                  <strong>{cert.name}</strong> — {cert.issuer}
                </span>
                <span className="text-[11px] text-slate-600">{cert.year}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resume.achievements && resume.achievements.length > 0 && (
        <div className="space-y-1.5">
          <h2 className={headingClass}>Achievements</h2>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-800 pl-1">
            {resume.achievements.map((ach, i) => (
              <li key={i}>{ach}</li>
            ))}
          </ul>
        </div>
      )}

      {resume.languages && resume.languages.length > 0 && (
        <div className="space-y-1">
          <h2 className={headingClass}>Languages</h2>
          <p className="text-xs text-slate-800">{resume.languages.join(' • ')}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Wand2 className="w-4 h-4" />
            <span>AI Guided Resume Creator • 6 Templates</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Build Your Resume Step-by-Step
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Switch between 6 recruiter-tested templates, polish bullets with AI, print to PDF, or export to Google Docs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetToSample}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sample Data</span>
          </button>
          <button
            onClick={() => setCurrentStep(5)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-orange-500 hover:to-amber-500 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview & Export</span>
          </button>
        </div>
      </div>

      {/* Guest / Sample Notice Banner */}
      {isUsingSample && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
          <span>
            Showing sample resume template data so you can explore layouts immediately. Edit any field or pre-fill from your profile.
          </span>
          {userProfile && (
            <button
              type="button"
              onClick={handlePreFillFromProfile}
              className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Use My Profile</span>
            </button>
          )}
        </div>
      )}

      {/* Inline Status / Error Banner */}
      {banner && (
        <div
          className={`rounded-2xl border p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden ${
            banner.type === 'error'
              ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200'
              : 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <div className="flex items-center gap-3">
            {banner.url && (
              <a
                href={banner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold underline"
              >
                <span>Open Google Doc</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button type="button" onClick={() => setBanner(null)} className="font-bold underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-3 sm:p-4 shadow-sm print:hidden">
        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20'
                    : isDone
                    ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-orange-600'
                      : isDone
                      ? 'bg-orange-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: BASICS & CONTACT */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-950/20 p-4">
            <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <strong className="font-semibold block text-sm mb-0.5 text-zinc-900 dark:text-white">
                AI Coach Tip: Setting Your Foundation
              </strong>
              Specify the exact role title you are targeting (e.g. "Full Stack Software Engineer"). Recruiters and ATS parsers check the top header first.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Contact & Target Information</h3>
              {userProfile && (
                <button
                  type="button"
                  onClick={handlePreFillFromProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-600/20 text-xs font-bold transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Pre-fill from My Profile</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Role Title
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={resume.personalInfo.fullName}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, fullName: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resume.personalInfo.email}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, email: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={resume.personalInfo.phone}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, phone: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={resume.personalInfo.location}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, location: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Portfolio / Website URL
                </label>
                <input
                  type="text"
                  value={resume.personalInfo.portfolioUrl}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, portfolioUrl: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  value={resume.personalInfo.linkedinUrl}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, linkedinUrl: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  GitHub URL
                </label>
                <input
                  type="text"
                  value={resume.personalInfo.githubUrl}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, githubUrl: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-95"
              >
                <span>Next: AI Summary</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SUMMARY WITH AI COACH */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-950/20 p-4">
            <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <strong className="font-semibold block text-sm mb-0.5 text-zinc-900 dark:text-white">
                {summaryTip ? 'AI Coach Recommendation' : 'AI Coach Tip: The 3-Sentence Rule'}
              </strong>
              {summaryTip ||
                'Your summary should be 2–3 focused sentences: (1) Current background/degree, (2) Core technical strengths, and (3) Tangible projects or outcomes.'}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Professional Summary</h3>
              <button
                onClick={handleGenerateSummary}
                disabled={loadingSummaryAI}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-xs font-semibold text-white hover:from-orange-500 hover:to-amber-500 shadow-md transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loadingSummaryAI ? 'AI Coach Drafting...' : 'AI Generate 2 Options'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={resume.summary}
              onChange={(e) => setResume({ ...resume, summary: e.target.value })}
              placeholder="e.g. Computer Science student building full-stack React and Node.js applications..."
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-4 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
            />

            {summaryOptions && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Select an AI-Crafted Option:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summaryOptions.map((opt, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/40 dark:bg-orange-950/20 p-4 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{opt.title}</span>
                        <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{opt.text}</p>
                      </div>
                      <button
                        onClick={() => setResume({ ...resume, summary: opt.text })}
                        className="self-start mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Use this Summary</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-95"
              >
                <span>Next: Experience & Projects</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: WORK EXPERIENCE & PROJECTS & AI BULLET POLISHER */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-950/20 p-4">
            <Lightbulb className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <strong className="font-semibold block text-sm mb-0.5 text-zinc-900 dark:text-white">
                {bulletTip ? 'AI Bullet Tip' : 'AI Coach Tip: Action + Tech + Measurable Outcome'}
              </strong>
              {bulletTip ||
                'Replace vague duties with specific engineering results (e.g., "Reduced API response time from 420ms to 95ms using Redis caching").'}
            </div>
          </div>

          {/* AI Bullet Enhancer Tool */}
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-[#18181b] p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Bullet Point Polisher</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Describe what you built or accomplished in plain words, and the AI will draft 3 tailored resume bullets:
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={roughBulletInput}
                onChange={(e) => setRoughBulletInput(e.target.value)}
                placeholder="e.g. Built a React dashboard and fixed slow SQL queries"
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:border-orange-500 focus:outline-none"
              />
              <button
                onClick={handleEnhanceBullet}
                disabled={loadingBulletAI || !roughBulletInput.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-40 transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{loadingBulletAI ? 'Transforming...' : 'AI Polish'}</span>
              </button>
            </div>

            {suggestedBullets && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Click to add to active position:
                </span>
                <div className="space-y-2">
                  {suggestedBullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAddBulletToExperience(bullet)}
                      className="group flex items-start justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 cursor-pointer hover:border-orange-500 transition shadow-sm"
                    >
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">• {bullet}</p>
                      <span className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400 group-hover:underline">
                        + Add
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Job Positions List */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Work & Internship Positions</h3>
              <button
                onClick={() => {
                  const newExp = {
                    id: Date.now().toString(),
                    title: 'Software Developer Intern',
                    company: 'Company Name',
                    location: 'Remote',
                    startDate: '2025-05',
                    endDate: '',
                    current: true,
                    bullets: ['Engineered core product features with clean test coverage.'],
                  };
                  setResume({ ...resume, experience: [newExp, ...resume.experience] });
                  setActiveExpIndex(0);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>

            <div className="space-y-5">
              {resume.experience.map((exp, expIdx) => (
                <div
                  key={exp.id}
                  onClick={() => setActiveExpIndex(expIdx)}
                  className={`rounded-2xl border p-5 space-y-3 transition ${
                    activeExpIndex === expIdx
                      ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/15'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      Position #{expIdx + 1} {activeExpIndex === expIdx ? '(Active in AI Tool)' : ''}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResume({
                          ...resume,
                          experience: resume.experience.filter((_, i) => i !== expIdx),
                        });
                      }}
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Role Title"
                      value={exp.title}
                      onChange={(e) => {
                        const copy = [...resume.experience];
                        copy[expIdx] = { ...copy[expIdx], title: e.target.value };
                        setResume({ ...resume, experience: copy });
                      }}
                      className="sm:col-span-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => {
                        const copy = [...resume.experience];
                        copy[expIdx] = { ...copy[expIdx], company: e.target.value };
                        setResume({ ...resume, experience: copy });
                      }}
                      className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Start"
                        value={exp.startDate}
                        onChange={(e) => {
                          const copy = [...resume.experience];
                          copy[expIdx] = { ...copy[expIdx], startDate: e.target.value };
                          setResume({ ...resume, experience: copy });
                        }}
                        className="w-1/2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-2 text-xs text-zinc-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="End"
                        value={exp.current ? 'Present' : exp.endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const copy = [...resume.experience];
                          copy[expIdx] = {
                            ...copy[expIdx],
                            current: val.toLowerCase() === 'present',
                            endDate: val.toLowerCase() === 'present' ? '' : val,
                          };
                          setResume({ ...resume, experience: copy });
                        }}
                        className="w-1/2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-2 text-xs text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Bullet Points:
                    </label>
                    {exp.bullets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={b}
                          onChange={(e) => {
                            const copy = [...resume.experience];
                            const bulletsCopy = [...copy[expIdx].bullets];
                            bulletsCopy[bIdx] = e.target.value;
                            copy[expIdx] = { ...copy[expIdx], bullets: bulletsCopy };
                            setResume({ ...resume, experience: copy });
                          }}
                          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            const copy = [...resume.experience];
                            copy[expIdx] = {
                              ...copy[expIdx],
                              bullets: copy[expIdx].bullets.filter((_, idx) => idx !== bIdx),
                            };
                            setResume({ ...resume, experience: copy });
                          }}
                          className="text-zinc-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const copy = [...resume.experience];
                        copy[expIdx] = {
                          ...copy[expIdx],
                          bullets: [...copy[expIdx].bullets, 'Delivered feature with measurable impact.'],
                        };
                        setResume({ ...resume, experience: copy });
                      }}
                      className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline mt-1 block"
                    >
                      + Add bullet line
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Editable Projects */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Projects</h3>
                <button
                  type="button"
                  onClick={() =>
                    setResume({
                      ...resume,
                      projects: [
                        ...resume.projects,
                        {
                          id: `proj-${Date.now()}`,
                          name: 'New Project',
                          technologies: 'React, TypeScript',
                          description: 'Built end-to-end solution solving a real workflow bottleneck.',
                        },
                      ],
                    })
                  }
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>

              {resume.projects.map((proj, pIdx) => (
                <div
                  key={proj.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => {
                        const next = [...resume.projects];
                        next[pIdx] = { ...next[pIdx], name: e.target.value };
                        setResume({ ...resume, projects: next });
                      }}
                      placeholder="Project Name"
                      className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={proj.technologies}
                      onChange={(e) => {
                        const next = [...resume.projects];
                        next[pIdx] = { ...next[pIdx], technologies: e.target.value };
                        setResume({ ...resume, projects: next });
                      }}
                      placeholder="Tech Stack"
                      className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setResume({ ...resume, projects: resume.projects.filter((_, idx) => idx !== pIdx) })
                      }
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={proj.description}
                    onChange={(e) => {
                      const next = [...resume.projects];
                      next[pIdx] = { ...next[pIdx], description: e.target.value };
                      setResume({ ...resume, projects: next });
                    }}
                    placeholder="Concise engineering description and measurable outcome..."
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-95"
              >
                <span>Next: Skills & Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SKILLS, EDUCATION, CERTIFICATIONS, ACHIEVEMENTS, LANGUAGES */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-[#18181b] p-5 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>AI Skill Suggestions for {targetRole}</span>
              </div>
              <button
                onClick={handleSuggestSkills}
                disabled={loadingSkillsAI}
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition disabled:opacity-40"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{loadingSkillsAI ? 'Searching...' : 'AI Suggest Skills'}</span>
              </button>
            </div>

            {suggestedSkillCategories && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {suggestedSkillCategories.map((cat, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{cat.category}</span>
                      <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">{cat.skills.join(', ')}</p>
                    </div>
                    <button
                      onClick={() => handleApplySkillCategory(cat)}
                      className="self-start mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Resume</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 space-y-6 shadow-sm">
            {/* Skills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Skills Matrix</h3>
                <button
                  type="button"
                  onClick={() =>
                    setResume({ ...resume, skills: [...resume.skills, { category: 'Tools', items: '' }] })
                  }
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  + Add Category
                </button>
              </div>
              {resume.skills.map((s, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    value={s.category}
                    onChange={(e) => {
                      const copy = [...resume.skills];
                      copy[idx] = { ...copy[idx], category: e.target.value };
                      setResume({ ...resume, skills: copy });
                    }}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-white"
                  />
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={s.items}
                      onChange={(e) => {
                        const copy = [...resume.skills];
                        copy[idx] = { ...copy[idx], items: e.target.value };
                        setResume({ ...resume, skills: copy });
                      }}
                      className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setResume({ ...resume, skills: resume.skills.filter((_, i) => i !== idx) })}
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Education */}
            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Education</h3>
              {resume.education.map((edu, idx) => (
                <div key={edu.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => {
                      const copy = [...resume.education];
                      copy[idx] = { ...copy[idx], degree: e.target.value };
                      setResume({ ...resume, education: copy });
                    }}
                    className="sm:col-span-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => {
                      const copy = [...resume.education];
                      copy[idx] = { ...copy[idx], institution: e.target.value };
                      setResume({ ...resume, education: copy });
                    }}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Year"
                      value={edu.graduationYear}
                      onChange={(e) => {
                        const copy = [...resume.education];
                        copy[idx] = { ...copy[idx], graduationYear: e.target.value };
                        setResume({ ...resume, education: copy });
                      }}
                      className="w-1/2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2 text-xs text-zinc-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="GPA"
                      value={edu.gpa || ''}
                      onChange={(e) => {
                        const copy = [...resume.education];
                        copy[idx] = { ...copy[idx], gpa: e.target.value };
                        setResume({ ...resume, education: copy });
                      }}
                      className="w-1/2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2 text-xs text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Certifications */}
            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-orange-500" />
                  <span>Certifications</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setResume({
                      ...resume,
                      certifications: [
                        ...(resume.certifications || []),
                        { id: `cert-${Date.now()}`, name: 'Certification Name', issuer: 'Issuer', year: '2026' },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  + Add Certification
                </button>
              </div>
              {(resume.certifications || []).map((cert, idx) => (
                <div key={cert.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => {
                      const next = [...(resume.certifications || [])];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setResume({ ...resume, certifications: next });
                    }}
                    placeholder="Certification Name"
                    className="sm:col-span-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => {
                      const next = [...(resume.certifications || [])];
                      next[idx] = { ...next[idx], issuer: e.target.value };
                      setResume({ ...resume, certifications: next });
                    }}
                    placeholder="Issuer"
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cert.year}
                      onChange={(e) => {
                        const next = [...(resume.certifications || [])];
                        next[idx] = { ...next[idx], year: e.target.value };
                        setResume({ ...resume, certifications: next });
                      }}
                      placeholder="Year"
                      className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setResume({
                          ...resume,
                          certifications: (resume.certifications || []).filter((_, i) => i !== idx),
                        })
                      }
                      className="text-zinc-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Achievements & Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Achievements</h4>
                <div className="space-y-1.5">
                  {(resume.achievements || []).map((ach, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="truncate">{ach}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setResume({
                            ...resume,
                            achievements: (resume.achievements || []).filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-zinc-400 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAchievement}
                    onChange={(e) => setNewAchievement(e.target.value)}
                    placeholder="e.g. Smart India Hackathon Finalist"
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newAchievement.trim()) return;
                      setResume({
                        ...resume,
                        achievements: [...(resume.achievements || []), newAchievement.trim()],
                      });
                      setNewAchievement('');
                    }}
                    className="rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <span>Languages</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(resume.languages || []).map((lang, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200"
                    >
                      <span>{lang}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setResume({
                            ...resume,
                            languages: (resume.languages || []).filter((_, idx) => idx !== i),
                          })
                        }
                        className="hover:text-rose-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="e.g. English (Fluent), Tamil (Native)"
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newLanguage.trim()) return;
                      setResume({
                        ...resume,
                        languages: [...(resume.languages || []), newLanguage.trim()],
                      });
                      setNewLanguage('');
                    }}
                    className="rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={() => setCurrentStep(5)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition active:scale-95"
              >
                <span>Done! Preview & Export</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: PREVIEW & EXPORT WITH 6 PROFESSIONAL TEMPLATES */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181b] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                  Resume Ready to Preview & Export
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Switch across 6 layouts, copy Markdown or Plain Text, Print/PDF, or save to Google Docs.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Edit Details
              </button>

              <button
                onClick={() => handleCopy('txt')}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                {copiedMode === 'txt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMode === 'txt' ? 'Copied Text' : 'Copy Text'}</span>
              </button>

              <button
                onClick={() => handleCopy('md')}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                {copiedMode === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{copiedMode === 'md' ? 'Copied MD' : 'Copy Markdown'}</span>
              </button>

              <button
                type="button"
                onClick={handleRequestGoogleDocExport}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Google Docs</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-orange-500 hover:to-amber-400 transition active:scale-95 disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingPdf ? 'Building PDF...' : 'Download PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* 6-Template Switcher Bar */}
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl space-y-2 print:hidden">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-300 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-orange-500" />
                Choose Resume Template (6 Styles):
              </span>
              <span className="text-[11px]">Live print preview below</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: 'ats-classic', title: '1. ATS Classic', desc: 'Max Parser Score' },
                { id: 'modern-pro', title: '2. Modern Pro', desc: 'Clean Charcoal/Gold' },
                { id: 'modern-fresher', title: '3. Modern Fresher', desc: 'Skills & Projects First' },
                { id: 'software-engineer', title: '4. Software Dev', desc: 'Tech Matrix & Impact' },
                { id: 'college-intern', title: '5. College Intern', desc: 'Academics & Campus' },
                { id: 'experienced-pro', title: '6. Executive Pro', desc: 'Chronological Focus' },
              ].map((tmpl) => {
                const isActive = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id as ResumeTemplateType)}
                    className={`text-left p-2.5 rounded-xl border transition ${
                      isActive
                        ? 'bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-200 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="font-bold text-xs truncate text-zinc-900 dark:text-white">{tmpl.title}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{tmpl.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TEMPLATE RENDER CONTAINER (Always Crisp White Sheet for Printing) */}
          <div
            id="printable-resume"
            className="rounded-2xl bg-white text-slate-900 p-8 sm:p-12 shadow-2xl border border-slate-300 space-y-5 max-w-3xl mx-auto print:p-0 print:border-none print:shadow-none"
          >
            {/* TEMPLATE 1: ATS CLASSIC */}
            {selectedTemplate === 'ats-classic' && (
              <div className="font-serif space-y-4 text-slate-900">
                <div className="border-b-2 border-slate-900 pb-3 text-center">
                  <h1 className="text-2xl font-bold uppercase text-slate-950">
                    {resume.personalInfo.fullName || 'Candidate Name'}
                  </h1>
                  <p className="text-sm italic text-slate-700 mt-0.5">{targetRole}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-800 mt-2 font-mono">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>| {resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>| {resume.personalInfo.location}</span>}
                    {resume.personalInfo.linkedinUrl && <span>| {resume.personalInfo.linkedinUrl}</span>}
                  </div>
                </div>

                {resume.summary && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5">
                      Professional Summary
                    </h2>
                    <p className="text-xs text-slate-800 leading-relaxed pt-1 font-sans">{resume.summary}</p>
                  </div>
                )}

                {resume.skills.length > 0 && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5">
                      Technical Skills
                    </h2>
                    <div className="space-y-1 text-xs text-slate-800 font-sans">
                      {resume.skills.map((s, idx) => (
                        <div key={idx}>
                          <span className="font-bold">{s.category}: </span>
                          <span>{s.items}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resume.experience.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5">
                      Work Experience
                    </h2>
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {exp.title} — <span className="italic">{exp.company}</span>
                          </span>
                          <span className="text-[11px] text-slate-700">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-800 font-sans pl-1">
                          {exp.bullets.map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {resume.projects.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5">
                      Projects
                    </h2>
                    {resume.projects.map((proj) => (
                      <div key={proj.id} className="space-y-0.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{proj.name}</span>
                          <span className="text-[11px] text-slate-600 font-sans">{proj.technologies}</span>
                        </div>
                        <p className="text-slate-800 font-sans">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resume.education.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5">
                      Education
                    </h2>
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{edu.degree}</span>
                          <span>, {edu.institution}</span>
                        </div>
                        <span className="text-[11px] text-slate-700">
                          {edu.graduationYear}
                          {edu.gpa ? ` • ${edu.gpa}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {renderCredentialsExtras(
                  'text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5'
                )}
              </div>
            )}

            {/* TEMPLATE 2: MODERN PRO (Minimalist Charcoal + Amber Accent) */}
            {selectedTemplate === 'modern-pro' && (
              <div className="font-sans space-y-5 text-slate-900">
                <div className="border-l-4 border-orange-600 pl-4 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                      {resume.personalInfo.fullName || 'Candidate Name'}
                    </h1>
                    <p className="text-sm font-bold text-orange-600 mt-0.5">{targetRole}</p>
                  </div>
                  <div className="text-xs text-slate-600 sm:text-right space-y-0.5">
                    {resume.personalInfo.email && <div>{resume.personalInfo.email}</div>}
                    {resume.personalInfo.phone && <div>{resume.personalInfo.phone}</div>}
                    {resume.personalInfo.location && <div>{resume.personalInfo.location}</div>}
                  </div>
                </div>

                {resume.summary && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-amber-500 pb-0.5">
                      Profile Summary
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed">{resume.summary}</p>
                  </div>
                )}

                {resume.experience.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-amber-500 pb-0.5">
                      Experience
                    </h2>
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-900">
                            {exp.title} • <span className="text-orange-700">{exp.company}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                          {exp.bullets.map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {resume.projects.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-amber-500 pb-0.5">
                      Selected Projects
                    </h2>
                    {resume.projects.map((proj) => (
                      <div key={proj.id} className="text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900">{proj.name}</span>
                          <span className="text-[11px] text-orange-700 font-medium">{proj.technologies}</span>
                        </div>
                        <p className="text-slate-700">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resume.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-amber-500 pb-0.5">
                      Skills
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {resume.skills.map((s, idx) => (
                        <div key={idx}>
                          <span className="font-bold">{s.category}: </span>
                          <span className="text-slate-700">{s.items}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resume.education.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-amber-500 pb-0.5">
                      Education
                    </h2>
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold">{edu.degree}</span>
                          <span className="text-slate-600"> — {edu.institution}</span>
                        </div>
                        <span className="text-[11px] text-slate-600">{edu.graduationYear}</span>
                      </div>
                    ))}
                  </div>
                )}

                {renderCredentialsExtras(
                  'text-xs font-black uppercase tracking-wider text-zinc-900 border-b border-amber-500 pb-0.5'
                )}
              </div>
            )}

            {/* TEMPLATE 3: MODERN FRESHER */}
            {selectedTemplate === 'modern-fresher' && (
              <div className="font-sans space-y-5 text-slate-900">
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 -mx-8 sm:-mx-12 -mt-8 sm:-mt-12 p-8 text-white rounded-t-2xl">
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                    {resume.personalInfo.fullName || 'Candidate Name'}
                  </h1>
                  <p className="text-sm font-semibold text-amber-100 mt-1">{targetRole}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/90 mt-3 font-medium">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>• {resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>• {resume.personalInfo.location}</span>}
                  </div>
                </div>

                {resume.summary && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-orange-600 border-b-2 border-orange-500 pb-0.5">
                      About Me
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed pt-1">{resume.summary}</p>
                  </div>
                )}

                {resume.education.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-orange-600 border-b-2 border-orange-500 pb-0.5">
                      Education
                    </h2>
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{edu.degree}</span>
                          <span className="text-slate-600"> — {edu.institution}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-semibold">{edu.graduationYear}</span>
                      </div>
                    ))}
                  </div>
                )}

                {resume.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-orange-600 border-b-2 border-orange-500 pb-0.5">
                      Core Skills
                    </h2>
                    {resume.skills.map((s, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold text-slate-900">{s.category}: </span>
                        <span className="text-slate-700">{s.items}</span>
                      </div>
                    ))}
                  </div>
                )}

                {resume.projects.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-orange-600 border-b-2 border-orange-500 pb-0.5">
                      Featured Projects
                    </h2>
                    {resume.projects.map((proj) => (
                      <div key={proj.id} className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{proj.name}</span>
                          <span className="text-[11px] font-mono text-orange-700 font-medium">{proj.technologies}</span>
                        </div>
                        <p className="text-slate-700 mt-1">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resume.experience.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-orange-600 border-b-2 border-orange-500 pb-0.5">
                      Internships & Experience
                    </h2>
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {exp.title} <span className="font-medium text-slate-600">at {exp.company}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                          {exp.bullets.map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {renderCredentialsExtras(
                  'text-xs font-black uppercase tracking-wider text-orange-600 border-b-2 border-orange-500 pb-0.5'
                )}
              </div>
            )}

            {/* TEMPLATE 4: SOFTWARE DEVELOPER */}
            {selectedTemplate === 'software-engineer' && (
              <div className="font-sans space-y-5 text-slate-900">
                <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-mono">
                      {resume.personalInfo.fullName || 'Candidate Name'}
                    </h1>
                    <p className="text-sm font-bold text-orange-600 font-mono mt-0.5">&gt; {targetRole}</p>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5 sm:text-right font-mono">
                    <div>{resume.personalInfo.email}</div>
                    <div>{resume.personalInfo.phone}</div>
                    <div>{resume.personalInfo.location}</div>
                    {resume.personalInfo.githubUrl && (
                      <div className="text-orange-600 font-semibold">{resume.personalInfo.githubUrl}</div>
                    )}
                  </div>
                </div>

                {resume.skills.length > 0 && (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-300">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      TECHNICAL STACK MATRIX
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {resume.skills.map((s, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <span className="font-bold text-slate-900 font-mono text-[11px]">{s.category}:</span>
                          <p className="text-slate-700">{s.items}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resume.experience.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
                      ENGINEERING EXPERIENCE
                    </h2>
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {exp.title} <span className="font-normal text-slate-600">| {exp.company}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                          {exp.bullets.map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {resume.projects.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
                      PROJECTS & SYSTEMS
                    </h2>
                    {resume.projects.map((proj) => (
                      <div key={proj.id} className="space-y-0.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{proj.name}</span>
                          <span className="text-[11px] font-mono text-slate-600">{proj.technologies}</span>
                        </div>
                        <p className="text-slate-700">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resume.education.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
                      EDUCATION
                    </h2>
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{edu.degree}</span>
                          <span className="text-slate-600"> — {edu.institution}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{edu.graduationYear}</span>
                      </div>
                    ))}
                  </div>
                )}

                {renderCredentialsExtras(
                  'text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono'
                )}
              </div>
            )}

            {/* TEMPLATE 5: COLLEGE STUDENT / INTERN */}
            {selectedTemplate === 'college-intern' && (
              <div className="font-sans space-y-5 text-slate-900">
                <div className="border-b-2 border-amber-500 pb-3 text-center">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                    {resume.personalInfo.fullName || 'Candidate Name'}
                  </h1>
                  <p className="text-sm font-bold text-amber-700 mt-0.5">{targetRole}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 mt-2 font-medium">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>• {resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>• {resume.personalInfo.location}</span>}
                  </div>
                </div>

                {resume.education.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 border-b border-amber-300 pb-0.5">
                      Education & Academic Standing
                    </h2>
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between text-xs bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                        <div>
                          <span className="font-bold text-slate-900">{edu.degree}</span>
                          <div className="text-slate-600">{edu.institution}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-amber-800 block">Class of {edu.graduationYear}</span>
                          {edu.gpa && <span className="text-[10px] text-slate-500">{edu.gpa}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {resume.projects.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 border-b border-amber-300 pb-0.5">
                      Academic Capstones & Technical Projects
                    </h2>
                    {resume.projects.map((proj) => (
                      <div key={proj.id} className="space-y-0.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{proj.name}</span>
                          <span className="text-[11px] text-amber-700 font-semibold">{proj.technologies}</span>
                        </div>
                        <p className="text-slate-700">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resume.skills.length > 0 && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 border-b border-amber-300 pb-0.5">
                      Technical Skills
                    </h2>
                    {resume.skills.map((s, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold text-slate-900">{s.category}: </span>
                        <span className="text-slate-700">{s.items}</span>
                      </div>
                    ))}
                  </div>
                )}

                {resume.experience.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 border-b border-amber-300 pb-0.5">
                      Campus Leadership & Internships
                    </h2>
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {exp.title} — {exp.company}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                          {exp.bullets.map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {renderCredentialsExtras(
                  'text-xs font-bold uppercase tracking-wider text-amber-800 border-b border-amber-300 pb-0.5'
                )}
              </div>
            )}

            {/* TEMPLATE 6: EXPERIENCED PROFESSIONAL */}
            {selectedTemplate === 'experienced-pro' && (
              <div className="font-sans space-y-5 text-slate-900">
                <div className="border-b-4 border-slate-900 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">
                      {resume.personalInfo.fullName || 'Candidate Name'}
                    </h1>
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">{targetRole}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-2 font-medium">
                    {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
                    {resume.personalInfo.phone && <span>| {resume.personalInfo.phone}</span>}
                    {resume.personalInfo.location && <span>| {resume.personalInfo.location}</span>}
                    {resume.personalInfo.linkedinUrl && <span>| {resume.personalInfo.linkedinUrl}</span>}
                  </div>
                </div>

                {resume.summary && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      Executive Summary
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed pt-1">{resume.summary}</p>
                  </div>
                )}

                {resume.experience.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      Professional Experience
                    </h2>
                    {resume.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {exp.title} <span className="font-medium text-slate-600">| {exp.company}</span>
                          </span>
                          <span className="text-[11px] text-slate-600 font-semibold">
                            {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                          {exp.bullets.map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {resume.skills.length > 0 && (
                  <div className="space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      Core Competencies
                    </h2>
                    {resume.skills.map((s, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold">{s.category}: </span>
                        <span className="text-slate-700">{s.items}</span>
                      </div>
                    ))}
                  </div>
                )}

                {resume.education.length > 0 && (
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5">
                      Education & Credentials
                    </h2>
                    {resume.education.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{edu.degree}</span>
                          <span className="text-slate-600"> — {edu.institution}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">Graduated {edu.graduationYear}</span>
                      </div>
                    ))}
                  </div>
                )}

                {renderCredentialsExtras(
                  'text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDocConfirm}
        title="Export Resume to Google Docs?"
        description="This will create a new Google Doc in your personal Google Drive containing your current resume text."
        confirmLabel="Create Google Doc"
        isLoading={exportingDoc}
        onConfirm={handleConfirmGoogleDocExport}
        onCancel={() => setShowDocConfirm(false)}
      />
    </div>
  );
};
