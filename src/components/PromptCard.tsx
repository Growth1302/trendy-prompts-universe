import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PromptItem } from '../types';
import { Copy, Check, Heart, ExternalLink, Sparkles, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { copyTextToClipboard, shareLink } from '../utils/share';
import { getCanonicalPromptUrl } from '../utils/seo';
import { useToast } from '../context/ToastContext';
import { useStore } from '../services/store';

interface PromptCardProps {
  prompt: PromptItem;
  categoryName?: string;
  index?: number;
  onSelectTag?: (tag: string) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  categoryName,
  index = 0,
  onSelectTag,
}) => {
  const store = useStore();
  const [copied, setCopied] = useState(false);
  const isFav = store.isFavorite(prompt.id);
  const { showToast } = useToast();

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const success = await copyTextToClipboard(prompt.prompt);
    if (success) {
      setCopied(true);
      store.incrementCopyCount(prompt.slug);
      showToast(`Prompt copied for "${prompt.title}"`, 'success');
      setTimeout(() => setCopied(false), 2200);
    } else {
      showToast('Unable to copy prompt to clipboard', 'error');
    }
  };

  const handleSharePromptLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Generate canonical URL using website domain and prompt route
    const canonicalUrl = getCanonicalPromptUrl(prompt.slug);
    const result = await shareLink({
      title: `${prompt.title} — Trendy Prompts Universe`,
      text: `Discover the AI prompt for "${prompt.title}" on Trendy Prompts Universe`,
      url: canonicalUrl,
    });

    if (result.success && result.method !== 'native') {
      showToast(`Prompt page URL copied for "${prompt.title}"`, 'success');
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const favState = store.toggleFavorite(prompt.id);
    showToast(favState ? 'Added to favorites' : 'Removed from favorites', 'info');
  };

  // Compute aspect ratio class or style to reserve space and prevent layout shifts
  const aspectClass =
    prompt.aspectRatio === '1:1'
      ? 'aspect-square'
      : prompt.aspectRatio === '16:9'
      ? 'aspect-video'
      : 'aspect-[4/3]';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min((index % 3) * 0.08, 0.24), ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group relative rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-colors flex flex-col focus-within:ring-2 focus-within:ring-violet-500"
    >
      {/* Clickable Image Container */}
      <Link
        to={`/prompts/${encodeURIComponent(prompt.slug)}`}
        className={`relative w-full ${aspectClass} overflow-hidden bg-zinc-950 block select-none`}
        tabIndex={0}
        aria-label={`View full details and prompt for ${prompt.title}`}
      >
        {prompt.imageUrl ? (
          <>
            <img
              src={prompt.imageUrl}
              alt={prompt.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center group-hover:scale-[1.04] transition-transform duration-400 ease-out"
            />
            {/* Ambient shadow gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
          </>
        ) : (
          /* High-fidelity CSS mesh container when image is deleted */
          <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/40 p-5 flex flex-col justify-between border-b border-zinc-800/80 relative">
            <div className="flex items-center justify-between text-xs text-violet-400">
              <span className="font-mono text-[11px] uppercase tracking-wider">{categoryName || prompt.categoryId}</span>
              <Sparkles className="w-3.5 h-3.5 text-violet-400/80" />
            </div>
            <p className="font-mono text-xs text-zinc-300 line-clamp-3 leading-relaxed opacity-90 my-auto">
              "{prompt.prompt}"
            </p>
            <div className="text-[10px] text-zinc-500 font-mono">
              Prompt Verified
            </div>
          </div>
        )}

        {/* Top Floating Controls */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={handleSharePromptLink}
            className="p-2 rounded-lg backdrop-blur-md border border-zinc-700/60 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-md"
            aria-label={`Share link for ${prompt.title}`}
            title="Share website prompt link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg backdrop-blur-md border transition-all cursor-pointer ${
              isFav
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            title={isFav ? 'Favorited' : 'Favorite prompt'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Overlay Content at bottom of card preview */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex flex-col justify-end">
          {/* Metadata line: Category */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
            <span className="text-violet-400 font-medium">{categoryName || prompt.categoryId}</span>
          </div>

          <h2 className="text-sm sm:text-base font-semibold text-zinc-100 font-display line-clamp-1 group-hover:text-white transition-colors">
            {prompt.title}
          </h2>

          {/* Quick Action Bar on hover/touch */}
          <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-500 active:scale-95 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
              aria-label={`Copy complete prompt for ${prompt.title}`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>

            <span className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <span>View details</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>

    </motion.article>
  );
};
