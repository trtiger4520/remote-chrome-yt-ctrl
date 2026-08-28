import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { commandRequestSchema, playerStateSchema, PROTOCOL_VERSION } from './index.js';

describe('commandRequestSchema', () => {
  it('accepts a valid seek command', () => {
    const result = commandRequestSchema.safeParse({
      protocolVersion: PROTOCOL_VERSION,
      commandId: '8f33329a-8b37-4b7a-b7e5-a9b8a9da84a4',
      action: 'seekTo',
      numberValue: 12.5,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an out-of-range volume', () => {
    const result = commandRequestSchema.safeParse({
      protocolVersion: PROTOCOL_VERSION,
      commandId: '8f33329a-8b37-4b7a-b7e5-a9b8a9da84a4',
      action: 'setVolume',
      numberValue: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('accepts value-free display toggles', () => {
    for (const action of ['toggleFullscreen', 'toggleCaptions']) {
      const result = commandRequestSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        commandId: '8f33329a-8b37-4b7a-b7e5-a9b8a9da84a4',
        action,
      });

      expect(result.success).toBe(true);
    }
  });

  it('accepts the checked-in cross-language command fixture', () => {
    const fixture = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../tests/protocol-fixtures/command-request.json'), 'utf8'),
    ) as unknown;

    expect(commandRequestSchema.safeParse(fixture).success).toBe(true);
  });

  it('accepts the checked-in cross-language player state fixture', () => {
    const fixture = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../../tests/protocol-fixtures/player-state.json'), 'utf8'),
    ) as unknown;

    expect(playerStateSchema.safeParse(fixture).success).toBe(true);
  });
});
