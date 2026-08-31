import type { VideoMenuItem } from '@remote-youtube/protocol';
import { normalizeYouTubeUrl } from './targeting.js';

const fallbackVideoTitle = 'YouTube 影片';
const videoDurationPattern = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;

export interface VideoMenuLink {
  href: string;
  title?: string;
}

export function normalizeVideoTitle(rawTitle: string | null | undefined): string | null {
  const title = rawTitle?.replace(/\s+/g, ' ').trim() ?? '';
  if (!title || videoDurationPattern.test(title)) return null;
  return title.slice(0, 500);
}

export function resolveVideoTitle(candidates: Iterable<string | null | undefined>): string {
  for (const candidate of candidates) {
    const title = normalizeVideoTitle(candidate);
    if (title) return title;
  }
  return fallbackVideoTitle;
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
    results.push({ title: resolveVideoTitle([link.title]), url: normalized });
    if (results.length >= maxItems) break;
  }

  return results;
}
