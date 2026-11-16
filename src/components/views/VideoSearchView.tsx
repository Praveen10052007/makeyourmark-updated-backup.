import React, { useState, useMemo } from 'react';
import {
  Video,
  Search,
  Play,
  X,
  ExternalLink,
  Filter,
  Clock,
  Tag,
  Bookmark,
  Loader2,
  Info,
} from 'lucide-react';
import { EDUCATIONAL_VIDEOS } from '../../data/mockData';
import { EducationalVideo, CareerRoadmapPlan } from '../../types';
import { searchYouTubeVideos, YouTubeSearchVideo } from '../../services/api';

interface Props {
  bookmarkedVideos?: string[];
  onToggleBookmark?: (videoId: string) => void;
  generatedRoadmaps?: CareerRoadmapPlan[];
}

export const VideoSearchView: React.FC<Props> = ({
  bookmarkedVideos = [],
  onToggleBookmark,
  generatedRoadmaps = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [activeVideo, setActiveVideo] = useState<{ title: string; channel: string; youtubeId: string; description: string } | null>(null);

  const [liveLoading, setLiveLoading] = useState(false);
  const [liveResults, setLiveResults] = useState<YouTubeSearchVideo[]>([]);
  const [liveSearchMeta, setLiveSearchMeta] = useState<{
    liveApi: boolean;
    youtubeSearchUrl: string;
    message?: string;
    query: string;
  } | null>(null);

  const categories = ['All', 'Bookmarked', 'Computer Science', 'Web Development', 'AI & ML', 'DevOps & Cloud', 'Career & Interview'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const roadmapTopics = useMemo(() => {
    const topics: string[] = [];
    generatedRoadmaps.forEach((rm) => {
      rm.stages?.forEach((st) => {
        st.skills?.slice(0, 3).forEach((sk) => {
          topics.push(sk.name);
        });
      });
    });
    return Array.from(new Set(topics)).slice(0, 6);
  }, [generatedRoadmaps]);

  const filteredVideos = useMemo(() => {
    return EDUCATIONAL_VIDEOS.filter((video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'Bookmarked' ? bookmarkedVideos.includes(video.id) : video.category === selectedCategory);

      const matchesDifficulty = selectedDifficulty === 'All' || video.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty, bookmarkedVideos]);

  const handleYouTubeSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    setSearchQuery(q);
    setLiveLoading(true);
    try {
      const res = await searchYouTubeVideos(q);
      setLiveResults(res.videos || []);
      setLiveSearchMeta({
        liveApi: res.liveApi,
        youtubeSearchUrl: res.youtubeSearchUrl,
        message: res.message,
        query: res.query,
      });
    } catch (err: any) {
      setLiveResults([]);
      setLiveSearchMeta({
        liveApi: false,
        youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        message: err.message || 'YouTube search request failed. Open YouTube directly below.',
        query: q,
      });
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Video className="w-4 h-4" />
            <span>YouTube Learning Courses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            Video Courses & Lectures
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Curated full-length lectures plus live YouTube topic search. Click any video to load the player on demand (zero autoplay).
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 space-y-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleYouTubeSearch(searchQuery);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials (e.g. System Design, React 19, Docker, SQL, VLSI)..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={liveLoading || !searchQuery.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {liveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search YouTube
          </button>
        </form>

        {/* Roadmap Topic Shortcuts */}
        {roadmapTopics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-500">From your Roadmap:</span>
            {roadmapTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleYouTubeSearch(topic)}
                className="rounded-lg bg-orange-500/10 border border-orange-500/25 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:text-amber-400 hover:bg-orange-500/20"
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-orange-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Level:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              aria-label="Filter videos by difficulty level"
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:border-orange-500 focus:outline-none"
            >
              {difficulties.map((diff) => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live YouTube Search Status & Results */}
      {liveSearchMeta && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span>
                {liveSearchMeta.liveApi
                  ? `Showing live YouTube results for "${liveSearchMeta.query}".`
                  : liveSearchMeta.message ||
                    `YouTube Data API key is not configured on the server. Open verified YouTube search results for "${liveSearchMeta.query}" directly:`}
              </span>
            </div>
            <a
              href={liveSearchMeta.youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3.5 py-2 text-xs font-bold text-white transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Search "{liveSearchMeta.query}" on YouTube
            </a>
          </div>

          {liveResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {liveResults.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-hidden flex flex-col justify-between"
                >
                  <div
                    onClick={() =>
                      setActiveVideo({
                        title: v.title,
                        channel: v.channel,
                        youtubeId: v.youtubeId,
                        description: v.description,
                      })
                    }
                    className="relative aspect-video bg-black cursor-pointer group"
                  >
                    {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition" />}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-11 w-11 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="text-[11px] font-semibold text-orange-600 dark:text-amber-400">{v.channel}</div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2">{v.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Curated Video Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVideos.map((video: EducationalVideo) => {
          const isBookmarked = bookmarkedVideos.includes(video.id);
          return (
            <div
              key={video.id}
              className="group flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] hover:border-orange-500/50 transition overflow-hidden shadow-sm"
            >
              <div
                onClick={() =>
                  setActiveVideo({
                    title: video.title,
                    channel: video.channel,
                    youtubeId: video.youtubeId,
                    description: video.description,
                  })
                }
                className="relative aspect-video w-full bg-zinc-900 flex items-center justify-center cursor-pointer overflow-hidden"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-xl group-hover:scale-110 transition">
                  <Play className="w-5 h-5 ml-0.5" />
                </div>
                <div className="absolute top-3 left-3 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  {video.category}
                </div>
                {onToggleBookmark && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(video.id);
                    }}
                    aria-label="Bookmark video"
                    className="absolute top-2.5 right-2.5 rounded-lg bg-black/70 p-1.5 text-white hover:text-amber-400"
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                )}
                <div className="absolute bottom-2.5 right-3 flex items-center gap-1 rounded-md bg-black/80 px-2 py-0.5 text-[10px] text-white">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>{video.duration}</span>
                </div>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{video.channel}</span>
                    <span
                      className={`font-semibold ${
                        video.difficulty === 'Beginner'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : video.difficulty === 'Intermediate'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {video.difficulty}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-orange-500 transition line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{video.description}</p>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-wrap gap-1">
                    {video.topics.slice(0, 3).map((topic, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-300"
                      >
                        <Tag className="w-2.5 h-2.5 text-zinc-400" />
                        <span>{topic}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setActiveVideo({
                          title: video.title,
                          channel: video.channel,
                          youtubeId: video.youtubeId,
                          description: video.description,
                        })
                      }
                      className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-amber-400 hover:underline"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Load Player</span>
                    </button>

                    <a
                      href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* On-Demand Video Player Modal (NO autoplay) */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="truncate pr-4">
                <span className="text-xs font-bold text-orange-600 dark:text-amber-400 mr-2">{activeVideo.channel}</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{activeVideo.title}</span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=0&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-4 text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-between gap-4">
              <p className="line-clamp-2">{activeVideo.description}</p>
              <button
                onClick={() => setActiveVideo(null)}
                className="shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
