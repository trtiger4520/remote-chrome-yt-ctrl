export function isVideoFullscreen(video: HTMLVideoElement): boolean {
  const fullscreenElement = document.fullscreenElement;
  if (!fullscreenElement) return false;

  const player = video.closest<HTMLElement>('.html5-video-player');
  return fullscreenElement === video || fullscreenElement.closest('.html5-video-player') === player;
}

export async function toggleVideoFullscreen(video: HTMLVideoElement): Promise<void> {
  const player = video.closest<HTMLElement>('.html5-video-player');
  const button =
    player?.querySelector<HTMLButtonElement>('.ytp-fullscreen-button') ??
    document.querySelector<HTMLButtonElement>('.html5-video-player .ytp-fullscreen-button');

  if (!button) throw new Error('YouTube fullscreen button is unavailable');

  button.click();
}
