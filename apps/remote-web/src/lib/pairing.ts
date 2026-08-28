const pairingStorageKey = 'remote-youtube.pairing-token';

export function readPairingToken(): string | null {
  const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(fragment);
  const tokenFromFragment = params.get('token');

  if (tokenFromFragment && /^[A-Za-z0-9_-]{40,100}$/.test(tokenFromFragment)) {
    window.localStorage.setItem(pairingStorageKey, tokenFromFragment);
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
    return tokenFromFragment;
  }

  return window.localStorage.getItem(pairingStorageKey);
}

export function clearPairingToken(): void {
  window.localStorage.removeItem(pairingStorageKey);
}
