const RECOVERY_KEY = 'jd_chunk_reload_at';
const RECOVERY_WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(message);
}

/** Refresh outdated asset references once, without creating an offline reload loop. */
export function recoverChunkLoad(error: unknown): boolean {
  if (!isChunkLoadError(error) || typeof window === 'undefined' || !navigator.onLine) return false;
  try {
    const now = Date.now();
    const previous = Number(window.sessionStorage.getItem(RECOVERY_KEY));
    if (previous && now - previous < RECOVERY_WINDOW_MS) return false;
    window.sessionStorage.setItem(RECOVERY_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    // Without storage, a reload cannot be safely guarded against loops.
    return false;
  }
}

let installed = false;
export function installChunkRecovery(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  window.addEventListener('vite:preloadError', (event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (recoverChunkLoad(payload)) event.preventDefault();
  });
}