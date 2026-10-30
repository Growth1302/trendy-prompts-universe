/**
 * Utility for dynamically updating SEO metadata, OpenGraph tags, and canonical links.
 */

export function getCanonicalBaseUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL || import.meta.env.APP_URL;
  if (envUrl && envUrl !== 'MY_APP_URL' && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://trendyprompts.universe';
}

export function getCanonicalPromptUrl(slug: string): string {
  const base = getCanonicalBaseUrl();
  return `${base}/prompts/${encodeURIComponent(slug)}`;
}

export interface SEOConfig {
  title: string;
  description: string;
  canonicalUrl?: string;
  imageUrl?: string;
  type?: 'website' | 'article';
}

export function updatePageSEO({
  title,
  description,
  canonicalUrl,
  imageUrl,
  type = 'website',
}: SEOConfig): void {
  if (typeof document === 'undefined') return;

  // Set document title
  document.title = title;

  // Set meta description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.setAttribute('name', 'description');
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute('content', description);

  // Set Open Graph tags
  const ogTags: Record<string, string> = {
    'og:title': title,
    'og:description': description,
    'og:type': type,
    ...(canonicalUrl ? { 'og:url': canonicalUrl } : {}),
    ...(imageUrl ? { 'og:image': imageUrl } : {}),
  };

  for (const [property, content] of Object.entries(ogTags)) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  // Set Twitter Card tags
  const twitterTags: Record<string, string> = {
    'twitter:title': title,
    'twitter:description': description,
    ...(imageUrl ? { 'twitter:image': imageUrl } : {}),
  };

  for (const [name, content] of Object.entries(twitterTags)) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  // Set Canonical link
  if (canonicalUrl) {
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
  }
}

export function updateStructuredData(schema: object): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById('json-ld-prompt-schema') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'json-ld-prompt-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}
