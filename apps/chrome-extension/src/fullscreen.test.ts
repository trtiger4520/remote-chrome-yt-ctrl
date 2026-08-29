import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toggleVideoFullscreen } from './fullscreen.js';

describe('video fullscreen', () => {
  const requestFullscreen = vi.fn(async () => undefined);
  const exitFullscreen = vi.fn(async () => undefined);
  const video = { requestFullscreen } as unknown as HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', { fullscreenElement: null, exitFullscreen });
  });

  it('enters fullscreen on the video element', async () => {
    await toggleVideoFullscreen(video);

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('exits fullscreen when the video is already fullscreen', async () => {
    vi.stubGlobal('document', { fullscreenElement: video, exitFullscreen });

    await toggleVideoFullscreen(video);

    expect(exitFullscreen).toHaveBeenCalledOnce();
    expect(requestFullscreen).not.toHaveBeenCalled();
  });
});
