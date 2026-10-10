import { afterEach, describe, expect, test, vi } from 'vitest';
import { isChunkLoadError, recoverChunkLoad } from './chunk-recovery';

afterEach(() => vi.unstubAllGlobals());

function browser(online = true) {
  const values = new Map<string, string>();
  const reload = vi.fn();
  vi.stubGlobal('navigator', { onLine: online });
  vi.stubGlobal('window', { location: { reload }, sessionStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  return reload;
}

describe('stale route module recovery', () => {
  const error = new TypeError('Failed to fetch dynamically imported module: /assets/route-old.js');
  test('recognizes module loading failures but not application errors', () => {
    expect(isChunkLoadError(error)).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Subscription inactive'))).toBe(false);
  });
  test('reloads once and suppresses a repeated failure', () => {
    const reload = browser();
    expect(recoverChunkLoad(error)).toBe(true);
    expect(recoverChunkLoad(error)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  test('does not reload offline or for unrelated failures', () => {
    const reload = browser(false);
    expect(recoverChunkLoad(error)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    browser();
    expect(recoverChunkLoad(new Error('Other error'))).toBe(false);
  });
  test('does not loop if browser storage is unavailable', () => {
    const reload = browser();
    window.sessionStorage.setItem = () => { throw new Error('Storage blocked'); };
    expect(recoverChunkLoad(error)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});