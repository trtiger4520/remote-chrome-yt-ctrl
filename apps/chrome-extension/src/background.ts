import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import {
  commandRequestSchema,
  commandResultSchema,
  extensionHelloSchema,
  playerStateSchema,
  PROTOCOL_VERSION,
  type CommandRequest,
  type CommandResult,
  type PlayerState,
} from '@remote-youtube/protocol';
import { v7 as uuidv7 } from 'uuid';
import { isSupportedYouTubeUrl, normalizeYouTubeUrl } from './targeting.js';

const defaultServerUrl = 'http://127.0.0.1:5080';
const targetStorageKey = 'remote-youtube.target-tab-id';
const serverStorageKey = 'remote-youtube.server-url';
const heartbeatMs = 20_000;

let connection: HubConnection | null = null;
let targetTabId: number | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let startInFlight = false;
let handlersAttached = false;

async function getConfiguredServerUrl(): Promise<string> {
  const stored = await chrome.storage.local.get(serverStorageKey);
  return typeof stored[serverStorageKey] === 'string' ? stored[serverStorageKey] : defaultServerUrl;
}

async function loadTarget(): Promise<void> {
  const stored = await chrome.storage.local.get(targetStorageKey);
  targetTabId = typeof stored[targetStorageKey] === 'number' ? stored[targetStorageKey] : null;
  if (targetTabId !== null) {
    const tab = await chrome.tabs.get(targetTabId).catch(() => null);
    if (!tab || !isSupportedYouTubeUrl(tab.url)) {
      await saveTarget(null);
    }
  }
}

async function saveTarget(tabId: number | null): Promise<void> {
  targetTabId = tabId;
  if (tabId === null) await chrome.storage.local.remove(targetStorageKey);
  else await chrome.storage.local.set({ [targetStorageKey]: tabId });
}

async function chooseTarget(preferredTabId?: number): Promise<chrome.tabs.Tab | null> {
  if (preferredTabId !== undefined) {
    const preferred = await chrome.tabs.get(preferredTabId).catch(() => null);
    if (preferred && isSupportedYouTubeUrl(preferred.url)) {
      await saveTarget(preferred.id ?? null);
      return preferred;
    }
  }

  if (targetTabId !== null) {
    const current = await chrome.tabs.get(targetTabId).catch(() => null);
    if (current && isSupportedYouTubeUrl(current.url)) return current;
  }

  const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const activeYouTube = activeTabs.find((tab) => isSupportedYouTubeUrl(tab.url));
  if (activeYouTube?.id !== undefined) {
    await saveTarget(activeYouTube.id);
    return activeYouTube;
  }

  await saveTarget(null);
  return null;
}

async function executeCommand(rawCommand: unknown): Promise<CommandResult> {
  const parsed = commandRequestSchema.safeParse(rawCommand);
  if (!parsed.success) {
    const commandId =
      typeof rawCommand === 'object' &&
      rawCommand !== null &&
      'commandId' in rawCommand &&
      typeof rawCommand.commandId === 'string'
        ? rawCommand.commandId
        : uuidv7();
    return {
      commandId,
      success: false,
      status: 'rejected',
      errorCode: 'invalid_command',
      message: 'Command validation failed',
    };
  }

  const command = parsed.data;
  if (command.action === 'navigate') return navigate(command);

  const tab = await chooseTarget();
  if (!tab?.id) {
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected',
      errorCode: 'target_missing',
      message: 'No YouTube tab is available',
    };
  }

  if (command.action === 'toggleFullscreen') return toggleFullscreen(command, tab);

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'executeCommand', command });
    const parsedResult = commandResultSchema.safeParse(result);
    return parsedResult.success
      ? parsedResult.data
      : {
          commandId: command.commandId,
          success: false,
          status: 'rejected',
          errorCode: 'internal_error',
          message: 'Invalid content script response',
        };
  } catch {
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected',
      errorCode: 'video_missing',
      message: 'The YouTube video is not ready',
    };
  }
}

async function toggleFullscreen(command: CommandRequest, tab: chrome.tabs.Tab): Promise<CommandResult> {
  try {
    const targetWindow = await chrome.windows.get(tab.windowId);
    await chrome.windows.update(tab.windowId, {
      state: targetWindow.state === 'fullscreen' ? 'normal' : 'fullscreen',
    });
    await refreshTarget(tab);
    return { commandId: command.commandId, success: true, status: 'completed' };
  } catch {
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected',
      errorCode: 'internal_error',
      message: 'Unable to change the Chrome window fullscreen state',
    };
  }
}

