const FRONTEND_UPDATE_SESSION_KEY = 'riftapp:stale-chunk-reload';

export function reloadOnceForFrontendUpdate() {
  try {
    const previousReload = sessionStorage.getItem(FRONTEND_UPDATE_SESSION_KEY);
    if (previousReload) {
      const timestamp = Number(previousReload);
      if (!Number.isNaN(timestamp) && Date.now() - timestamp < 30_000) {
        return;
      }
    }

    sessionStorage.setItem(FRONTEND_UPDATE_SESSION_KEY, String(Date.now()));
  } catch {
    /* ignore storage failures */
  }

  window.location.reload();
}
