import React, { useState, useMemo, useEffect } from 'react';
import {
  Briefcase,
  Search,
  MapPin,
  Bookmark,
  ExternalLink,
  Building,
  CheckCircle2,
  FileEdit,
  Info,
} from 'lucide-react';
import { JOB_LISTINGS } from '../../data/mockData';
import { JobListing, UserProfile, TrackedJobApplication } from '../../types';
import { checkServerHealth } from '../../services/api';

interface Props {
  userProfile: UserProfile;
  onToggleSaveJob: (jobId: string) => void;
  onUpdateApplicationStatus?: (app: TrackedJobApplication) => void;
}

export const JobSearchView: React.FC<Props> = ({
  userProfile,
  onToggleSaveJob,
  onUpdateApplicationStatus,
}) => {
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<'All' | 'India' | 'United States' | 'Global / Remote'>('All');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('All');
  const [workplace, setWorkplace] = useState('All');
  const [experience, setExperience] = useState('All');
  const [currencyDisplay, setCurrencyDisplay] = useState<'both' | 'inr' | 'usd'>(
    userProfile.currencyPreference || 'both'
  );
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [trackedStatusFilter, setTrackedStatusFilter] = useState<string>('All');
  const [liveJobsConfigured, setLiveJobsConfigured] = useState<boolean>(false);

  // Modal / notes editing state for application tracker
  const [activeTrackingJob, setActiveTrackingJob] = useState<JobListing | null>(null);
  const [trackingNotes, setTrackingNotes] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<TrackedJobApplication['status']>('Applied');
  const [trackingDeadline, setTrackingDeadline] = useState('');

  useEffect(() => {
    checkServerHealth().then((h) => {
      setLiveJobsConfigured(Boolean(h.liveJobsConfigured));
    });
  }, []);

  const jobTypes = ['All', 'Internship', 'Fresher / Trainee', 'Graduate', 'Full-time', 'Part-time', 'Contract'];
  const workplaces = ['All', 'Remote', 'Hybrid', 'On-site'];
  const expLevels = ['All', 'College Student', 'Fresher', 'Entry-Level', 'Mid-Level', 'Senior'];

  const getApplicationForJob = (jobId: string): TrackedJobApplication | undefined => {
    return userProfile.trackedApplications?.find((a) => a.jobId === jobId);
  };

  const filteredJobs = useMemo(() => {
    return JOB_LISTINGS.filter((job) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.skills.some((s) => s.toLowerCase().includes(q)) ||
        job.location.toLowerCase().includes(q);

      const matchOrigin = originFilter === 'All' || job.country === originFilter;
      const matchType = jobTypeFilter === 'All' || job.type === jobTypeFilter;
      const matchWorkplace = workplace === 'All' || job.workplace === workplace;
      const matchExp = experience === 'All' || job.experience === experience;
      const matchSaved = !showSavedOnly || userProfile.savedJobs.includes(job.id);

      const app = getApplicationForJob(job.id);
      const matchTracked = trackedStatusFilter === 'All' || (app && app.status === trackedStatusFilter);

      return matchSearch && matchOrigin && matchType && matchWorkplace && matchExp && matchSaved && matchTracked;
    });
  }, [
    search,
    originFilter,
    jobTypeFilter,
    workplace,
    experience,
    showSavedOnly,
    trackedStatusFilter,
    userProfile.savedJobs,
    userProfile.trackedApplications,
  ]);

  const handleOpenTrackingModal = (job: JobListing) => {
    const existing = getApplicationForJob(job.id);
    setActiveTrackingJob(job);
    setTrackingStatus(existing?.status || 'Applied');
    setTrackingNotes(existing?.notes || '');
    setTrackingDeadline(existing?.deadline || job.applicationDeadline || '');
  };

  const handleSaveTracking = () => {
    if (!activeTrackingJob || !onUpdateApplicationStatus) return;
    onUpdateApplicationStatus({
      jobId: activeTrackingJob.id,
      status: trackingStatus,
      notes: trackingNotes,
      deadline: trackingDeadline,
      appliedDate: new Date().toISOString().split('T')[0],
    });
    setActiveTrackingJob(null);
  };

  const renderSalary = (job: JobListing) => {
    if (currencyDisplay === 'inr') {
      return <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{job.salaryInr}</span>;
    }
    if (currencyDisplay === 'usd') {
      return <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{job.salaryUsd}</span>;
    }
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{job.salaryInr}</span>
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">({job.salaryUsd})</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Briefcase className="w-4 h-4" />
            <span>Official Career Portals & Opportunity Explorer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Job & Internship Discovery
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Explore curated Internships, Fresher/Graduate drives, Full-time, Part-time & Contract pathways linking directly to official hiring portals.
          </p>
        </div>

        {/* Currency Switcher & Saved Filter */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] p-1 text-xs">
            {(['both', 'inr', 'usd'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrencyDisplay(curr)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  currencyDisplay === curr
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {curr === 'both' ? '₹ & $' : curr === 'inr' ? '₹ LPA' : '$ USD'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              showSavedOnly
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${showSavedOnly ? 'fill-orange-500' : ''}`} />
            <span>Saved ({userProfile.savedJobs.length})</span>
          </button>
        </div>
      </div>

      {/* Transparency Notice */}
      <div className="rounded-2xl border border-sky-300 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/30 p-3.5 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <span>
          {liveJobsConfigured
            ? 'Live external job feed integration is active alongside curated official company portals.'
            : 'Curated Hiring Programs & Official Portals: Live third-party job aggregator APIs (LIVE_JOBS_API_KEY) are not configured, so listings link directly to verified official company career portals where real-time openings are published. Estimated salary ranges are illustrative benchmarks.'}
        </span>
      </div>

      {/* Filter Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 space-y-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search role, company (Zoho, Apple, Stripe, Google), skills (React, Python, SQL), or city..."
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Job Type Pills */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
            Opportunity Type:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {jobTypes.map((jt) => (
              <button
                key={jt}
                onClick={() => setJobTypeFilter(jt)}
                className={`rounded-lg py-1.5 px-3 text-xs font-semibold transition ${
                  jobTypeFilter === jt
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:border-orange-400'
                }`}
              >
                {jt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Country / Region:
            </span>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as any)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="All">All Regions</option>
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="Global / Remote">Global / Remote</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Workplace:
            </span>
            <select
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              {workplaces.map((wp) => (
                <option key={wp} value={wp}>
                  {wp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Experience Level:
            </span>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              {expLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Tracker Status:
            </span>
            <select
              value={trackedStatusFilter}
              onChange={(e) => setTrackedStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="All">All Applications</option>
              <option value="Wishlist">Wishlist</option>
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offered">Offered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Cards Stream */}
      <div className="space-y-4">
        {filteredJobs.map((job) => {
          const isSaved = userProfile.savedJobs.includes(job.id);
          const application = getApplicationForJob(job.id);

          return (
            <div
              key={job.id}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 hover:border-orange-500/60 hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-lg text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                      {job.title}
                    </span>
                    <span className="rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300">
                      {job.type}
                    </span>
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                      {job.experience}
                    </span>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      {job.workplace}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200">
                      <Building className="w-3.5 h-3.5 text-orange-500" />
                      {job.company}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-semibold">
                      {job.country}
                    </span>
                  </div>

                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-2.5 border border-zinc-200 dark:border-zinc-800 inline-block text-xs">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                      Estimated Package Benchmark:
                    </span>
                    {renderSalary(job)}
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                    {job.description}
                  </p>

                  {application && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-300">
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      <span>
                        Status: <strong>{application.status}</strong>
                      </span>
                      {application.notes && (
                        <span className="text-[11px] text-zinc-500 italic max-w-xs truncate">
                          - "{application.notes}"
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleSaveJob(job.id)}
                      aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
                      className={`h-9 w-9 flex items-center justify-center rounded-xl border transition ${
                        isSaved
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-600'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-orange-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleOpenTrackingModal(job)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-orange-400 transition"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-orange-500" />
                      <span>Track</span>
                    </button>
                  </div>

                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 px-4 py-2 text-xs font-semibold text-white transition active:scale-95 shadow-sm"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                  <span>Source: {job.source}</span>
                  <span>•</span>
                  <span>{job.posted}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-12 text-center text-zinc-500">
            <p className="text-sm font-medium">No matching opportunities found for the current filters.</p>
            <button
              onClick={() => {
                setSearch('');
                setOriginFilter('All');
                setJobTypeFilter('All');
                setWorkplace('All');
                setExperience('All');
                setTrackedStatusFilter('All');
                setShowSavedOnly(false);
              }}
              className="mt-3 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* APPLICATION TRACKING MODAL */}
      {activeTrackingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Track Application: {activeTrackingJob.company}
            </h3>
            <p className="text-xs text-zinc-500">{activeTrackingJob.title}</p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Application Status
              </label>
              <select
                value={trackingStatus}
                onChange={(e) => setTrackingStatus(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              >
                <option value="Wishlist">Wishlist (Planning to Apply)</option>
                <option value="Applied">Applied (Resume Submitted)</option>
                <option value="Interviewing">Interviewing (OA / Rounds)</option>
                <option value="Offered">Offered</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Personal Application Notes
              </label>
              <textarea
                value={trackingNotes}
                onChange={(e) => setTrackingNotes(e.target.value)}
                placeholder="e.g. Applied with tailored resume, alumni referral note, OA schedule..."
                rows={3}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Application Deadline / Follow-up Date
              </label>
              <input
                type="text"
                value={trackingDeadline}
                onChange={(e) => setTrackingDeadline(e.target.value)}
                placeholder="e.g. 2026-11-30 or Rolling"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveTrackingJob(null)}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTracking}
                className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-500 py-2 text-xs font-semibold text-white shadow-sm"
              >
                Save Tracking Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
