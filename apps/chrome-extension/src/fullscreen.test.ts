import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isVideoFullscreen, toggleVideoFullscreen } from './fullscreen.js';

describe('video fullscreen', () => {
  const click = vi.fn();
  const querySelector = vi.fn(() => ({ click }));
  const player = { querySelector, closest: vi.fn(() => player) } as unknown as HTMLElement;
  const closest = vi.fn(() => player);
  const video = { closest } as unknown as HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', { fullscreenElement: null, querySelector: vi.fn() });
  });

  it('clicks the fullscreen button in the current YouTube player', async () => {
    await toggleVideoFullscreen(video);

    expect(closest).toHaveBeenCalledWith('.html5-video-player');
    expect(querySelector).toHaveBeenCalledWith('.ytp-fullscreen-button');
    expect(click).toHaveBeenCalledOnce();
  });

  it('fails clearly when the YouTube fullscreen button is unavailable', async () => {
    const unavailableVideo = { closest: vi.fn(() => null) } as unknown as HTMLVideoElement;

    await expect(toggleVideoFullscreen(unavailableVideo)).rejects.toThrow('YouTube fullscreen button is unavailable');
  });

  it('recognizes the YouTube player as fullscreen', () => {
    vi.stubGlobal('document', { fullscreenElement: player, querySelector: vi.fn() });

    expect(isVideoFullscreen(video)).toBe(true);
  });
});
