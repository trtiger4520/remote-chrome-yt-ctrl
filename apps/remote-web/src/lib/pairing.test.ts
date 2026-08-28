import { beforeEach, describe, expect, it } from 'vitest';
import { clearPairingToken, readPairingToken } from './pairing';

describe('pairing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('stores a valid fragment token and removes it from the URL', () => {
    const token = 'A'.repeat(43);
    window.history.replaceState(null, '', `/#token=${token}`);

    expect(readPairingToken()).toBe(token);
    expect(window.location.hash).toBe('');
    expect(localStorage.getItem('remote-youtube.pairing-token')).toBe(token);
  });

  it('clears a saved token', () => {
    localStorage.setItem('remote-youtube.pairing-token', 'A'.repeat(43));
    clearPairingToken();
    expect(readPairingToken()).toBeNull();
  });
});
