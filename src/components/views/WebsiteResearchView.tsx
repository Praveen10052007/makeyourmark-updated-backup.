import React, { useState, useMemo } from 'react';
import { Globe, Search, ExternalLink, Filter, CheckCircle2 } from 'lucide-react';
import { RESEARCH_WEBSITES } from '../../data/mockData';

export const WebsiteResearchView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', 'Official Docs', 'Interactive Learning', 'System Design', 'CS Fundamentals'];

  const filtered = useMemo(() => {
    return RESEARCH_WEBSITES.filter((site) => {
      const matchSearch =
        site.name.toLowerCase().includes(search.toLowerCase()) ||
        site.description.toLowerCase().includes(search.toLowerCase()) ||
        site.features.some((f) => f.toLowerCase().includes(search.toLowerCase()));

      const matchCat = category === 'All' || site.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>Developer Reference</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Documentation & Research Portals
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Verified official documentation, system design primers, and open technical specifications.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 space-y-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation, topics (e.g. System Design, MDN, DevDocs, Blind 75)..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                category === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((site) => (
          <div
            key={site.id}
            className="group flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 hover:border-orange-500/50 transition shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-orange-500/15 border border-orange-500/25 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-amber-400">
                  {site.badge}
                </span>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{site.category}</span>
              </div>

              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-orange-500 transition">
                  {site.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{site.description}</p>
              </div>

              <div className="space-y-1 pt-1">
                {site.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px]">
                {site.url.replace('https://', '')}
              </span>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600/15 border border-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-600 dark:text-amber-400 hover:bg-orange-600 hover:text-white transition"
              >
                <span>Visit Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
