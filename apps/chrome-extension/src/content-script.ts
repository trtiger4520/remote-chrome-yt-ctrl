import {
  commandRequestSchema,
  errorCodes,
  PROTOCOL_VERSION,
  type CommandRequest,
  type PlayerState,
  type VideoMenu,
} from '@remote-youtube/protocol';
import { v7 as uuidv7 } from 'uuid';
import { isVideoFullscreen, toggleVideoFullscreen } from './fullscreen.js';
import { collectYouTubeVideoMenuItems, resolveVideoTitle, type VideoMenuLink } from './video-menu.js';

let video: HTMLVideoElement | null = null;
let sequence = 0;
const pageInstanceId = uuidv7();
const maxVideoMenuItems = 20;
const menuReportDelayMs = 250;
const videoCardSelector =
  'ytd-compact-video-renderer, ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer, ytd-playlist-video-renderer, yt-lockup-view-model, .yt-lockup-view-model';
const videoTitleSelector =
  '#video-title, #video-title-link, #video-title-text, .yt-lockup-metadata-view-model__heading-reset, .yt-lockup-metadata-view-model__title, h3';
let reportTimer: ReturnType<typeof setTimeout> | undefined;
let menuReportTimer: ReturnType<typeof setTimeout> | undefined;
let menuSequence = 0;
let lastMenuReportAt = 0;
let lastVideoMenu: VideoMenu | null = null;
let lastPageUrl = location.href;
let lastReportAt = 0;
let observer: MutationObserver | undefined;
const listeners: Array<() => void> = [];

function isSupportedVideoPage(): boolean {
  return (
    location.pathname === '/watch' || location.pathname.startsWith('/shorts/') || location.pathname.startsWith('/live/')
  );
}

function captionsEnabled(): boolean {
  return Array.from(video?.textTracks ?? []).some((track) => track.mode === 'showing');
}

function currentState(): PlayerState | null {
  if (!video || !isSupportedVideoPage()) return null;
  const hasMetadata = Number.isFinite(video.duration);
  const isLive = video.duration === Infinity;
  const duration = hasMetadata ? Math.max(0, video.duration) : null;
  return {
    targetKey: pageInstanceId,
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
    title: document.title.replace(/\s+-\s+YouTube\s*$/i, '').trim(),
    url: location.href,
    currentTime: Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0,
    duration,
    paused: video.paused,
    muted: video.muted,
    volume: Math.min(1, Math.max(0, video.volume)),
    playbackRate: video.playbackRate,
    isLive,
    canSeek: hasMetadata && !isLive && video.seekable.length > 0,
    isFullscreen: isVideoFullscreen(video),
    captionsEnabled: captionsEnabled(),
    capturedAtUtc: new Date().toISOString(),
  };
}

function report(immediate = false): void {
  if (reportTimer && !immediate) return;
  if (reportTimer && immediate) {
    clearTimeout(reportTimer);
    reportTimer = undefined;
  }
  const elapsed = Date.now() - lastReportAt;
  const delay = immediate ? 0 : Math.max(0, 250 - elapsed);
  reportTimer = setTimeout(() => {
    reportTimer = undefined;
    lastReportAt = Date.now();
    const state = currentState();
    if (state) chrome.runtime.sendMessage({ type: 'playerState', state });
  }, delay);
}

function resetVideoMenu(): void {
  if (menuReportTimer) {
    clearTimeout(menuReportTimer);
    menuReportTimer = undefined;
  }
  lastVideoMenu = null;
}

function videoLinkTitle(link: HTMLAnchorElement): string {
  const directTitle = link.closest<HTMLElement>(
    '#video-title, #video-title-link, #video-title-text, .yt-lockup-metadata-view-model__heading-reset',
  );
  const cardTitle =
    directTitle ?? link.closest<HTMLElement>(videoCardSelector)?.querySelector<HTMLElement>(videoTitleSelector);
  return resolveVideoTitle([
    cardTitle?.getAttribute('title'),
    cardTitle?.getAttribute('aria-label'),
    cardTitle?.textContent,
    link.getAttribute('title'),
    link.getAttribute('aria-label'),
    link.textContent,
  ]);
}

function isVisibleVideoLink(link: HTMLAnchorElement): boolean {
  const bounds = link.getBoundingClientRect();
  return (
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.bottom > 0 &&
    bounds.right > 0 &&
    bounds.top < innerHeight &&
    bounds.left < innerWidth
  );
}

function currentVideoMenu(): VideoMenu | null {
  if (!video || !isSupportedVideoPage()) return null;

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter(isVisibleVideoLink)
    .map<VideoMenuLink>((link) => ({ href: link.href, title: videoLinkTitle(link) }));
  return {
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++menuSequence,
    targetKey: pageInstanceId,
    items: collectYouTubeVideoMenuItems(links, location.href, maxVideoMenuItems),
    capturedAtUtc: new Date().toISOString(),
  };
}

function reportVideoMenu(immediate = false): void {
  if (menuReportTimer && !immediate) return;
  if (menuReportTimer && immediate) {
    clearTimeout(menuReportTimer);
    menuReportTimer = undefined;
  }

  const elapsed = Date.now() - lastMenuReportAt;
  const delay = immediate ? 0 : Math.max(0, menuReportDelayMs - elapsed);
  menuReportTimer = setTimeout(() => {
    menuReportTimer = undefined;
    lastMenuReportAt = Date.now();
    const menu = currentVideoMenu();
    lastVideoMenu = menu;
    void chrome.runtime.sendMessage({ type: 'videoMenu', menu }).catch(() => undefined);
  }, delay);
}

