/**
 * Rewrites storage URLs so `<img src>` and download links load through the
 * correct path.
 *
 * **Proxy mode** (`VITE_API_URL=/api`, used on Cloudflare Pages):
 *   Every media URL is rewritten to same-origin `/api/s3/…` so the Pages
 *   Function can proxy it to the backend, which reverse-proxies to MinIO.
 *
 *   Handles all legacy URL shapes that may already be stored in the DB:
 *     • `/s3/{bucket}/{obj}`               → `/api/s3/{bucket}/{obj}`
 *     • `http://minio:9000/{bucket}/{obj}`  → `/api/s3/{bucket}/{obj}`
 *     • `https://riftapp.io/{bucket}/{obj}` → `/api/s3/{bucket}/{obj}`
 *
 * **Direct mode** (`VITE_API_URL=http://localhost:8080`):
 *   If the asset host matches the API host (or localhost during dev), the URL
 *   is left unchanged so the browser loads directly from MinIO / the backend.
 */
export function publicAssetUrl(raw: string | undefined | null): string {
  if (raw == null || raw === '') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const apiBase = import.meta.env.VITE_API_URL || '/api';
  const proxyMode = apiBase.startsWith('/');

  try {
    // ── Relative paths ──────────────────────────────────────────────
    if (trimmed.startsWith('/')) {
      if (trimmed.startsWith('/api/s3/')) return trimmed;
      if (trimmed.startsWith('/s3/')) {
        return proxyMode ? `/api${trimmed}` : trimmed;
      }
      return trimmed;
    }

    // ── Absolute URLs ───────────────────────────────────────────────
    const u = new URL(trimmed);
    const pathAndQuery = `${u.pathname}${u.search}${u.hash}`;

    if (proxyMode) {
      // In proxy mode this function is only called for media (avatars,
      // attachments, hub icons). Route everything through /api/s3.
      if (pathAndQuery.startsWith('/s3/')) {
        return `/api${pathAndQuery}`;
      }
      return `/api/s3${pathAndQuery}`;
    }

    // ── Direct mode (VITE_API_URL is a full URL) ────────────────────
    if (!pathAndQuery.startsWith('/s3/')) return trimmed;

    const hosts = new Set<string>();
    if (apiBase.startsWith('http')) {
      hosts.add(new URL(apiBase).host);
    }
    (import.meta.env.VITE_ASSET_URL_HOSTS as string | undefined)
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((h) => hosts.add(h));

    if (hosts.has(u.host)) return trimmed;

    const localDev =
      hosts.size === 0 && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (localDev && apiBase.startsWith('http')) {
      return `${new URL(apiBase).origin}/api${pathAndQuery}`;
    }

    return trimmed;
  } catch {
    // URL parsing failed — could be a bare filename or malformed value.
    // In proxy mode, attempt to route it as an S3 object path.
    if (proxyMode) {
      return `/api/s3/${trimmed}`;
    }
    return trimmed;
  }
}
