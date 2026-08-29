export async function toggleVideoFullscreen(video: HTMLVideoElement): Promise<void> {
  if (document.fullscreenElement === video) {
    await document.exitFullscreen();
    return;
  }

  await video.requestFullscreen();
}
