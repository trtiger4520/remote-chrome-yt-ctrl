const likeButtonSelectors = [
  'like-button-view-model button[aria-pressed]',
  'ytd-segmented-like-dislike-button-renderer #top-level-buttons-computed > ytd-toggle-button-renderer:first-child button[aria-pressed]',
  '#top-level-buttons-computed > ytd-toggle-button-renderer:first-child button[aria-pressed]',
] as const;

const fallbackLikeButtonSelector =
  '#top-level-buttons-computed button[aria-pressed], ytd-segmented-like-dislike-button-renderer button[aria-pressed]';
const dislikeLabelPattern = /dislike|不喜歡|不喜欢|低評價|低评价|싫어요/i;
const likeLabelPattern = /\b(?:like|unlike)\b|喜歡|喜欢|按讚|按赞|高評価|좋아요|me gusta/i;

function isLikeButtonCandidate(button: HTMLButtonElement): boolean {
  if (button.closest('like-button-view-model')) return true;

  const label = [button.getAttribute('aria-label'), button.getAttribute('title')].filter(Boolean).join(' ');
  return !dislikeLabelPattern.test(label) && likeLabelPattern.test(label);
}

export function findYouTubeLikeButton(): HTMLButtonElement | null {
  for (const selector of likeButtonSelectors) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) return button;
  }

  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>(fallbackLikeButtonSelector)).find(isLikeButtonCandidate) ??
    null
  );
}

export function readVideoLikeState(): boolean | null {
  const button = findYouTubeLikeButton();
  const pressed = button?.getAttribute('aria-pressed');
  if (pressed === 'true') return true;
  if (pressed === 'false') return false;
  return null;
}

export function toggleVideoLike(): void {
  const button = findYouTubeLikeButton();
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') {
    throw new Error('YouTube like button is unavailable');
  }

  button.click();
}