async function navigate(command: CommandRequest): Promise<CommandResult> {
  const url = normalizeYouTubeUrl(command.stringValue);
  if (!url)
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected',
      errorCode: 'unsupported_url',
      message: 'A supported HTTPS YouTube URL is required',
    };

  const tab = await chooseTarget();
  try {
    if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { url });
    else {
      const created = await chrome.tabs.create({ url, active: true });
      if (created.id !== undefined) await saveTarget(created.id);
    }
    return { commandId: command.commandId, success: true, status: 'accepted', message: 'Navigation started' };
  } catch {
    return {
      commandId: command.commandId,
      success: false,
      status: 'rejected',
      errorCode: 'internal_error',
      message: 'Unable to navigate the YouTube tab',
    };
  }
}

async function normalizeState(rawState: unknown, tabId: number, windowId: number): Promise<PlayerState | null> {
  const parsed = playerStateSchema.safeParse(rawState);
  if (!parsed.success) return null;
  const targetWindow = await chrome.windows.get(windowId).catch(() => null);
  const normalized = playerStateSchema.safeParse({
    ...parsed.data,
    targetKey: `${tabId}:${parsed.data.targetKey}`,
    isFullscreen: targetWindow?.state === 'fullscreen',
  });
  return normalized.success ? normalized.data : null;
}

async function publishState(rawState: unknown, tabId: number, windowId: number): Promise<void> {
  if (!connection || connection.state !== HubConnectionState.Connected) return;
  const state = await normalizeState(rawState, tabId, windowId);
  if (state) await connection.invoke('PublishState', state).catch(() => undefined);
  else await connection.invoke('ClearState').catch(() => undefined);
}

async function refreshTarget(tab: chrome.tabs.Tab | null): Promise<void> {
  if (tab?.id === undefined || !connection || connection.state !== HubConnectionState.Connected) {
    if (connection?.state === HubConnectionState.Connected)
      await connection.invoke('ClearState').catch(() => undefined);
    return;
  }

  const state = await chrome.tabs.sendMessage(tab.id, { type: 'requestState' }).catch(() => null);
  await publishState(state, tab.id, tab.windowId);
}

function attachHandlers(): void {
  if (!connection || handlersAttached) return;
  connection.on('executeCommand', (command) => executeCommand(command));
  connection.onreconnected(() => {
    void registerAndPublish();
  });
  connection.onclose(() => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
    scheduleConnectionRetry();
  });
  handlersAttached = true;
}

async function startConnection(): Promise<void> {
  if (startInFlight || connection?.state === HubConnectionState.Connected) return;
  startInFlight = true;

  try {
    if (!connection) {
      const serverUrl = await getConfiguredServerUrl();
      connection = new HubConnectionBuilder()
        .withUrl(`${serverUrl}/hubs/extension`)
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();
      attachHandlers();
    }

    await connection.start();
    await registerAndPublish();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (connection?.state === HubConnectionState.Connected)
        void connection.invoke('Heartbeat').catch(() => undefined);
    }, heartbeatMs);
  } catch {
    scheduleConnectionRetry();
  } finally {
    startInFlight = false;
  }
}

async function registerAndPublish(): Promise<void> {
  if (!connection || connection.state !== HubConnectionState.Connected) return;
  const hello = extensionHelloSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    extensionVersion: chrome.runtime.getManifest().version,
  });
  const registration = commandResultSchema.parse(await connection.invoke('RegisterExtension', hello));
  if (!registration.success) {
    await connection.stop();
    return;
  }
  await refreshTarget(await chooseTarget());
}

function scheduleConnectionRetry(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void startConnection();
  }, 5000);
}

chrome.runtime.onInstalled.addListener(() => {
  void loadTarget().then(startConnection);
});
chrome.runtime.onStartup.addListener(() => {
  void loadTarget().then(startConnection);
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chooseTarget(tabId).then(refreshTarget);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === targetTabId) void chooseTarget().then(refreshTarget);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId !== targetTabId) return;
  if (changeInfo.url && !isSupportedYouTubeUrl(changeInfo.url)) {
    void chooseTarget().then(refreshTarget);
  } else if (changeInfo.status === 'complete' || changeInfo.url) {
    void chrome.tabs
      .get(tabId)
      .then(refreshTarget)
      .catch(() => undefined);
  }
});
chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return;
  const typed = message as { type: string; state?: unknown };
  if (typed.type === 'playerState' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    if (targetTabId === null || targetTabId === tabId) {
      void saveTarget(tabId).then(() => publishState(typed.state, tabId, sender.tab!.windowId));
    }
  }
});

void loadTarget().then(startConnection);
