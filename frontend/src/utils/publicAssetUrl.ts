// Rewrites S3/MinIO storage URLs to load through the API proxy.
// Only rewrites paths starting with /s3/ and URLs from known internal hosts
// (minio, localhost). External URLs (Discord CDN, etc.) pass through unchanged.
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
      if (trimmed.startsWith('/s3/') && looksLikeS3Path(trimmed)) {
        return proxyMode ? `/api${trimmed}` : trimmed;
      }
      return trimmed;
    }

    // ── Absolute URLs ───────────────────────────────────────────────
    const u = new URL(trimmed);
    const pathAndQuery = `${u.pathname}${u.search}${u.hash}`;

    if (pathAndQuery.startsWith('/s3/') && looksLikeS3Path(pathAndQuery)) {
      return proxyMode ? `/api${pathAndQuery}` : trimmed;
    }

    // Only rewrite URLs from known internal / S3 hosts.
    // External CDNs (Discord, Gravatar, imgur, etc.) pass through unchanged.
    if (proxyMode && isInternalStorageHost(u)) {
      return `/api/s3${pathAndQuery}`;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

// /s3/{bucket}/{object} where bucket is a single word (not "avatars", "icons", etc.)
// This filters out Discord CDN paths that were incorrectly prefixed with /s3 by migration 009.
const S3_BUCKET = (import.meta.env.VITE_S3_BUCKET as string | undefined)?.trim() || 'riftapp';
function looksLikeS3Path(p: string): boolean {
  const afterS3 = p.slice('/s3/'.length);
  return afterS3.startsWith(`${S3_BUCKET}/`);
}


function isInternalStorageHost(u: URL): boolean {
  const h = u.hostname;
  if (h === 'minio' || h === 'localhost' || h === '127.0.0.1') return true;
  if (u.port === '9000') return true;

  const extra = (import.meta.env.VITE_ASSET_URL_HOSTS as string | undefined)
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (extra?.includes(u.host)) return true;

  return false;
}
