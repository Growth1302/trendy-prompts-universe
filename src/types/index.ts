export interface PromptItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  imagePath?: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  categoryId: string;
  tags: string[];
  status: 'published' | 'pending_review' | 'draft';
  creator: {
    name: string;
    handle?: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  copiesCount: number;
  likesCount: number;
  featured?: boolean;
  trending?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  isActive: boolean;
}

export interface ReportItem {
  id: string;
  promptId: string;
  promptTitle: string;
  reason: string;
  details?: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
