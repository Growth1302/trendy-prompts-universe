import { useEffect, useState, useMemo } from 'react';
import { PromptItem, Category, ReportItem } from '../types';
import { supabase } from './supabase';


export const INITIAL_CATEGORIES: Category[] = [
  { id: 'fashion', name: 'Fashion', slug: 'fashion', description: 'Haute couture, avant-garde styling, textures and textiles', order: 1, isActive: true },
  { id: 'portraits', name: 'Portraits', slug: 'portraits', description: 'Cinematic lighting, expressive characters, and close-ups', order: 2, isActive: true },
  { id: 'cars', name: 'Cars', slug: 'cars', description: 'Concept supercars, vintage classics, and racing machines', order: 3, isActive: true },
  { id: 'architecture', name: 'Architecture', slug: 'architecture', description: 'Brutalist structures, futuristic spaces, and interior design', order: 4, isActive: true },
  { id: 'fantasy', name: 'Fantasy', slug: 'fantasy', description: 'Mythical beasts, magical realms, and ethereal landscapes', order: 5, isActive: true },
  { id: 'nature', name: 'Nature', slug: 'nature', description: 'Botanical sanctuaries, macro wildlife, and planetary views', order: 6, isActive: true },
  { id: 'anime', name: 'Anime', slug: 'anime', description: 'Stylized Japanese animation aesthetics, mecha, and cel-shading', order: 7, isActive: true },
  { id: 'classic', name: 'Classic', slug: 'classic', description: 'Renaissance oil paintings, baroque chiaroscuro, and fine art', order: 8, isActive: true },
  { id: 'funny', name: 'Funny', slug: 'funny', description: 'Whimsical concepts, surreal humor, and unexpected mashups', order: 9, isActive: true },
  { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: 'Urban moments, coffee culture, wanderlust, and modern living', order: 10, isActive: true },
];

export const INITIAL_PROMPTS: PromptItem[] = [];

type Listener = () => void;

class StoreService {
  private prompts: PromptItem[] = [];
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private reports: ReportItem[] = [];
  private favorites: Set<string> = new Set();
  public isSupabaseConnected = false;
  private listeners: Set<Listener> = new Set();
  public version = 0;

