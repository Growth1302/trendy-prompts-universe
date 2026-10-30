import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { store } from '../services/store';
import { useToast } from '../context/ToastContext';
import { updatePageSEO } from '../utils/seo';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ArrowLeft,
  Tag,
} from 'lucide-react';
import { motion } from 'motion/react';
import { compressPromptImage } from '../utils/compression';

// Helper function to convert File to Base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const SubmitPrompt: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const categories = useMemo(() => store.getCategories().filter((c) => c.isActive), []);

  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'fashion');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['creative', 'aiart']);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [model, setModel] = useState('Midjourney v6.1');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'compressing' | 'uploading' | 'publishing'>('idle');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  React.useEffect(() => {
    updatePageSEO({
      title: 'Submit Your Prompt — Trendy Prompts Universe',
      description: 'Share your AI image creation and prompt with the Trendy Prompts Universe community. Submissions are automatically published instantly.',
    });
  }, []);

  const handleAddTag = (newTag: string) => {
    const cleaned = newTag.trim().toLowerCase().replace(/^[#\s]+/, '');
    if (cleaned && !tags.includes(cleaned) && tags.length < 8) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPG, PNG, or WebP)', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Image size exceeds 10MB limit.', 'error');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setImageUrl('');
      showToast('Image selected for upload', 'success');
    }
  };

  React.useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImagePreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    if (!title.trim()) {
      showToast('Please enter an artwork title', 'error');
      return;
    }
    if (!promptText.trim()) {
      showToast('Please enter the full AI prompt', 'error');
      return;
    }

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file && !imageUrl.trim()) {
      showToast('Please upload an image file or provide a direct image URL', 'error');
      return;
    }

    if (!consentAccepted) {
      showToast('Please agree to the submission guidelines', 'error');
      return;
    }

    setSubmitting(true);
    
    try {
      let imageBase64: string | undefined = undefined;
      let imageMimeType: string | undefined = undefined;

      if (file) {
        setSubmissionStatus('compressing');
        const compressedFile = await compressPromptImage(file);
        
        setSubmissionStatus('uploading');
        imageBase64 = await fileToBase64(compressedFile);
        imageMimeType = compressedFile.type || file.type || 'image/jpeg';
      }

      setSubmissionStatus('publishing');
      await store.submitCommunityPrompt({
        title: title.trim(),
        prompt: promptText.trim(),
        imageUrl: imageBase64 ? '' : imageUrl.trim(),
        imageBase64,
        imageMimeType,
        categoryId,
        tags,
        model,
        aspectRatio,
        negativePrompt: negativePrompt.trim(),
        creatorName: 'Community Creator',
      });

      setSubmitting(false);
      setSubmissionStatus('idle');
      setSubmittedSuccess(true);
      showToast('Your prompt has been published!', 'success');
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitting(false);
      setSubmissionStatus('idle');
      showToast(err.message || 'Failed to submit prompt. Please try again.', 'error');
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
            Successfully Published!
          </h1>
          <p className="text-zinc-400 mt-2 mb-6 text-sm leading-relaxed">
            Your prompt and artwork have been uploaded, verified, and automatically published to the public gallery.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setTitle('');
                setPromptText('');
                setImageUrl('');
                setImagePreview(null);
                setSubmittedSuccess(false);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Submit Another Prompt
            </button>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
            >
              Return to Universe
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Universe</span>
      </Link>

      <div className="mb-8">
        <div className="text-xs uppercase font-semibold tracking-wider text-violet-400 mb-1">
          Community Contribution
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
          Submit Your AI Prompt
        </h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Contribute verified AI art prompts to the universe. Help creators learn the techniques, styles, and parameters behind extraordinary AI imagery.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Artwork Media */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-5">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            <span>1. Artwork Image</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700/80 hover:border-violet-500/80 rounded-xl bg-zinc-950/60 hover:bg-zinc-950 transition-all cursor-pointer group text-center">
                <div className="w-12 h-12 rounded-xl bg-violet-600/10 group-hover:bg-violet-600/20 text-violet-400 flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  Click to upload artwork image
                </span>
                <span className="text-xs text-zinc-400 mt-1">
                  Supports PNG, JPG, WebP (Max 10MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Or Paste Direct Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl.startsWith('blob:') || imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/artwork.jpg"
                  className="w-full p-3 text-xs bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="md:col-span-5 rounded-xl border border-zinc-800 bg-zinc-950 p-3 min-h-[200px] flex flex-col items-center justify-center text-center relative overflow-hidden">
              {imagePreview ? (
                <div className="relative w-full aspect-video md:aspect-auto md:h-full rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center min-h-[180px]">
                  <img
                    src={imagePreview}
                    alt="Submission Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl('');
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                      showToast('Image removed', 'info');
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1.5 bg-black/80 hover:bg-zinc-800 text-white text-xs rounded-lg border border-zinc-700 transition-colors flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <div className="text-zinc-500 text-xs flex flex-col items-center gap-2 py-8 px-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                    <ImageIcon className="w-5 h-5 text-zinc-600" />
                  </div>
                  <span className="font-medium text-zinc-400">Live Image Preview</span>
                  <span className="text-[11px] text-zinc-600">Your uploaded artwork preview will display here.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Metadata & Prompt */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-5">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>2. Artwork Title & Full AI Prompt</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Artwork Title *
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cinematic Obsidian Cyberpunk Runner"
              className="w-full p-3 text-sm bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Complete AI Prompt Text *
            </label>
            <textarea
              required
              rows={4}
              maxLength={5000}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Paste the exact prompt including lighting, camera, textures, and engine parameters..."
              className="w-full p-3 text-xs font-mono bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="16:9">16:9 (Landscape Cinematic)</option>
                <option value="4:3">4:3 (Classic Editorial)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Vertical Mobile)</option>
              </select>
            </div>
          </div>



          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-violet-400" />
                <span>Search Tags (up to 8)</span>
              </span>
              <span className="text-zinc-500 text-[11px]">Press Enter or comma to add</span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-950 border border-zinc-700/80 rounded-xl focus-within:border-violet-500">
              {tags.map((tag) => (
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
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length < 8 ? 'Type tag and hit Enter...' : ''}
                disabled={tags.length >= 8}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-zinc-200 focus:outline-none py-1 px-1 placeholder:text-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Guidelines Consent */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>3. Community Guidelines & Consent</span>
          </h2>

          <div className="pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 rounded bg-zinc-950 border-zinc-700 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs text-zinc-400 leading-relaxed">
                I confirm that I generated or have rights to share this artwork and its prompt with the community. I understand submissions are automatically published to the Universe gallery.
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link
            to="/"
            className="px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 active:scale-98 shadow-lg shadow-violet-900/40 transition-all cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {submissionStatus === 'compressing' && 'Compressing Image...'}
              {submissionStatus === 'uploading' && 'Verifying & Uploading Image...'}
              {submissionStatus === 'publishing' && 'Publishing Prompt...'}
              {submissionStatus === 'idle' && (submitting ? 'Processing...' : 'Publish Prompt Instantly')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
