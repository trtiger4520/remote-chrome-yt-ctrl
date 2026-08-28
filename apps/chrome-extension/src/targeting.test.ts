import { describe, expect, it } from 'vitest';
import { isSupportedYouTubeUrl, normalizeYouTubeUrl } from './targeting.js';

describe('YouTube target validation', () => {
  it('accepts supported video pages and rejects non-video pages', () => {
    expect(isSupportedYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isSupportedYouTubeUrl('https://youtu.be/abc')).toBe(true);
    expect(isSupportedYouTubeUrl('https://www.youtube.com/')).toBe(false);
    expect(isSupportedYouTubeUrl('http://www.youtube.com/watch?v=abc')).toBe(false);
    expect(isSupportedYouTubeUrl('https://youtube.com.evil.example/watch?v=abc')).toBe(false);
    expect(isSupportedYouTubeUrl('https://studio.youtube.com/watch?v=abc')).toBe(false);
    expect(isSupportedYouTubeUrl('https://user:password@www.youtube.com/watch?v=abc')).toBe(false);
  });

  it('normalizes short links to the content-script host', () => {
    expect(normalizeYouTubeUrl('https://youtu.be/abc')).toBe('https://www.youtube.com/watch?v=abc');
    expect(normalizeYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe('https://www.youtube.com/watch?v=abc');
    expect(normalizeYouTubeUrl('https://www.youtube.com/embed/abc')).toBeNull();
  });
});