  constructor() {
    this.init();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  private async init() {
    if (typeof window === 'undefined') return;

    try {
      const storedFavorites = localStorage.getItem('tpu_favorites_v2');
      if (storedFavorites) {
        this.favorites = new Set(JSON.parse(storedFavorites));
      }
    } catch {
      this.favorites = new Set();
    }

    await this.refreshPrompts();

    try {
      supabase
        .channel('public:Prompts')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Prompts' },
          () => this.refreshPrompts()
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  public async refreshPrompts() {
    try {
      // Changed table reference from .from('"Prompts"') to .from('Prompts')
      const { data, error } = await supabase
        .from('Prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Explicitly set live DB data. Once connected, seed data is replaced with live DB state.
        this.prompts = data.map((row: any) => this.mapRowToPrompt(row));
        this.isSupabaseConnected = true;
        this.notify();
      }
    } catch (err) {
      console.warn('Supabase database connection error:', err);
    }
  }

  private mapRowToPrompt(row: any): PromptItem {
    let url = row.image_url || '';
    const path = row.image_path || (row.image_url && !row.image_url.startsWith('http') ? row.image_url : null);

    if (path) {
      const { data: { publicUrl } } = supabase.storage
        .from('prompt-images')
        .getPublicUrl(path);
      url = publicUrl;
    }

    return {
      id: String(row.id),
      title: row.title || 'Untitled',
      slug: row.slug || row.title?.toLowerCase().replace(/[^\w]/g, '-') || String(row.id),
      imageUrl: url,
      imagePath: path || undefined,
      prompt: row.prompt || row.description || '',
      negativePrompt: row.negative_prompt,
      model: row.model || 'Midjourney v6.1',
      aspectRatio: row.aspect_ratio || '16:9',
      categoryId: row.category || 'fashion',
      tags: Array.isArray(row.tags) ? row.tags : [],
      status: row.status || 'published',
      creator: {
        name: row.creator_name || 'Community Creator',
        handle: row.creator_handle,
      },
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      viewsCount: Number(row.views_count || 0),
      copiesCount: Number(row.copies_count || 0),
      likesCount: Number(row.likes_count || 0),
      featured: Boolean(row.featured),
      trending: Boolean(row.trending),
    };
  }

  public generateUniqueSlug(title: string, excludeId?: string): string {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled-prompt';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (this.prompts.some((p) => p.slug === uniqueSlug && (!excludeId || p.id !== excludeId))) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }
    return uniqueSlug;
  }

  public getPublishedPrompts(options: {
    categoryId?: string;
    search?: string;
    tag?: string;
    sort?: 'trending' | 'latest' | 'popular';
    page?: number;
    limit?: number;
  } = {}): { prompts: PromptItem[]; total: number; hasMore: boolean } {
    let filtered = this.prompts.filter((p) => p.status === 'published');

    if (options.categoryId && options.categoryId !== 'all') {
      filtered = filtered.filter((p) => p.categoryId.toLowerCase() === options.categoryId!.toLowerCase());
    }

    if (options.tag) {
      const targetTag = options.tag.toLowerCase().trim();
      filtered = filtered.filter((p) => p.tags.some((t) => t.toLowerCase() === targetTag));
    }

    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const promptMatch = p.prompt.toLowerCase().includes(q);
        const tagMatch = p.tags.some((t) => t.toLowerCase().includes(q));
        const cat = this.categories.find((c) => c.id === p.categoryId);
        return titleMatch || promptMatch || tagMatch || (cat ? cat.name.toLowerCase().includes(q) : false);
      });
    }

    const sort = options.sort || 'trending';
    filtered.sort((a, b) => {
      if (sort === 'trending') {
        const isATrending = Boolean(a.trending) || a.tags.some((t) => t.toLowerCase() === 'trending' || t.toLowerCase() === 'trend');
        const isBTrending = Boolean(b.trending) || b.tags.some((t) => t.toLowerCase() === 'trending' || t.toLowerCase() === 'trend');
        
        if (isATrending !== isBTrending) {
          return isBTrending ? 1 : -1;
        }
        
        const scoreA = (a.copiesCount || 0) * 2 + (a.viewsCount || 0);
        const scoreB = (b.copiesCount || 0) * 2 + (b.viewsCount || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'popular') {
        const diff = (b.copiesCount || 0) - (a.copiesCount || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    const total = filtered.length;
    const page = options.page || 1;
    const limit = options.limit || 12;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(0, startIndex + limit);
    return { prompts: paginated, total, hasMore: paginated.length < total };
  }

  public getPromptBySlug(slug: string): PromptItem | undefined {
    return this.prompts.find((p) => p.slug.toLowerCase() === slug.toLowerCase());
  }

  public getPromptById(id: string): PromptItem | undefined {
    return this.prompts.find((p) => String(p.id) === String(id));
  }

  public getPromptBySlugOrId(identifier: string): PromptItem | undefined {
    if (!identifier) return undefined;
    const lower = identifier.toLowerCase().trim();
    return (
      this.prompts.find((p) => p.slug.toLowerCase() === lower) ||
      this.prompts.find((p) => String(p.id) === lower)
    );
  }

  public async fetchPromptByIdentifier(identifier: string): Promise<PromptItem | undefined> {
    if (!identifier) return undefined;
    const existing = this.getPromptBySlugOrId(identifier);
    if (existing) return existing;

    try {
      const lower = identifier.toLowerCase().trim();
      // Query Supabase for matching slug first
      let { data, error } = await supabase
        .from('Prompts')
        .select('*')
        .eq('slug', lower)
        .maybeSingle();

      // If no slug match and identifier is numeric, query by id
      if (!data && !error && !isNaN(Number(identifier))) {
        const idNum = parseInt(identifier, 10);
        const idRes = await supabase
          .from('Prompts')
          .select('*')
          .eq('id', idNum)
          .maybeSingle();
        if (idRes.data) {
          data = idRes.data;
        }
      }

      if (data) {
        const prompt = this.mapRowToPrompt(data);
        const idx = this.prompts.findIndex((p) => p.id === prompt.id);
        if (idx !== -1) {
          this.prompts[idx] = prompt;
        } else {
          this.prompts.push(prompt);
        }
        this.notify();
        return prompt;
      }
    } catch (err) {
      console.warn('Error fetching prompt directly from Supabase:', err);
    }
    return undefined;
  }


  public getRelatedPrompts(current: PromptItem, limit = 4): PromptItem[] {
    return this.prompts
      .filter((p) => p.id !== current.id && p.status === 'published')
      .map((p) => {
        let score = 0;
        if (p.categoryId === current.categoryId) score += 5;
        score += p.tags.filter((t) => current.tags.includes(t)).length * 2;
        return { prompt: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.prompt);
  }

  // --- OPEN COMMUNITY OPERATIONS via community-manage EDGE FUNCTION ---

  public async submitCommunityPrompt(data: {
    title: string;
    prompt: string;
    imageUrl?: string;
    imageBase64?: string;
    imageMimeType?: string;
    categoryId: string;
    tags: string[];
    model?: string;
    aspectRatio?: string;
    negativePrompt?: string;
    creatorName?: string;
  }): Promise<PromptItem> {
    const slug = this.generateUniqueSlug(data.title);
    
    // Attempt Edge Function submission first
    try {
      const response = await supabase.functions.invoke('community-manage', {
        body: { action: 'SUBMIT', data: { ...data, slug } }
      });

      if (!response.error && response.data && response.data.data) {
        const newPrompt = this.mapRowToPrompt(response.data.data);
        this.prompts.unshift(newPrompt);
        this.notify();
        return newPrompt;
      }
    } catch (e) {
      console.warn('Edge Function submission unavailable, using direct Supabase fallback:', e);
    }

    // Direct Supabase Fallback logic
    let finalImageUrl = data.imageUrl || '';
    let imagePath: string | undefined = undefined;

    // Handle base64 image upload to Supabase Storage bucket 'prompt-images' if present
    if (data.imageBase64) {
      try {
        const base64Clean = data.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const byteCharacters = atob(base64Clean);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const mime = data.imageMimeType || 'image/jpeg';
        const ext = mime.split('/')[1] || 'jpeg';
        const filePath = `community/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('prompt-images')
          .upload(filePath, byteArray, { contentType: mime, upsert: true });

        if (!uploadError && uploadData) {
          imagePath = uploadData.path;
          const { data: { publicUrl } } = supabase.storage
            .from('prompt-images')
            .getPublicUrl(filePath);
          finalImageUrl = publicUrl;
        }
      } catch (err) {
        console.warn('Base64 image upload fallback error:', err);
      }
    }

    // Insert row into 'Prompts' table directly
    try {
      const rowToInsert = {
        title: data.title.trim(),
        prompt: data.prompt.trim(),
        image_url: finalImageUrl,
        image_path: imagePath,
        category: data.categoryId,
        tags: data.tags,
        model: data.model || 'Midjourney v6.1',
        aspect_ratio: data.aspectRatio || '16:9',
        negative_prompt: data.negativePrompt,
        creator_name: data.creatorName || 'Community Creator',
        status: 'published',
        slug: slug,
        copies_count: 0,
        views_count: 0,
        likes_count: 0,
        featured: false,
        trending: false,
      };

      const { data: dbData, error: dbError } = await supabase
        .from('Prompts')
        .insert([rowToInsert])
        .select('*')
        .maybeSingle();

      if (!dbError && dbData) {
        const newPrompt = this.mapRowToPrompt(dbData);
        this.prompts.unshift(newPrompt);
        this.notify();
        return newPrompt;
      }
    } catch (dbErr) {
      console.warn('Supabase DB insert error:', dbErr);
    }

    // Local in-memory prompt fallback if DB is completely offline
    const fallbackPrompt: PromptItem = {
      id: `local-${Date.now()}`,
      title: data.title.trim(),
      slug,
      imageUrl: finalImageUrl || data.imageBase64 || '',
      imagePath,
      prompt: data.prompt.trim(),
      negativePrompt: data.negativePrompt,
      model: data.model || 'Midjourney v6.1',
      aspectRatio: data.aspectRatio || '16:9',
      categoryId: data.categoryId,
      tags: data.tags,
      status: 'published',
      creator: { name: data.creatorName || 'Community Creator' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewsCount: 0,
      copiesCount: 0,
      likesCount: 0,
      featured: false,
      trending: false,
    };

    this.prompts.unshift(fallbackPrompt);
    this.notify();
    return fallbackPrompt;
  }

  public async updatePrompt(id: string, updates: Partial<PromptItem>): Promise<PromptItem | null> {
    try {
      const response = await supabase.functions.invoke('community-manage', {
        body: { action: 'UPDATE', promptId: id, updates }
      });
      if (!response.error && response.data && response.data.data) {
        const updatedPrompt = this.mapRowToPrompt(response.data.data);
        const index = this.prompts.findIndex(p => p.id === id);
        if (index !== -1) {
          this.prompts[index] = updatedPrompt;
          this.notify();
        }
        return updatedPrompt;
      }
    } catch (e) {
      console.warn('Edge Function update unavailable, using direct DB update fallback:', e);
    }

    try {
      const dbUpdates: any = {};
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.prompt) dbUpdates.prompt = updates.prompt;
      if (updates.categoryId) dbUpdates.category = updates.categoryId;
      if (updates.model) dbUpdates.model = updates.model;
      dbUpdates.updated_at = new Date().toISOString();

      const { data: dbData, error: dbError } = await supabase
        .from('Prompts')
        .update(dbUpdates)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (!dbError && dbData) {
        const updatedPrompt = this.mapRowToPrompt(dbData);
        const index = this.prompts.findIndex(p => p.id === id);
        if (index !== -1) {
          this.prompts[index] = updatedPrompt;
          this.notify();
        }
        return updatedPrompt;
      }
    } catch (dbErr) {
      console.warn('Direct DB update error:', dbErr);
    }

    const index = this.prompts.findIndex(p => p.id === id);
    if (index !== -1) {
      this.prompts[index] = { ...this.prompts[index], ...updates };
      this.notify();
      return this.prompts[index];
    }
    return null;
  }

  public async deletePrompt(id: string): Promise<boolean> {
    try {
      const response = await supabase.functions.invoke('community-manage', {
        body: { action: 'DELETE', promptId: id }
      });
      if (!response.error && response.data) {
        this.prompts = this.prompts.filter(p => p.id !== id);
        this.notify();
        return true;
      }
    } catch (e) {
      console.warn('Edge Function delete unavailable, using direct DB delete fallback:', e);
    }

    try {
      await supabase.from('Prompts').delete().eq('id', id);
    } catch (dbErr) {
      console.warn('Direct DB delete error:', dbErr);
    }

    this.prompts = this.prompts.filter(p => p.id !== id);
    this.notify();
    return true;
  }

  // --- SECURE PUBLIC RPC COUNTERS ---

  public async incrementViewCount(slug: string): Promise<void> {
    const prompt = this.getPromptBySlugOrId(slug) || this.getPromptBySlug(slug);
    if (prompt) {
      prompt.viewsCount = (prompt.viewsCount || 0) + 1;
      this.notify();
      try {
        await supabase.rpc('increment_views', { target_id: parseInt(prompt.id, 10) });
      } catch (err) {
        console.warn('View increment RPC error:', err);
      }
    }
  }

  public async incrementCopyCount(slug: string): Promise<void> {
    const prompt = this.getPromptBySlugOrId(slug) || this.getPromptBySlug(slug);
    if (prompt) {
      prompt.copiesCount = (prompt.copiesCount || 0) + 1;
      this.notify();
      try {
        await supabase.rpc('increment_copies', { target_id: parseInt(prompt.id, 10) });
      } catch (err) {
        console.warn('Copy increment RPC error:', err);
      }
    }
  }

  public toggleFavorite(id: string): boolean {
    const state = this.favorites.has(id);
    if (state) this.favorites.delete(id); else this.favorites.add(id);
    if (typeof window !== 'undefined') localStorage.setItem('tpu_favorites_v2', JSON.stringify(Array.from(this.favorites)));
    this.notify();
    return !state;
  }

  public isFavorite(id: string): boolean { return this.favorites.has(id); }
  public getCategories(): Category[] { return [...this.categories].sort((a, b) => a.order - b.order); }
  public getCategoryById(id: string): Category | undefined { return this.categories.find((c) => c.id.toLowerCase() === id.toLowerCase()); }

  public reportPrompt(promptId: string, reason: string, details?: string): ReportItem {
    const prompt = this.getPromptById(promptId);
    const newReport: ReportItem = {
      id: `rep-${Date.now()}`, promptId, promptTitle: prompt ? prompt.title : 'Unknown', reason, details, createdAt: new Date().toISOString(), status: 'pending',
    };
    this.reports.unshift(newReport);
    this.notify();
    return newReport;
  }
}

export const store = new StoreService();
export const useStore = () => {
  const [, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick((t) => t + 1)), []);
  return useMemo(() => store, []);
};
