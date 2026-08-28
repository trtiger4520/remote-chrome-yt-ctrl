import { z } from 'zod';

export const PROTOCOL_VERSION = 2 as const;

export const commandActionSchema = z.enum([
  'togglePlayback',
  'toggleFullscreen',
  'toggleCaptions',
  'seekTo',
  'seekBy',
  'setVolume',
  'setMuted',
  'setPlaybackRate',
  'navigate',
]);
export type CommandAction = z.infer<typeof commandActionSchema>;

const finiteNumber = z.number().finite();

export const commandRequestSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    commandId: z.string().uuid(),
    action: commandActionSchema,
    numberValue: finiteNumber.optional(),
    booleanValue: z.boolean().optional(),
    stringValue: z.string().max(2048).optional(),
  })
  .superRefine((command, context) => {
    const requireNumber = ['seekTo', 'seekBy', 'setVolume', 'setPlaybackRate'].includes(command.action);
    const requireString = command.action === 'navigate';
    const requireBoolean = command.action === 'setMuted';

    if (requireNumber && command.numberValue === undefined) {
      context.addIssue({ code: 'custom', path: ['numberValue'], message: 'numberValue is required' });
    }
    if (requireString && command.stringValue === undefined) {
      context.addIssue({ code: 'custom', path: ['stringValue'], message: 'stringValue is required' });
    }
    if (requireBoolean && command.booleanValue === undefined) {
      context.addIssue({ code: 'custom', path: ['booleanValue'], message: 'booleanValue is required' });
    }
    if (requireNumber && (command.booleanValue !== undefined || command.stringValue !== undefined)) {
      context.addIssue({ code: 'custom', path: ['action'], message: 'numeric actions only accept numberValue' });
    }
    if (requireString && (command.numberValue !== undefined || command.booleanValue !== undefined)) {
      context.addIssue({ code: 'custom', path: ['action'], message: 'navigate only accepts stringValue' });
    }
    if (requireBoolean && (command.numberValue !== undefined || command.stringValue !== undefined)) {
      context.addIssue({ code: 'custom', path: ['action'], message: 'setMuted only accepts booleanValue' });
    }
    if (
      !requireNumber &&
      !requireString &&
      !requireBoolean &&
      (command.numberValue !== undefined || command.booleanValue !== undefined || command.stringValue !== undefined)
    ) {
      context.addIssue({ code: 'custom', path: ['action'], message: `${command.action} does not accept a value` });
    }
    if (
      command.action === 'setVolume' &&
      command.numberValue !== undefined &&
      (command.numberValue < 0 || command.numberValue > 1)
    ) {
      context.addIssue({ code: 'custom', path: ['numberValue'], message: 'volume must be between 0 and 1' });
    }
    if (
      command.action === 'setPlaybackRate' &&
      command.numberValue !== undefined &&
      ![0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(command.numberValue)
    ) {
      context.addIssue({ code: 'custom', path: ['numberValue'], message: 'unsupported playback rate' });
    }
    if (command.action === 'seekBy' && command.numberValue !== undefined && Math.abs(command.numberValue) > 60) {
      context.addIssue({ code: 'custom', path: ['numberValue'], message: 'seek delta is too large' });
    }
  });
export type CommandRequest = z.infer<typeof commandRequestSchema>;

export const commandResultSchema = z.object({
  commandId: z.string().uuid(),
  success: z.boolean(),
  status: z.enum(['completed', 'accepted', 'rejected']),
  errorCode: z.string().optional(),
  message: z.string().max(500).optional(),
});
export type CommandResult = z.infer<typeof commandResultSchema>;

export const playerStateSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  sequence: z.number().int().nonnegative(),
  targetKey: z.string().max(100),
  title: z.string().max(500),
  url: z.string().url(),
  currentTime: finiteNumber.nonnegative(),
  duration: finiteNumber.nonnegative().nullable(),
  paused: z.boolean(),
  muted: z.boolean(),
  volume: z.number().finite().min(0).max(1),
  playbackRate: finiteNumber.positive(),
  isLive: z.boolean(),
  canSeek: z.boolean(),
  isFullscreen: z.boolean(),
  captionsEnabled: z.boolean(),
  capturedAtUtc: z.string().datetime({ offset: true }),
});
export type PlayerState = z.infer<typeof playerStateSchema>;

export const systemStatusSchema = z.object({
  serverConnected: z.boolean(),
  extensionConnected: z.boolean(),
  targetStatus: z.enum(['none', 'loading', 'ready', 'unsupported']),
  targetTitle: z.string().max(500).optional(),
  protocolCompatible: z.boolean(),
  updatedAtUtc: z.string().datetime({ offset: true }),
});
export type SystemStatus = z.infer<typeof systemStatusSchema>;

export const extensionHelloSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  extensionVersion: z.string().max(50),
});
export type ExtensionHello = z.infer<typeof extensionHelloSchema>;

export const errorCodes = {
  extensionOffline: 'extension_offline',
  targetMissing: 'target_missing',
  videoMissing: 'video_missing',
  invalidCommand: 'invalid_command',
  unsupportedUrl: 'unsupported_url',
  autoplayBlocked: 'autoplay_blocked',
  protocolMismatch: 'protocol_mismatch',
  timeout: 'timeout',
  internalError: 'internal_error',
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];
