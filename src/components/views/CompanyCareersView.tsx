import React, { useState, useMemo } from 'react';
import { Building2, Search, ExternalLink, Check, Users, Globe } from 'lucide-react';
import { COMPANY_CAREERS } from '../../data/mockData';

export const CompanyCareersView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [originFilter, setOriginFilter] = useState<'All' | 'India' | 'Global / MNC'>('All');

  const filters = ['All', 'Remote-Friendly', 'Global Hubs', 'Pan-India Hubs', 'Hybrid'];

  const filtered = useMemo(() => {
    return COMPANY_CAREERS.filter((comp) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        comp.name.toLowerCase().includes(q) ||
        comp.industry.toLowerCase().includes(q) ||
        comp.hiringPrograms.some((hp) => hp.toLowerCase().includes(q)) ||
        comp.perks.some((p) => p.toLowerCase().includes(q));

      const matchFilter = filter === 'All' || comp.locationType === filter;
      const matchOrigin = originFilter === 'All' || comp.origin === originFilter;
      return matchSearch && matchFilter && matchOrigin;
    });
  }, [search, filter, originFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Official Direct Career Portals ({COMPANY_CAREERS.length} Companies)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Company Career Hubs
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Apply directly through official engineering career portals, university internship tracks, and fresher hiring programs.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 space-y-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, industry, or hiring program (e.g. Apple, IBM, Stripe, Zoho, STEP)..."
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  filter === f
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(['All', 'India', 'Global / MNC'] as const).map((orig) => (
              <button
                key={orig}
                onClick={() => setOriginFilter(orig)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  originFilter === orig
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>{orig}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((company) => (
          <div
            key={company.id}
            className="group flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 hover:border-orange-500/60 transition shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 font-extrabold text-white text-base shadow-md">
                    {company.logoText}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-300 transition">
                      {company.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{company.industry}</p>
                  </div>
                </div>

                <span className="rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                  {company.locationType}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 rounded-xl px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                <Users className="w-4 h-4 text-orange-500" />
                <span>{company.openRolesCount}</span>
              </div>

              {company.hiringPrograms?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Entry Programs:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {company.hiringPrograms.map((prog, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300"
                      >
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Benefits & Highlights:
                </span>
                {company.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <a
                href={company.cultureGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                Culture & Hiring Guide
              </a>

              <a
                href={company.careersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white transition active:scale-95"
              >
                <span>Hiring Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
