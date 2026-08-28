import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCommand } from './connection';

describe('createCommand', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a UUID when randomUUID is unavailable', () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });

    const command = createCommand('togglePlayback');

    expect(command.commandId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
