import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readVideoLikeState, toggleVideoLike } from './like-button.js';

describe('YouTube like button', () => {
  const click = vi.fn();
  const getAttribute = vi.fn<(name: string) => string | null>();
  const button = { click, getAttribute, disabled: false } as unknown as HTMLButtonElement;
  const querySelector = vi.fn();
  const querySelectorAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    querySelector.mockReturnValue(button);
    querySelectorAll.mockReturnValue([]);
    getAttribute.mockReturnValue('false');
    vi.stubGlobal('document', { querySelector, querySelectorAll });
  });

  it('reads the aria-pressed state from the current like button', () => {
    getAttribute.mockReturnValue('true');

    expect(readVideoLikeState()).toBe(true);
    expect(querySelector).toHaveBeenCalledWith('like-button-view-model button[aria-pressed]');
  });

  it('clicks the current like button', () => {
    toggleVideoLike();

    expect(click).toHaveBeenCalledOnce();
  });

  it('returns an unavailable state when YouTube has not rendered the button', () => {
    querySelector.mockReturnValue(null);

    expect(readVideoLikeState()).toBeNull();
  });

  it('fails clearly when the like button is disabled', () => {
    querySelector.mockReturnValue({ ...button, disabled: true });

    expect(() => toggleVideoLike()).toThrow('YouTube like button is unavailable');
  });
});
