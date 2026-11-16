import React, { useState, useMemo } from 'react';
import { Smartphone, Search, Star, ExternalLink, Check, Filter } from 'lucide-react';
import { CURATED_APPS } from '../../data/mockData';

export const AppResearchView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('All');
  const [category, setCategory] = useState('All');

  const platforms = ['All', 'Android', 'Web', 'Desktop'];
  const categories = ['All', 'Coding & Terminal', 'Note Taking & Knowledge', 'Interview Prep', 'Focus & Productivity'];

  const filtered = useMemo(() => {
    return CURATED_APPS.filter((app) => {
      const matchSearch =
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.description.toLowerCase().includes(search.toLowerCase()) ||
        app.pros.some((p) => p.toLowerCase().includes(search.toLowerCase()));

      const matchPlatform = platform === 'All' || app.platforms.includes(platform as any);
      const matchCategory = category === 'All' || app.category === category;

      return matchSearch && matchPlatform && matchCategory;
    });
  }, [search, platform, category]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>Curated Software Tools</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            App Research & Recommendations
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Productivity, code editors, and study applications vetted for mobile (including 4 GB RAM devices) and desktop.
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
            placeholder="Search apps (e.g. Termux, Obsidian, LeetCode, Flashcards)..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
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

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1">Device:</span>
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  platform === p
                    ? 'bg-orange-500/20 border border-orange-500 text-orange-600 dark:text-amber-400'
                    : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((app) => (
          <div
            key={app.id}
            className="group flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 hover:border-orange-500/50 transition shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  {app.pricing}
                </span>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{app.rating.toFixed(1)}</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-orange-500 transition">
                  {app.name}
                </h3>
                <p className="text-[11px] text-orange-600 dark:text-amber-400 font-semibold">{app.category}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{app.description}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500">Supports:</span>
                {app.platforms.map((p) => (
                  <span key={p} className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300">
                    {p}
                  </span>
                ))}
              </div>

              <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {app.pros.map((pro, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{pro}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Vetted Tool</span>
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600/15 border border-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-600 dark:text-amber-400 hover:bg-orange-600 hover:text-white transition"
              >
                <span>Get App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
