import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Grid, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../services/store';

interface HeroProps {
  onSearch: (query: string) => void;
  onOpenSubmit?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSearch }) => {
  const store = useStore();
  const [searchInput, setSearchInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);

  const categories = store.getCategories();
  const publishedPrompts = useMemo(() => store.getPublishedPrompts().prompts, [store.version]);

  const query = searchInput.trim().toLowerCase();

  // Compute matching categories and prompt titles in real time
  const suggestions = useMemo(() => {
    if (!query) return { categories: [], titles: [] };

    // 1. Matching Categories
    const matchedCategories = categories
      .filter((c) => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query))
      .slice(0, 3);

    // 2. Matching Prompt Titles
    const matchedTitles = publishedPrompts
      .filter((p) => p.title.toLowerCase().includes(query))
      .slice(0, 4);

    return {
      categories: matchedCategories,
      titles: matchedTitles,
    };
  }, [query, categories, publishedPrompts]);

  const hasSuggestions =
    suggestions.categories.length > 0 ||
    suggestions.titles.length > 0;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerSearch = (term: string) => {
    setSearchInput(term);
    onSearch(term);
    setIsOpen(false);
    const galleryEl = document.getElementById('gallery');
    if (galleryEl) {
      galleryEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      triggerSearch(searchInput.trim());
    }
  };

  return (
    <section className="relative overflow-visible pt-8 pb-6 lg:pt-12 lg:pb-8 border-b border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/60">
      {/* Ambient background light gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40 blur-3xl">
        <div className="w-96 h-72 rounded-full bg-violet-600/30 absolute left-1/4 -top-12 mix-blend-screen" />
        <div className="w-80 h-72 rounded-full bg-indigo-500/20 absolute right-1/4 -top-8 mix-blend-screen" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start space-y-6 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display tracking-tight text-white text-balance leading-[1.12]"
          >
            Discover the Prompt Behind Every Image.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
            className="text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed"
          >
            Explore incredible AI art. Copy verified prompts with a single click. Uncover the exact parameters, models, and artistic styles behind trending creations.
          </motion.p>

          {/* Prominent Search Bar with Real-Time Suggestions Dropdown */}
          <motion.form
            ref={containerRef}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
            onSubmit={handleSearchSubmit}
            className="w-full max-w-xl relative flex items-center group z-30"
          >
            <div className="absolute left-4 text-zinc-400 group-focus-within:text-violet-400 transition-colors pointer-events-none z-10">
              <Search className="w-5 h-5" />
            </div>
            <input
              id="search-input"
              type="text"
              value={searchInput}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setIsOpen(true);
              }}
              placeholder="Search prompts, keywords, tags..."
              className="w-full pl-12 pr-32 py-3.5 text-sm rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-600 focus:border-violet-500 text-zinc-100 placeholder:text-zinc-500 shadow-xl shadow-black/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors cursor-pointer active:scale-95 shadow-sm z-10"
            >
              Search
            </button>

            {/* Real-time Suggestions Dropdown Modal */}
            <AnimatePresence>
              {isOpen && hasSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-zinc-950/95 border border-zinc-800/90 backdrop-blur-xl shadow-2xl overflow-hidden p-2 text-xs space-y-2"
                >
                  {/* Category Suggestions */}
                  {suggestions.categories.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Grid className="w-3 h-3 text-violet-400" />
                        <span>Categories</span>
                      </div>
                      {suggestions.categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => triggerSearch(cat.name)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-zinc-200 hover:text-white hover:bg-zinc-900/90 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-violet-300">{cat.name}</span>
                          <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">{cat.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Prompt Title Suggestions */}
                  {suggestions.titles.length > 0 && (
                    <div className={suggestions.categories.length > 0 ? 'pt-1 border-t border-zinc-900' : ''}>
                      <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        <span>Prompts</span>
                      </div>
                      {suggestions.titles.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => triggerSearch(p.title)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-zinc-200 hover:text-white hover:bg-zinc-900/90 transition-colors cursor-pointer group"
                        >
                          <span className="font-medium text-zinc-200 group-hover:text-violet-300 truncate">{p.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </div>
      </div>
    </section>
  );
};
