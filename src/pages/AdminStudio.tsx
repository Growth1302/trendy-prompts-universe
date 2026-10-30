import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { store } from '../services/store';
import { PromptItem, Category, ReportItem } from '../types';
import { useToast } from '../context/ToastContext';
import { updatePageSEO } from '../utils/seo';
import {
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  Flag,
  Tag,
  Sparkles,
  ArrowLeft,
  Edit,
  ExternalLink,
  Search,
  Check,
  X,
  Eye,
  RefreshCw,
  Image,
} from 'lucide-react';

export const AdminStudio: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'upload' | 'prompts' | 'moderation' | 'categories' | 'reports'>('upload');

  // Prompts and data state
  const [prompts, setPrompts] = useState<PromptItem[]>(() => store.getAllPromptsForAdmin());
  const [categories, setCategories] = useState<Category[]>(() => store.getCategories());
  const [reports, setReports] = useState<ReportItem[]>(() => store.getReports());

  // Refresh data from store
  const refreshData = () => {
    setPrompts(store.getAllPromptsForAdmin());
    setCategories(store.getCategories());
    setReports(store.getReports());
  };

  React.useEffect(() => {
    updatePageSEO({
      title: 'Admin Creative Studio — Trendy Prompts Universe',
      description: 'Manage prompts, upload new artwork, review submissions, and configure categories.',
    });
  }, []);

  // --- UPLOAD FORM STATE ---
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formNegativePrompt, setFormNegativePrompt] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [formCategoryId, setFormCategoryId] = useState(categories[0]?.id || 'fashion');
  const [formModel, setFormModel] = useState('Midjourney v6.1');
  const [formAspectRatio, setFormAspectRatio] = useState('16:9');
  const [formStatus, setFormStatus] = useState<'published' | 'draft' | 'pending_review'>('published');
  const [formTagInput, setFormTagInput] = useState('');
  const [formTags, setFormTags] = useState<string[]>(['cinematic', 'art']);
  const [formCreatorName, setFormCreatorName] = useState('Admin Studio');
  const [formCreatorHandle, setFormCreatorHandle] = useState('@trendyadmin');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // Common tags suggestion pool
  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 12);
  }, [prompts]);

  // Handle Tag addition
  const handleAddTag = (tagStr: string) => {
    const cleaned = tagStr.trim().toLowerCase().replace(/^[#\s]+/, '');
    if (cleaned && !formTags.includes(cleaned) && formTags.length < 10) {
      setFormTags([...formTags, cleaned]);
    }
    setFormTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(formTagInput);
    }
  };

  const handleRemoveTag = (t: string) => {
    setFormTags(formTags.filter((tag) => tag !== t));
  };

  // Handle File Upload preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        setFormImagePreview(res);
        setFormImageUrl(res);
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-slug update when typing title if not editing manually
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!editingPromptId) {
      setFormSlug(store.generateUniqueSlug(val));
    }
  };

  // Submit New or Edited Prompt
  const handleSavePrompt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim() || !formPrompt.trim() || !formImageUrl.trim()) {
      showToast('Please fill all required fields (title, prompt, image)', 'error');
      return;
    }

    if (editingPromptId) {
      // Update existing
      store.updatePrompt(editingPromptId, {
        title: formTitle,
        slug: formSlug,
        prompt: formPrompt,
        negativePrompt: formNegativePrompt || undefined,
        imageUrl: formImageUrl,
        categoryId: formCategoryId,
        model: formModel,
        aspectRatio: formAspectRatio,
        status: formStatus,
        tags: formTags,
        creator: {
          name: formCreatorName,
          handle: formCreatorHandle,
        },
      });
      showToast('Prompt updated successfully!');
      setEditingPromptId(null);
    } else {
      // Create new
      store.createPrompt({
        title: formTitle,
        slug: formSlug,
        prompt: formPrompt,
        negativePrompt: formNegativePrompt || undefined,
        imageUrl: formImageUrl,
        categoryId: formCategoryId,
        model: formModel,
        aspectRatio: formAspectRatio,
        status: formStatus,
        tags: formTags,
        creator: {
          name: formCreatorName,
          handle: formCreatorHandle,
        },
      });
      showToast('Prompt published to Universe!');
    }

    // Reset form
    setFormTitle('');
    setFormSlug('');
    setFormPrompt('');
    setFormNegativePrompt('');
    setFormImageUrl('');
    setFormImagePreview(null);
    setFormTags(['art', 'ai']);
    refreshData();
    setActiveTab('prompts');
  };

  // Edit existing prompt
  const handleStartEdit = (p: PromptItem) => {
    setEditingPromptId(p.id);
    setFormTitle(p.title);
    setFormSlug(p.slug);
    setFormPrompt(p.prompt);
    setFormNegativePrompt(p.negativePrompt || '');
    setFormImageUrl(p.imageUrl);
    setFormImagePreview(p.imageUrl);
    setFormCategoryId(p.categoryId);
    setFormModel(p.model);
    setFormAspectRatio(p.aspectRatio);
    setFormStatus(p.status);
    setFormTags(p.tags);
    setFormCreatorName(p.creator.name);
    setFormCreatorHandle(p.creator.handle || '');
    setActiveTab('upload');
  };

  // Delete Prompt & Image in single option
  const handleDeletePrompt = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}" and its image?`)) {
      store.deletePrompt(id);
      refreshData();
      if (editingPromptId === id) {
        setEditingPromptId(null);
        setFormTitle('');
        setFormSlug('');
        setFormPrompt('');
        setFormImageUrl('');
        setFormImagePreview(null);
      }
      showToast(`Deleted "${title}" and image`, 'info');
    }
  };

  // Moderation: Approve & Publish
  const handleApproveSubmission = (p: PromptItem) => {
    store.updatePrompt(p.id, { status: 'published' });
    refreshData();
    showToast(`Approved and published "${p.title}"!`);
  };

  // Moderation: Reject
  const handleRejectSubmission = (p: PromptItem) => {
    store.deletePrompt(p.id);
    refreshData();
    showToast(`Rejected submission "${p.title}"`, 'info');
  };

  // Category Management Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatSlug.trim() || newCatName.toLowerCase().replace(/[^\w-]/g, '');

    // Prevent duplicate category slug
    if (categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) {
      showToast('Category with this slug already exists', 'error');
      return;
    }

    store.createCategory({
      name: newCatName.trim(),
      slug,
      description: newCatDesc.trim() || `${newCatName} prompts`,
      order: categories.length + 1,
      isActive: true,
    });

    setNewCatName('');
    setNewCatSlug('');
    setNewCatDesc('');
    refreshData();
    showToast(`Created category "${newCatName}"!`);
  };

  const handleToggleCategoryActive = (cat: Category) => {
    store.updateCategory(cat.id, { isActive: !cat.isActive });
    refreshData();
    showToast(`Category ${cat.name} is now ${!cat.isActive ? 'Active' : 'Inactive'}`);
  };

  // Dismiss report
  const handleDismissReport = (repId: string) => {
    store.updateReportStatus(repId, 'dismissed');
    refreshData();
    showToast('Report dismissed');
  };

  const handleUnpublishReported = (repId: string, promptId: string) => {
    store.updatePrompt(promptId, { status: 'draft' });
    store.updateReportStatus(repId, 'resolved');
    refreshData();
    showToast('Reported artwork set to Draft status');
  };

  // Filter prompts for "All Prompts" tab
  const [promptSearch, setPromptSearch] = useState('');
  const filteredAdminPrompts = useMemo(() => {
    if (!promptSearch.trim()) return prompts;
    const q = promptSearch.toLowerCase();
    return prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.categoryId.toLowerCase().includes(q)
    );
  }, [prompts, promptSearch]);

  const pendingSubmissions = useMemo(() => {
    return prompts.filter((p) => p.status === 'pending_review');
  }, [prompts]);

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            title="Return to Universe"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
                Admin Creative Studio
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Publish AI art, manage structured prompt metadata, approve submissions, and configure categories.
            </p>
          </div>
        </div>

        {/* Global Reset Demo Data helper */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all categories and prompts to original curated seed dataset?')) {
              store.resetToDefault();
              refreshData();
              showToast('Reset to original curated seed dataset!');
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-4 border-b border-zinc-800/80 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
            if (editingPromptId) setEditingPromptId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{editingPromptId ? 'Edit Prompt' : 'Upload New Prompt'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'prompts'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Prompts ({prompts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer relative ${
            activeTab === 'moderation'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Submissions Queue</span>
          {pendingSubmissions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingSubmissions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer relative ${
            activeTab === 'reports'
              ? 'bg-violet-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Reports</span>
          {reports.filter((r) => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {reports.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: UPLOAD & EDIT PROMPT */}
      {activeTab === 'upload' && (
        <form onSubmit={handleSavePrompt} className="py-8 max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-display">
              {editingPromptId ? 'Edit AI Prompt & Metadata' : 'Publish New Artwork & Prompt'}
            </h2>
            {editingPromptId && (
              <button
                type="button"
                onClick={() => {
                  setEditingPromptId(null);
                  setFormTitle('');
                  setFormSlug('');
                  setFormPrompt('');
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel Editing
              </button>
            )}
          </div>

          {/* Section: Image & Preview */}
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">1. Artwork Image</h3>
              {editingPromptId ? (
                <button
                  type="button"
                  onClick={() => handleDeletePrompt(editingPromptId, formTitle || 'current prompt')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-colors cursor-pointer"
                  title="Delete entire prompt and image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Prompt & Image</span>
                </button>
              ) : formImagePreview ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormImageUrl('');
                    setFormImagePreview(null);
                    showToast('Image cleared from form', 'info');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="Clear uploaded image"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Image</span>
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Upload Local Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Or Image URL / Path
                  </label>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => {
                      setFormImageUrl(e.target.value);
                      setFormImagePreview(e.target.value);
                    }}
                    placeholder="/src/assets/images/... or https://..."
                    className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 min-h-[140px] flex items-center justify-center relative group">
                {formImagePreview ? (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                    <img
                      src={formImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageUrl('');
                        setFormImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-zinc-800 text-white hover:text-zinc-200 border border-zinc-700 transition-colors cursor-pointer shadow-md"
                      title="Clear image preview"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-xs flex flex-col items-center gap-1.5 py-4">
                    <Upload className="w-5 h-5 text-zinc-600" />
                    <span>Image preview will appear here</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Title & Unique Slug */}
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">2. Title & Unique URL Slug</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Futuristic Cyberpunk Highway Dusk"
                  className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Unique Slug (URL identifier) *
                </label>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. futuristic-cyberpunk-highway-dusk"
                  className="w-full p-2.5 text-xs font-mono bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-300 focus:outline-none focus:border-violet-500"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Page URL: /prompts/{formSlug || '...'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Full Prompt */}
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">3. Full AI Prompt Text</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Prompt Text *
              </label>
              <textarea
                required
                rows={4}
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="Enter complete prompt parameters, lighting, styling..."
                className="w-full p-2.5 text-xs font-mono bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500 leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Negative Prompt (optional)
              </label>
              <input
                type="text"
                value={formNegativePrompt}
                onChange={(e) => setFormNegativePrompt(e.target.value)}
                placeholder="e.g. blurry, low-res, artifacting"
                className="w-full p-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Section: Category, Model, Status */}
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">4. Taxonomy & Publishing Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Category *</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">AI Engine</label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="Midjourney v6.1">Midjourney v6.1</option>
                  <option value="Flux.1 Dev">Flux.1 Dev</option>
                  <option value="Flux.1 Schnell">Flux.1 Schnell</option>
                  <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                  <option value="Niji Journey v6">Niji Journey v6</option>
                  <option value="DALL-E 3">DALL-E 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Aspect Ratio</label>
                <select
                  value={formAspectRatio}
                  onChange={(e) => setFormAspectRatio(e.target.value)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Status *</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="published">Published (Live)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="pending_review">Pending Review</option>
                </select>
              </div>
            </div>

            {/* Tags with suggestions */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                <span>Search Tags (Chips)</span>
                <span className="text-zinc-500 text-[11px]">Type and press Enter</span>
              </label>

              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-950 border border-zinc-700 rounded-xl">
                {formTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-xs text-zinc-200 border border-zinc-700"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={formTagInput}
                  onChange={(e) => setFormTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={formTags.length < 10 ? 'Add tag...' : ''}
                  className="flex-1 min-w-[100px] bg-transparent text-xs text-zinc-200 focus:outline-none py-1 px-1"
                />
              </div>

              {/* Suggestions */}
              {allExistingTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-zinc-500">
                  <span className="text-[11px]">Suggested:</span>
                  {allExistingTags
                    .filter((t) => !formTags.includes(t))
                    .slice(0, 8)
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddTag(t)}
                        className="text-[11px] hover:text-violet-400 bg-zinc-900 px-2 py-0.5 rounded transition-colors"
                      >
                        +{t}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/30 transition-all cursor-pointer"
            >
              {editingPromptId ? 'Save Prompt Changes' : 'Publish Prompt'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ALL PROMPTS TABLE */}
      {activeTab === 'prompts' && (
        <div className="py-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                placeholder="Search prompts by title, slug, category..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
              />
            </div>
            <span className="text-xs text-zinc-500">
              Total {filteredAdminPrompts.length} prompts
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Artwork</th>
                    <th className="py-3 px-4">Title & Slug</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Stats</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredAdminPrompts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-2.5 px-4">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.title}
                            className="w-12 h-10 object-cover rounded-md border border-zinc-800"
                          />
                        ) : (
                          <div
                            className="w-12 h-10 rounded-md bg-zinc-900 border border-zinc-800/80 flex flex-col items-center justify-center text-zinc-600"
                            title="No image"
                          >
                            <Image className="w-3.5 h-3.5 text-zinc-600" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-zinc-200">
                        <div className="max-w-xs truncate">{p.title}</div>
                        <div className="font-mono text-[10px] text-zinc-500 truncate">
                          /{p.slug}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 capitalize text-violet-400 font-medium">
                        {p.categoryId}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                        {p.model}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'pending_review'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400 tabular-nums">
                        {p.copiesCount} copies · {p.viewsCount} views
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1 sm:space-x-2">
                        <Link
                          to={`/prompts/${p.slug}`}
                          className="p-1 text-zinc-400 hover:text-white inline-block"
                          title="View live page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="p-1 text-zinc-400 hover:text-violet-300 inline-block transition-colors cursor-pointer"
                          title="Edit Prompt"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(p.id, p.title)}
                          className="p-1 text-zinc-400 hover:text-rose-400 inline-block transition-colors cursor-pointer"
                          title="Delete Prompt & Image"
                          aria-label={`Delete prompt and image for ${p.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODERATION QUEUE */}
      {activeTab === 'moderation' && (
        <div className="py-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white font-display">
              Submissions Moderation Queue
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Community submissions remain pending until approved by an administrator.
            </p>
          </div>

          {pendingSubmissions.length > 0 ? (
            <div className="space-y-4">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row gap-5 items-start justify-between"
                >
                  <div className="flex gap-4 items-start max-w-2xl">
                    <img
                      src={sub.imageUrl}
                      alt={sub.title}
                      className="w-24 h-20 object-cover rounded-xl border border-zinc-800 shrink-0"
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{sub.title}</span>
                        <span className="text-violet-400 text-xs capitalize">· {sub.categoryId}</span>
                      </div>
                      <p className="text-xs font-mono text-zinc-300 line-clamp-2 bg-zinc-950 p-2 rounded-lg border border-zinc-900">
                        {sub.prompt}
                      </p>
                      <div className="text-[11px] text-zinc-500">
                        Submitted on {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRejectSubmission(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveSubmission(sub)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-950/40 text-zinc-500 text-xs">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400/60" />
              <span>No pending submissions in the moderation queue!</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Create Category Form */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Add New Category</h3>
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value);
                      if (!newCatSlug) {
                        setNewCatSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ''));
                      }
                    }}
                    placeholder="e.g. Cybernetics"
                    className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Slug ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="e.g. cybernetics"
                    className="w-full p-2 text-xs font-mono bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Brief description of styles in this category..."
                    className="w-full p-2 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors cursor-pointer"
                >
                  Create Category
                </button>
              </form>
            </div>

            {/* Existing Categories List */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200">
                Existing Categories ({categories.length})
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">{cat.name}</span>
                        <span className="font-mono text-[10px] text-zinc-500">({cat.slug})</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{cat.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCategoryActive(cat)}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        cat.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <div className="py-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white font-display">Reported Content</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Review flagged artwork for guideline violations or copyright claims.
            </p>
          </div>

          {reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-rose-400">{rep.reason}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-200 font-medium">{rep.promptTitle}</span>
                    </div>
                    {rep.details && (
                      <p className="text-zinc-400 text-[11px]">"{rep.details}"</p>
                    )}
                    <span className="text-[10px] text-zinc-500 block">
                      Status: {rep.status} · {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleDismissReport(rep.id)}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 rounded-md"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnpublishReported(rep.id, rep.promptId)}
                        className="px-3 py-1 text-xs text-rose-300 hover:text-white bg-rose-950 border border-rose-800 rounded-md"
                      >
                        Unpublish Artwork
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-950/40 text-zinc-500 text-xs">
              <span>No user reports submitted. All clear!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
