const allowedYouTubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

export function isSupportedYouTubeUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      !allowedYouTubeHosts.has(parsed.hostname) ||
      parsed.username ||
      parsed.password
    ) {
      return false;
    }

    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean);
      return videoId.length === 1 && (videoId[0]?.length ?? 0) <= 100;
    }

    const path = parsed.pathname.replace(/\/$/, '');
    if (path === '/watch') {
      const videoId = parsed.searchParams.get('v');
      return Boolean(videoId && videoId.length <= 100);
    }
    if (path.startsWith('/shorts/') || path.startsWith('/live/')) {
      const videoId = path.split('/').filter(Boolean);
      return videoId.length === 2 && (videoId[1]?.length ?? 0) <= 100;
    }
    return false;
  } catch {
    return false;
  }
}

export function normalizeYouTubeUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (!isSupportedYouTubeUrl(parsed.toString())) return null;
    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
