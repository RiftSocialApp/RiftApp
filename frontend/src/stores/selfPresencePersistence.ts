export const SELF_PRESENCE_STORAGE_KEY = 'riftapp-self-presence.v1';

type PersistedSelfPresence = {
  userId: string;
  status: number;
};

function isKnownSelfStatus(status: unknown): status is number {
  return typeof status === 'number' && Number.isInteger(status) && status >= 0 && status <= 3;
}

function isSelectableSelfStatus(status: unknown): status is number {
  return typeof status === 'number' && Number.isInteger(status) && status >= 1 && status <= 3;
}

function readPersistedSelfPresence(): PersistedSelfPresence | null {
  try {
    const raw = localStorage.getItem(SELF_PRESENCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSelfPresence>;
    if (typeof parsed.userId !== 'string' || !isKnownSelfStatus(parsed.status)) {
      return null;
    }
    return { userId: parsed.userId, status: parsed.status };
  } catch {
    return null;
  }
}

export function getPersistedSelfPresence(userId: string): number | null {
  const persisted = readPersistedSelfPresence();
  if (!persisted || persisted.userId !== userId) {
    return null;
  }
  return persisted.status;
}

export function resolveInitialSelfPresenceStatus(userId: string, fallbackStatus?: number): number {
  const persisted = getPersistedSelfPresence(userId);
  if (persisted !== null) {
    return persisted;
  }
  return isSelectableSelfStatus(fallbackStatus) ? fallbackStatus : 1;
}

export function persistSelfPresence(userId: string, status: number) {
  if (typeof userId !== 'string' || userId.length === 0 || !isKnownSelfStatus(status)) {
    return;
  }

  try {
    localStorage.setItem(SELF_PRESENCE_STORAGE_KEY, JSON.stringify({ userId, status }));
  } catch {
    /* ignore storage failures */
  }
}

export function clearPersistedSelfPresence(userId?: string) {
  try {
    if (userId) {
      const persisted = readPersistedSelfPresence();
      if (persisted && persisted.userId !== userId) {
        return;
      }
    }
    localStorage.removeItem(SELF_PRESENCE_STORAGE_KEY);
  } catch {
    /* ignore storage failures */
  }
}