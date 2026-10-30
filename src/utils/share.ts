/**
 * Utilities for copying prompts and sharing canonical links with fallback handling.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback using temporary textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

export interface SharePayload {
  title: string;
  text?: string;
  url: string;
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'cancelled' | 'failed';
  error?: string;
}

export async function shareLink(payload: SharePayload): Promise<ShareResult> {
  // Check if Web Share API is available and can share
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text || payload.title,
        url: payload.url,
      });
      return { success: true, method: 'native' };
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      // User cancelled or aborted the native share sheet
      if (errorObj?.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      // Native share threw another error (e.g. permission or unsupported content); fallback to clipboard
    }
  }

  // Fallback: Copy URL directly to clipboard
  const copied = await copyTextToClipboard(payload.url);
  if (copied) {
    return { success: true, method: 'clipboard' };
  }

  return { success: false, method: 'failed', error: 'Unable to copy URL to clipboard' };
}
