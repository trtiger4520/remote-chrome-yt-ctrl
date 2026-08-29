import { describe, expect, it } from 'vitest';
import { collectYouTubeVideoMenuItems } from './video-menu.js';

describe('YouTube video menu links', () => {
  const currentUrl = 'https://www.youtube.com/watch?v=current';

  it('normalizes links, excludes the current video, and keeps titles', () => {
    expect(
      collectYouTubeVideoMenuItems(
        [
          { href: '/watch?v=current', title: '目前影片' },
          { href: '/watch?v=first', title: '  第一部\n影片  ' },
          { href: 'https://youtu.be/second', title: '第二部影片' },
          { href: '/shorts/third', title: '第三部 Shorts' },
        ],
        currentUrl,
      ),
    ).toEqual([
      { title: '第一部 影片', url: 'https://www.youtube.com/watch?v=first' },
      { title: '第二部影片', url: 'https://www.youtube.com/watch?v=second' },
      { title: '第三部 Shorts', url: 'https://www.youtube.com/shorts/third' },
    ]);
  });

  it('deduplicates equivalent video links and rejects non-video URLs', () => {
    expect(
      collectYouTubeVideoMenuItems(
        [
          { href: '/watch?v=first', title: '第一部影片' },
          { href: 'https://www.youtube.com/watch?v=first&list=playlist', title: '重複影片' },
          { href: '/channel/example', title: '頻道' },
          { href: 'https://evil.example/watch?v=blocked', title: '外部網址' },
          { href: 'javascript:alert(1)', title: '危險網址' },
        ],
        currentUrl,
      ),
    ).toEqual([{ title: '第一部影片', url: 'https://www.youtube.com/watch?v=first' }]);
  });

  it('uses a fallback title and respects the item limit', () => {
    expect(
      collectYouTubeVideoMenuItems(
        [{ href: '/watch?v=first' }, { href: '/watch?v=second', title: '第二部影片' }],
        currentUrl,
        1,
      ),
    ).toEqual([{ title: 'YouTube 影片', url: 'https://www.youtube.com/watch?v=first' }]);
  });
});
