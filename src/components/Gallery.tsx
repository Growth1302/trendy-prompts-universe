import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Category, PromptItem } from '../types';
import { useStore } from '../services/store';
import { PromptCard } from './PromptCard';
import { Search, X, SlidersHorizontal, ArrowUpDown, RefreshCw, Compass } from 'lucide-react';

interface GalleryProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  categories,
  searchQuery,
  onSearchChange,
}) => {
  const store = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get('category') || 'all';
  const activeSort = (searchParams.get('sort') as 'trending' | 'latest' | 'popular') || 'trending';
  const activeTag = searchParams.get('tag') || '';

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // Sync internal search input
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Handle category change
  const handleCategorySelect = (categoryId: string) => {
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (categoryId === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryId);
    }
    setSearchParams(newParams);
  };

  // Handle sort change
  const handleSortChange = (sort: 'trending' | 'latest' | 'popular') => {
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sort);
    setSearchParams(newParams);
  };

  // Handle tag selection
  const handleSelectTag = (tag: string) => {
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tag', tag);
    setSearchParams(newParams);
  };

  // Handle tag clear
  const handleClearTag = () => {
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('tag');
    setSearchParams(newParams);
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setPage(1);
    onSearchChange('');
    setLocalSearch('');
    const newParams = new URLSearchParams();
    setSearchParams(newParams);
  };

  // Fetch prompts matching filters and pagination
  const { prompts, total, hasMore } = useMemo(() => {
    return store.getPublishedPrompts({
      categoryId: activeCategory,
      search: searchQuery,
      tag: activeTag,
      sort: activeSort,
      page,
      limit: PAGE_SIZE,
    });
  }, [activeCategory, searchQuery, activeTag, activeSort, page, store.version]);

  const activeCategoriesList = useMemo(() => {
    return categories.filter((c) => c.isActive);
  }, [categories]);

  // Category name map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const hasActiveFilters = Boolean(
    (activeCategory && activeCategory !== 'all') || searchQuery || activeTag
  );

  return (
    <section id="gallery" className="pt-6 sm:pt-8 pb-12 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-end gap-6 mb-4">

        {/* Sort and View Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            <span className="text-zinc-500 pl-2 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSortChange('trending')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeSort === 'trending'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Trending
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('latest')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeSort === 'latest'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Latest
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('popular')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeSort === 'popular'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Most Copied
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs (Interactive Filter Controls) */}
      <div id="categories" className="mb-6 overflow-x-auto pb-2 no-scrollbar scroll-mt-24">
        <div className="flex items-center gap-1.5 min-w-max p-1 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => handleCategorySelect('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            All Universe ({store.getPublishedPrompts().total})
          </button>
          {activeCategoriesList.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Search & Filter Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          {activeTag && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 text-violet-300 px-2 py-0.5 rounded-md">
              <span>Tag: #{activeTag}</span>
              <button
                type="button"
                onClick={handleClearTag}
                className="hover:text-white transition-colors cursor-pointer"
                aria-label="Remove tag filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {searchQuery && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 text-violet-300 px-2 py-0.5 rounded-md">
              <span>Search: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-white transition-colors cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {activeCategory !== 'all' && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 text-violet-300 px-2 py-0.5 rounded-md">
              <span>Category: {categoryMap.get(activeCategory) || activeCategory}</span>
              <button
                type="button"
                onClick={() => handleCategorySelect('all')}
                className="hover:text-white transition-colors cursor-pointer"
                aria-label="Clear category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-xs text-zinc-400 hover:text-violet-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      {prompts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt, idx) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              categoryName={categoryMap.get(prompt.categoryId)}
              index={idx}
              onSelectTag={handleSelectTag}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center flex flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-8">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
            <Compass className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 font-display">No prompts found</h3>
          <p className="text-sm text-zinc-400 max-w-md mt-1 mb-6">
            We couldn't find any published prompts matching your current search or category filters. Try clearing filters or exploring other categories.
          </p>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors cursor-pointer shadow-md shadow-violet-900/30"
          >
            Clear All Filters & Show All
          </button>
        </div>
      )}

      {/* Load More Pagination */}
      {hasMore && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 transition-all shadow-md cursor-pointer active:scale-98"
          >
            <span>Load More Prompts</span>
            <span className="text-xs text-zinc-500 tabular-nums">({total - prompts.length} remaining)</span>
          </button>
        </div>
      )}
    </section>
  );
};
