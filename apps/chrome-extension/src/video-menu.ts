import type { VideoMenuItem } from '@remote-youtube/protocol';
import { normalizeYouTubeUrl } from './targeting.js';

export interface VideoMenuLink {
  href: string;
  title?: string;
}

function normalizeVideoUrl(rawUrl: string | undefined, baseUrl: string): string | null {
  if (!rawUrl?.trim()) return null;

  try {
    return normalizeYouTubeUrl(new URL(rawUrl.trim(), baseUrl).toString());
  } catch {
    return null;
  }
}

function videoKey(normalizedUrl: string): string | null {
  try {
    const parsed = new URL(normalizedUrl);
    const path = parsed.pathname.replace(/\/$/, '');
    const id =
      path === '/watch'
        ? parsed.searchParams.get('v')
        : path.startsWith('/shorts/') || path.startsWith('/live/')
          ? path.split('/').filter(Boolean)[1]
          : null;
    return id ? `video:${id}` : null;
  } catch {
    return null;
  }
}

function normalizeTitle(rawTitle: string | undefined): string {
  const title = rawTitle?.replace(/\s+/g, ' ').trim() ?? '';
  return title.slice(0, 500) || 'YouTube 影片';
}

export function collectYouTubeVideoMenuItems(
  links: Iterable<VideoMenuLink>,
  currentUrl: string,
  maxItems = 20,
): VideoMenuItem[] {
  const current = normalizeVideoUrl(currentUrl, currentUrl);
  const currentKey = current ? videoKey(current) : null;
  const seen = new Set<string>();
  const results: VideoMenuItem[] = [];

  for (const link of links) {
    const normalized = normalizeVideoUrl(link.href, currentUrl);
    const key = normalized ? videoKey(normalized) : null;
    if (!normalized || !key || key === currentKey || seen.has(key)) continue;
    seen.add(key);
    results.push({ title: normalizeTitle(link.title), url: normalized });
    if (results.length >= maxItems) break;
  }

  return results;
}
