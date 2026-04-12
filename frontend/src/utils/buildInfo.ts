const API_BASE = import.meta.env.VITE_API_URL || '/api';

type BackendBuildInfoResponse = {
  data?: {
    commit_sha?: string;
    build_id?: string;
  };
};

export type BackendBuildInfo = {
  commitSha: string | null;
  buildId: string | null;
};

export const emptyBackendBuildInfo: BackendBuildInfo = {
  commitSha: null,
  buildId: null,
};

export function normalizeBuildToken(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function formatShortCommitSha(commitSha: string | null | undefined) {
  const normalized = normalizeBuildToken(commitSha);
  return normalized ? normalized.slice(0, 7) : '';
}

export function createBackendIdentity(commitSha: string | null, buildId: string | null) {
  if (!commitSha && !buildId) return null;
  return `${commitSha ?? ''}|${buildId ?? ''}`;
}

export function parseBackendIdentity(identity: string | null | undefined): BackendBuildInfo {
  const normalized = normalizeBuildToken(identity);
  if (!normalized) {
    return emptyBackendBuildInfo;
  }

  const [commitSha = '', buildId = ''] = normalized.split('|', 2);
  return {
    commitSha: normalizeBuildToken(commitSha),
    buildId: normalizeBuildToken(buildId),
  };
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(API_BASE)) {
    return `${API_BASE.replace(/\/+$/, '')}${normalizedPath}`;
  }

  const normalizedBase = API_BASE.startsWith('/') ? API_BASE : `/${API_BASE}`;
  return `${window.location.origin}${normalizedBase.replace(/\/+$/, '')}${normalizedPath}`;
}

export async function fetchBackendBuildInfo(): Promise<{ available: boolean; info: BackendBuildInfo } | null> {
  const response = await fetch(`${buildApiUrl('/build-info')}?build-info=${Date.now()}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return {
      available: false,
      info: emptyBackendBuildInfo,
    };
  }

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as BackendBuildInfoResponse | null;
  return {
    available: true,
    info: {
      commitSha: normalizeBuildToken(payload?.data?.commit_sha),
      buildId: normalizeBuildToken(payload?.data?.build_id),
    },
  };
}