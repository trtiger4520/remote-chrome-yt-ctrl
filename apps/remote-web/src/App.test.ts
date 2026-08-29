import { createApp, nextTick, reactive } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerState } from '@remote-youtube/protocol';
import App from './App.vue';

const mockConnection = vi.hoisted(() => ({
  state: {
    phase: 'unpaired',
    token: 'test-token',
    status: {
      serverConnected: false,
      extensionConnected: false,
      targetStatus: 'none',
      protocolCompatible: false,
      updatedAtUtc: new Date(0).toISOString(),
    },
    player: null,
    errorMessage: null,
  },
  sendCommand: vi.fn(async (command: { commandId: string }) => ({
    commandId: command.commandId,
    success: true,
    status: 'completed',
  })),
  stop: vi.fn(async () => undefined),
}));

vi.mock('./lib/connection', () => ({
  createCommand: (action: string, values: Record<string, unknown> = {}) => ({
    protocolVersion: 2,
    commandId: '00000000-0000-7000-8000-000000000001',
    action,
    ...values,
  }),
  createRemoteConnection: () => ({
    state: reactive(mockConnection.state),
    sendCommand: mockConnection.sendCommand,
    stop: mockConnection.stop,
  }),
}));

vi.mock('./lib/pairing', () => ({
  clearPairingToken: vi.fn(),
  readPairingToken: () => 'test-token',
}));

const readyPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  protocolVersion: 2 as const,
  sequence: 1,
  targetKey: 'tab-1',
  title: '測試影片標題',
  url: 'https://www.youtube.com/watch?v=test',
  currentTime: 30,
  duration: 120,
  paused: true,
  muted: false,
  volume: 0.62,
  playbackRate: 1,
  isLive: false,
  canSeek: true,
  isFullscreen: false,
  captionsEnabled: false,
  capturedAtUtc: new Date().toISOString(),
  ...overrides,
});

function setState(overrides: Record<string, unknown> = {}) {
  Object.assign(mockConnection.state, {
    phase: 'unpaired',
    token: 'test-token',
    status: {
      serverConnected: false,
      extensionConnected: false,
      targetStatus: 'none',
      protocolCompatible: false,
      updatedAtUtc: new Date(0).toISOString(),
    },
    player: null,
    errorMessage: null,
    ...overrides,
  });
}

