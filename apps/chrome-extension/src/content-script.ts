import {
  commandRequestSchema,
  errorCodes,
  PROTOCOL_VERSION,
  type CommandRequest,
  type PlayerState,
} from '@remote-youtube/protocol';
import { v7 as uuidv7 } from 'uuid';

let video: HTMLVideoElement | null = null;
let sequence = 0;
const pageInstanceId = uuidv7();
let reportTimer: ReturnType<typeof setTimeout> | undefined;
let lastReportAt = 0;
let observer: MutationObserver | undefined;
const listeners: Array<() => void> = [];

function isSupportedVideoPage(): boolean {
  return (
    location.pathname === '/watch' || location.pathname.startsWith('/shorts/') || location.pathname.startsWith('/live/')
  );
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

function unbind(): void {
  while (listeners.length) listeners.pop()?.();
  if (observer) observer.disconnect();
  observer = undefined;
  video = null;
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
    const handler = () => report(true);
    nextVideo.addEventListener(eventName, handler);
    listeners.push(() => nextVideo.removeEventListener(eventName, handler));
  }
  const timeHandler = () => report(false);
  nextVideo.addEventListener('timeupdate', timeHandler);
  listeners.push(() => nextVideo.removeEventListener('timeupdate', timeHandler));
  report(true);
}

function findAndBind(): void {
  if (!isSupportedVideoPage()) {
    unbind();
    return;
  }
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
      error instanceof DOMException && error.name === 'NotAllowedError'
        ? errorCodes.autoplayBlocked
        : errorCodes.videoMissing;
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
observer = new MutationObserver(() => findAndBind());
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('yt-navigate-finish', findAndBind);
