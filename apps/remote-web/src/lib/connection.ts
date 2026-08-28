import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import {
  commandRequestSchema,
  commandResultSchema,
  playerStateSchema,
  systemStatusSchema,
  type CommandRequest,
  type CommandResult,
  type PlayerState,
  type SystemStatus,
} from '@remote-youtube/protocol';
import { reactive } from 'vue';

export type ConnectionPhase = 'unpaired' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RemoteConnectionState {
  phase: ConnectionPhase;
  token: string | null;
  status: SystemStatus;
  player: PlayerState | null;
  errorMessage: string | null;
}

const defaultStatus = (): SystemStatus => ({
  serverConnected: false,
  extensionConnected: false,
  targetStatus: 'none',
  protocolCompatible: false,
  updatedAtUtc: new Date(0).toISOString(),
});

export function createRemoteConnection(token: string | null) {
  const state = reactive<RemoteConnectionState>({
    phase: token ? 'connecting' : 'unpaired',
    token,
    status: defaultStatus(),
    player: null,
    errorMessage: null,
  });

  let connection: HubConnection | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let startInFlight = false;
  let disposed = false;

  const applyStatus = (payload: unknown) => {
    const parsed = systemStatusSchema.safeParse(payload);
    if (parsed.success) {
      state.status = parsed.data;
    }
  };

  const applyPlayerState = (payload: unknown) => {
    const parsed = playerStateSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    const current = state.player;
    if (current && current.targetKey === parsed.data.targetKey && parsed.data.sequence < current.sequence) {
      return;
    }
    state.player = parsed.data;
  };

  const scheduleStart = (delayMs: number) => {
    if (disposed || retryTimer) {
      return;
    }
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void start();
    }, delayMs);
  };

  const start = async (): Promise<void> => {
    if (disposed || !state.token || startInFlight || connection?.state === HubConnectionState.Connected) {
      return;
    }

    startInFlight = true;
    state.phase = state.phase === 'connected' ? 'reconnecting' : 'connecting';
    state.errorMessage = null;

    connection ??= new HubConnectionBuilder()
      .withUrl('/hubs/remote', { accessTokenFactory: () => state.token ?? '' })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    try {
      await connection.start();
      state.phase = 'connected';
      state.status = { ...state.status, serverConnected: true, updatedAtUtc: new Date().toISOString() };
      const snapshot = await connection.invoke<{ status: unknown; state: unknown }>('GetSnapshot');
      applyStatus(snapshot.status);
      if (snapshot.state) {
        applyPlayerState(snapshot.state);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '無法連線至 Server';
      state.phase = message.includes('401') || message.includes('Unauthorized') ? 'error' : 'reconnecting';
      state.errorMessage = state.phase === 'error' ? '配對 Token 無效，請重新掃描 QR' : 'Server 尚未連線，正在重試';
      if (state.phase !== 'error') scheduleStart(5000);
    } finally {
      startInFlight = false;
    }
  };

  const sendCommand = async (command: CommandRequest): Promise<CommandResult> => {
    const parsed = commandRequestSchema.safeParse(command);
    if (!parsed.success || !connection || connection.state !== HubConnectionState.Connected) {
      throw new Error('目前尚未連線');
    }

    const rawResult = await connection.invoke<unknown>('SendCommand', parsed.data);
    const result = commandResultSchema.parse(rawResult);
    if (!result.success) {
      state.errorMessage = result.message ?? '操作未完成';
    }
    return result;
  };

  // The handlers are attached after the first start connection is created as well.
  const ensureHandlers = () => {
    if (!connection || connectionHasHandlers) {
      return;
    }
    connection.on('SystemStatus', applyStatus);
    connection.on('PlayerState', applyPlayerState);
    connection.on('extensionOffline', () => {
      const statusWithoutTitle = { ...state.status };
      delete statusWithoutTitle.targetTitle;
      state.status = {
        ...statusWithoutTitle,
        extensionConnected: false,
        targetStatus: 'none',
        protocolCompatible: false,
        updatedAtUtc: new Date().toISOString(),
      };
      state.player = null;
    });
    connection.onreconnecting(() => {
      state.phase = 'reconnecting';
      state.status = { ...state.status, serverConnected: false };
    });
    connection.onreconnected(() => {
      state.phase = 'connected';
      state.status = { ...state.status, serverConnected: true };
      void connection
        ?.invoke<{ status: unknown; state: unknown }>('GetSnapshot')
        .then((snapshot) => {
          applyStatus(snapshot.status);
          if (snapshot.state) applyPlayerState(snapshot.state);
        })
        .catch(() => undefined);
    });
    connection.onclose(() => {
      state.status = { ...state.status, serverConnected: false };
      if (!disposed && state.phase !== 'error') {
        state.phase = 'reconnecting';
        scheduleStart(5000);
      }
    });
    connectionHasHandlers = true;
  };
  let connectionHasHandlers = false;

  const originalStart = start;
  const startWithHandlers = async () => {
    ensureHandlers();
    await originalStart();
    ensureHandlers();
  };

  const stop = async () => {
    disposed = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    await connection?.stop();
  };

  if (token) {
    void startWithHandlers();
  }

  return { state, start: startWithHandlers, stop, sendCommand };
}

export function createCommand(action: CommandRequest['action'], values: Partial<CommandRequest> = {}): CommandRequest {
  return {
    protocolVersion: 1,
    commandId: crypto.randomUUID(),
    action,
    ...values,
  } as CommandRequest;
}