function setReadyState(player: PlayerState = readyPlayer()) {
  setState({
    phase: 'connected',
    status: {
      serverConnected: true,
      extensionConnected: true,
      targetStatus: 'ready',
      protocolCompatible: true,
      updatedAtUtc: new Date().toISOString(),
    },
    player,
  });
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

function mountApp() {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp(App);
  app.mount(root);
  return { app, root };
}

async function settle() {
  await nextTick();
  await Promise.resolve();
}

afterEach(() => {
  mockConnection.sendCommand.mockClear();
  mockConnection.stop.mockClear();
  document.body.innerHTML = '';
  setState();
});

describe('remote control surface', () => {
  it('shows the pairing guide when no token is paired', () => {
    const { app, root } = mountApp();

    expect(root.querySelector('h1')?.textContent).toContain('等待 Server 配對');
    const pairingButton = root.querySelector<HTMLButtonElement>('.remote-empty-state button');
    expect(pairingButton?.disabled).toBe(false);

    app.unmount();
  });

  it('renders the ready controls and sends playback commands', async () => {
    setReadyState();
    const { app, root } = mountApp();

    expect(root.querySelector('[aria-label="播放與連線控制"]')).toBeTruthy();
    expect(root.querySelector('[aria-label="影片進度"]')).toBeTruthy();
    expect(findButton(root, '播放').disabled).toBe(false);
    expect(findButton(root, '倒退十秒').disabled).toBe(false);
    expect(findButton(root, '前進十秒').disabled).toBe(false);
    expect(findButton(root, '靜音').getAttribute('aria-pressed')).toBe('false');
    expect(findButton(root, '字幕').getAttribute('aria-pressed')).toBe('false');
    expect(findButton(root, '全螢幕').getAttribute('aria-pressed')).toBe('false');
    expect(findButton(root, '播放速度').getAttribute('aria-expanded')).toBe('false');

    findButton(root, '播放').click();
    findButton(root, '倒退十秒').click();
    findButton(root, '前進十秒').click();
    findButton(root, '靜音').click();
    findButton(root, '字幕').click();
    findButton(root, '全螢幕').click();
    await settle();

    expect(mockConnection.sendCommand).toHaveBeenCalledWith(expect.objectContaining({ action: 'togglePlayback' }));
    expect(mockConnection.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'seekBy', numberValue: -10 }),
    );
    expect(mockConnection.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'seekBy', numberValue: 10 }),
    );
    expect(mockConnection.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'setMuted', booleanValue: true }),
    );
    expect(mockConnection.sendCommand).toHaveBeenCalledWith(expect.objectContaining({ action: 'toggleCaptions' }));
    expect(mockConnection.sendCommand).toHaveBeenCalledWith(expect.objectContaining({ action: 'toggleFullscreen' }));

    app.unmount();
  });

  it('opens the inline rate picker and submits a YouTube URL', async () => {
    setReadyState();
    const { app, root } = mountApp();

    findButton(root, '播放速度').click();
    await nextTick();
    expect(root.querySelector('#rate-panel')).toBeTruthy();
    expect(findButton(root, '播放速度').getAttribute('aria-expanded')).toBe('true');

    const rateButton = Array.from(root.querySelectorAll<HTMLButtonElement>('.rate-option')).find((button) =>
      button.textContent?.includes('1.5×'),
    );
    if (!rateButton) throw new Error('Rate option not found');
    rateButton.click();

    const details = root.querySelector<HTMLDetailsElement>('details');
    if (!details) throw new Error('Navigation panel not found');
    details.open = true;
    const input = root.querySelector<HTMLInputElement>('#video-url');
    if (!input) throw new Error('URL input not found');
    input.value = 'https://www.youtube.com/watch?v=next';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();

    expect(mockConnection.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'setPlaybackRate', numberValue: 1.5 }),
    );
    expect(mockConnection.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'navigate', stringValue: 'https://www.youtube.com/watch?v=next' }),
    );

    app.unmount();
  });

  it('disables seeking for live playback and reports extension offline', () => {
    setReadyState({ ...readyPlayer(), isLive: true, canSeek: false, duration: null });
    const { app: liveApp, root: liveRoot } = mountApp();

    expect(liveRoot.querySelector<HTMLInputElement>('.seek-slider')?.disabled).toBe(true);
    expect(findButton(liveRoot, '倒退十秒').disabled).toBe(true);
    expect(findButton(liveRoot, '前進十秒').disabled).toBe(true);
    expect(liveRoot.textContent).toContain('LIVE');
    liveApp.unmount();

    setState({
      phase: 'connected',
      status: {
        serverConnected: true,
        extensionConnected: false,
        targetStatus: 'none',
        protocolCompatible: false,
        updatedAtUtc: new Date().toISOString(),
      },
    });
    const { app: offlineApp, root: offlineRoot } = mountApp();

    expect(offlineRoot.textContent).toContain('請在 Chrome 載入 Extension');
    expect(findButton(offlineRoot, '播放').disabled).toBe(true);
    offlineApp.unmount();
  });

  it('shows the re-pair action when the token is rejected', () => {
    setState({ phase: 'error', errorMessage: '配對 Token 無效，請重新掃描 QR' });
    const { app, root } = mountApp();

    expect(root.querySelector('h1')?.textContent).toContain('需要重新配對');
    const repairButton = root.querySelector<HTMLButtonElement>('.remote-empty-state button');
    expect(repairButton?.disabled).toBe(false);
    expect(root.textContent).toContain('配對 Token 無效');

    app.unmount();
  });
});