function unbind(): void {
  while (listeners.length) listeners.pop()?.();
  video = null;
  resetVideoMenu();
}

function stopObserving(): void {
  observer?.disconnect();
  observer = undefined;
}

function ensureObserving(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    findAndBind();
    reportVideoMenu();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function bind(nextVideo: HTMLVideoElement): void {
  if (video === nextVideo) {
    return;
  }
  unbind();
  video = nextVideo;
  for (const eventName of [
    'play',
    'pause',
    'volumechange',
    'ratechange',
    'loadedmetadata',
    'durationchange',
    'ended',
  ]) {
    const handler = (event: Event) => {
      report(true);
      if (event.type === 'ended') reportVideoMenu(true);
    };
    nextVideo.addEventListener(eventName, handler);
    listeners.push(() => nextVideo.removeEventListener(eventName, handler));
  }
  const timeHandler = () => report(false);
  nextVideo.addEventListener('timeupdate', timeHandler);
  listeners.push(() => nextVideo.removeEventListener('timeupdate', timeHandler));
  const captionsHandler = () => report(true);
  nextVideo.textTracks.addEventListener('change', captionsHandler);
  nextVideo.textTracks.addEventListener('addtrack', captionsHandler);
  nextVideo.textTracks.addEventListener('removetrack', captionsHandler);
  listeners.push(() => {
    nextVideo.textTracks.removeEventListener('change', captionsHandler);
    nextVideo.textTracks.removeEventListener('addtrack', captionsHandler);
    nextVideo.textTracks.removeEventListener('removetrack', captionsHandler);
  });
  report(true);
}

function findAndBind(): void {
  if (location.href !== lastPageUrl) {
    lastPageUrl = location.href;
    resetVideoMenu();
  }
  if (!isSupportedVideoPage()) {
    unbind();
    stopObserving();
    return;
  }
  ensureObserving();
  const nextVideo = document.querySelector('video');
  if (nextVideo) bind(nextVideo);
  else unbind();
}

async function execute(command: CommandRequest) {
  if (command.action === 'navigate') {
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected' as const,
      errorCode: errorCodes.unsupportedUrl,
      message: 'Navigation is handled by the service worker',
    };
  }
  if (!video) {
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected' as const,
      errorCode: errorCodes.videoMissing,
      message: 'No video element is ready',
    };
  }

  try {
    switch (command.action) {
      case 'togglePlayback':
        if (video.paused) await video.play();
        else video.pause();
        break;
      case 'toggleFullscreen':
        await toggleVideoFullscreen(video);
        break;
      case 'toggleCaptions': {
        const tracks = Array.from(video.textTracks).filter(
          (track) => track.kind === 'captions' || track.kind === 'subtitles',
        );
        if (tracks.length === 0) throw new Error('No captions are available for this video');
        const shouldEnable = !tracks.some((track) => track.mode === 'showing');
        for (const track of tracks) track.mode = 'hidden';
        if (shouldEnable) tracks[0]!.mode = 'showing';
        break;
      }
      case 'seekTo':
        if (!Number.isFinite(video.duration) || command.numberValue === undefined) throw new Error('seek unavailable');
        video.currentTime = Math.min(video.duration, Math.max(0, command.numberValue));
        break;
      case 'seekBy':
        if (!Number.isFinite(video.duration) || command.numberValue === undefined) throw new Error('seek unavailable');
        video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + command.numberValue));
        break;
      case 'setVolume':
        if (command.numberValue === undefined) throw new Error('volume missing');
        video.volume = command.numberValue;
        if (command.numberValue > 0) video.muted = false;
        break;
      case 'setMuted':
        if (command.booleanValue === undefined) throw new Error('muted missing');
        video.muted = command.booleanValue;
        break;
      case 'setPlaybackRate':
        if (command.numberValue === undefined) throw new Error('rate missing');
        video.playbackRate = command.numberValue;
        break;
    }
    report(true);
    return { commandId: command.commandId, success: true, status: 'completed' as const };
  } catch (error) {
    const errorCode =
      command.action === 'togglePlayback' && error instanceof DOMException && error.name === 'NotAllowedError'
        ? errorCodes.autoplayBlocked
        : errorCodes.internalError;
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected' as const,
      errorCode,
      message: error instanceof Error ? error.message : 'Video command failed',
    };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return;
  const typed = message as { type: string; command?: unknown };
  if (typed.type === 'requestState') {
    sendResponse(currentState());
    return;
  }
  if (typed.type === 'requestVideoMenu') {
    sendResponse(lastVideoMenu);
    return;
  }
  if (typed.type === 'executeCommand') {
    const parsed = commandRequestSchema.safeParse(typed.command);
    if (!parsed.success) {
      sendResponse({
        commandId: uuidv7(),
        success: false,
        status: 'rejected',
        errorCode: errorCodes.invalidCommand,
        message: 'Invalid command',
      });
      return;
    }
    void execute(parsed.data).then(sendResponse);
    return true;
  }
});

findAndBind();
document.addEventListener('fullscreenchange', () => report(true));
document.addEventListener('yt-navigate-finish', () => {
  lastPageUrl = location.href;
  resetVideoMenu();
  findAndBind();
  reportVideoMenu(true);
});
window.addEventListener('scroll', () => reportVideoMenu(), { passive: true });
reportVideoMenu(true);
