import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../services/store';
import { PromptItem } from '../types';
import { updatePageSEO, getCanonicalPromptUrl, updateStructuredData } from '../utils/seo';
import { copyTextToClipboard, shareLink } from '../utils/share';
import { useToast } from '../context/ToastContext';
import { PromptCard } from '../components/PromptCard';
import {
  Copy,
  Check,
  Share2,
  ArrowLeft,
  Heart,
  Flag,
  Sparkles,
  AlertTriangle,
  X,
  Trash2,
  Edit3,
  Save,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PromptDetail: React.FC = () => {
  const store = useStore();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [prompt, setPrompt] = useState<PromptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Community Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editModel, setEditModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Deletion State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories = useMemo(() => store.getCategories(), []);

  // Ref to prevent repeated view count increments for the same slug
  const viewIncrementedSlugRef = React.useRef<string | null>(null);

  // 1. Increment view count once per unique slug
  useEffect(() => {
    if (slug && viewIncrementedSlugRef.current !== slug) {
      viewIncrementedSlugRef.current = slug;
      store.incrementViewCount(slug);
    }
  }, [slug]);

  // 2. Load and sync prompt data when slug or store version updates
  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadPrompt = async () => {
      // Synchronous lookup from store
      let found = store.getPromptBySlugOrId(slug);

      // Async fetch directly from Supabase if page was opened via direct URL or refresh
      if (!found) {
        found = await store.fetchPromptByIdentifier(slug);
      }

      if (!isMounted) return;

      if (found) {
        setPrompt({ ...found });
        if (!isEditing) {
          setEditTitle(found.title);
          setEditPrompt(found.prompt);
          setEditCategory(found.categoryId);
          setEditModel(found.model);
        }

        const canonical = getCanonicalPromptUrl(found.slug);
        updatePageSEO({
          title: `${found.title} — AI Art Prompt | Trendy Prompts Universe`,
          description: `Explore and copy the exact prompt for "${found.title}": "${found.prompt.slice(0, 140)}..."`,
          canonicalUrl: canonical,
          imageUrl: found.imageUrl,
          type: 'article',
        });

        updateStructuredData({
          "@context": "https://schema.org",
          "@type": "VisualArtwork",
          "name": found.title,
          "description": found.prompt,
          "image": found.imageUrl,
          "artMedium": found.model || "AI Generated",
          "creator": {
            "@type": "Person",
            "name": found.creator?.name || "Community Creator"
          }
        });
      } else {
        setPrompt(null);
      }
      setLoading(false);
    };

    loadPrompt();
  }, [slug, store.version]);

  // 3. Scroll to top on route navigate
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    const success = await copyTextToClipboard(prompt.prompt);
    if (success) {
      setCopiedPrompt(true);
      setPrompt((prev) => (prev ? { ...prev, copiesCount: (prev.copiesCount || 0) + 1 } : null));
      store.incrementCopyCount(prompt.slug);
      showToast('Full AI prompt copied to clipboard!', 'success');
      setTimeout(() => setCopiedPrompt(false), 2400);
    }
  };

  const handleShareLink = async () => {
    if (!prompt) return;
    // Always generate canonical website URL using domain + prompt route
    const canonicalUrl = getCanonicalPromptUrl(prompt.slug);
    const result = await shareLink({
      title: `${prompt.title} — Trendy Prompts Universe`,
      text: `Discover the AI prompt for "${prompt.title}" on Trendy Prompts Universe`,
      url: canonicalUrl,
    });
    if (result.success && result.method !== 'native') {
      showToast('Prompt page URL copied to clipboard!', 'success');
    }
  };

  const handleToggleFav = () => {
    if (!prompt) return;
    const updated = store.toggleFavorite(prompt.id);
    showToast(updated ? 'Saved to favorites' : 'Removed from favorites', 'info');
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setReportSubmitting(true);
    store.reportPrompt(prompt.id, reportReason, reportDetails);
    setReportSubmitting(false);
    setReportModalOpen(false);
    showToast('Report received. Thank you.', 'info');
  };

  const handleSaveEdit = async () => {
    if (!prompt) return;
    if (!editTitle.trim() || !editPrompt.trim()) {
      showToast('Title and Prompt are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await store.updatePrompt(prompt.id, {
        title: editTitle,
        prompt: editPrompt,
        categoryId: editCategory,
        model: editModel,
      });
      setIsEditing(false);
      showToast('Community edit saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save edits', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!prompt) return;
    setIsDeleting(true);
    try {
      await store.deletePrompt(prompt.id);
      showToast('Prompt has been deleted by the community', 'info');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete prompt', 'error');
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <span className="text-sm text-zinc-400">Loading prompt details...</span>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">Prompt Not Found</h1>
        <p className="text-zinc-400 max-w-md mx-auto mt-2 mb-8 text-sm">
          The requested prompt may have been deleted by the community.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg">
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Universe Gallery</span>
        </Link>
      </div>
    );
  }

  const category = store.getCategoryById(prompt.categoryId);
  const relatedPrompts = store.getRelatedPrompts(prompt, 3);
  const isFav = store.isFavorite(prompt.id);

  return (
    <div className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-400">
        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Universe</span>
        </Link>
        <span>/</span>
        <span className="text-zinc-200 font-medium truncate">{prompt.title}</span>
      </nav>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Image */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
            {prompt.imageUrl ? (
              <img src={prompt.imageUrl} alt={prompt.title} className="w-full h-auto max-h-[75vh] object-contain mx-auto" />
            ) : (
              <div className="p-12 min-h-[360px] flex flex-col justify-center items-center bg-zinc-900 text-zinc-500">
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p>Artwork not available</p>
              </div>
            )}
            <button onClick={handleToggleFav} className={`absolute top-4 right-4 p-2.5 rounded-xl backdrop-blur-md border transition-all ${isFav ? 'bg-rose-500/20 border-rose-500/60 text-rose-400' : 'bg-zinc-900/80 border-zinc-700/60 text-zinc-300'}`}>
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right Column: Info & Edit */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            {!isEditing ? (
              <>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="text-violet-400 font-medium uppercase tracking-wider">{category?.name || prompt.categoryId}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800/90 shadow-sm">
                    <Copy className="w-3.5 h-3.5 text-violet-400" />
                    <span>{prompt.copiesCount || 0} copies</span>
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">{prompt.title}</h1>
              </>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Artwork Title</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:border-violet-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs outline-none">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <button onClick={handleCopyPrompt} className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-lg shadow-violet-900/30 cursor-pointer whitespace-nowrap">
                  {copiedPrompt ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
                <button onClick={() => setIsEditing(true)} className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Edits</span>
                </button>
                <button onClick={() => { setIsEditing(false); setEditTitle(prompt.title); setEditPrompt(prompt.prompt); }} className="px-5 py-3 rounded-xl font-semibold text-sm text-zinc-400 hover:text-white transition-all">
                  Cancel
                </button>
              </>
            )}
            <button onClick={handleShareLink} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-violet-400" /> AI Prompt</span>
              <span>Open Community Edit</span>
            </div>
            {!isEditing ? (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 leading-relaxed shadow-inner">
                <p className="whitespace-pre-wrap break-words">{prompt.prompt}</p>
              </div>
            ) : (
              <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={6} className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-white focus:border-violet-500 outline-none resize-none" />
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-6 flex items-center justify-between border-t border-zinc-900">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Community Platform</div>
            <div className="flex items-center gap-4">
              <button onClick={() => setDeleteModalOpen(true)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button onClick={() => setReportModalOpen(true)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                <Flag className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete this Prompt?</h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                You are about to delete this community prompt and its associated artwork. This action is permanent and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={handleDeletePrompt} disabled={isDeleting} className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
                </button>
                <button onClick={() => setDeleteModalOpen(false)} disabled={isDeleting} className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Report Modal */}
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold"><Flag className="w-4 h-4 text-amber-400" /> Report Content</div>
                <button onClick={() => setReportModalOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason</label>
                  <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:border-violet-500">
                    <option>Inappropriate content</option>
                    <option>Copyright infringement</option>
                    <option>Broken prompt</option>
                    <option>Spam</option>
                  </select>
                </div>
                <textarea rows={3} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Additional details..." className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:border-violet-500" />
                <button type="submit" disabled={reportSubmitting} className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm">Submit Report</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Related Section */}
      {relatedPrompts.length > 0 && (
        <div className="mt-20 pt-12 border-t border-zinc-900">
          <h2 className="text-xl font-bold font-display text-white mb-8">Related Community Art</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPrompts.map((related, idx) => (
              <PromptCard key={related.id} prompt={related} categoryName={store.getCategoryById(related.categoryId)?.name} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
