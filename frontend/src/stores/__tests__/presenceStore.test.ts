import { beforeEach, describe, expect, it } from 'vitest';

import type { User } from '../../types';
import { usePresenceStore } from '../presenceStore';
import {
  SELF_PRESENCE_STORAGE_KEY,
  getPersistedSelfPresence,
} from '../selfPresencePersistence';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'alpha',
    display_name: 'Alpha',
    status: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('presenceStore', () => {
  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    localStorage.removeItem(SELF_PRESENCE_STORAGE_KEY);
    usePresenceStore.getState().clearSessionCaches();
    usePresenceStore.getState().clearSelfPresence();
  });

  it('hydrates self status from persisted storage instead of falling back to offline', () => {
    usePresenceStore.getState().setSelfPresence('user-1', 2);
    usePresenceStore.getState().clearSessionCaches();

    const resolvedStatus = usePresenceStore.getState().hydrateSelfPresence('user-1', 0);

    expect(resolvedStatus).toBe(2);
    expect(usePresenceStore.getState().selfUserId).toBe('user-1');
    expect(usePresenceStore.getState().presence['user-1']).toBe(2);
  });

  it('defaults self hydration to online when no stored value exists and fallback is offline', () => {
    const resolvedStatus = usePresenceStore.getState().hydrateSelfPresence('user-1', 0);

    expect(resolvedStatus).toBe(1);
    expect(usePresenceStore.getState().presence['user-1']).toBe(1);
  });

  it('preserves the explicit self status when user merges bring back stale offline data', () => {
    usePresenceStore.getState().setSelfPresence('user-1', 3);

    usePresenceStore.getState().mergeUser(makeUser({ status: 0 }));

    const state = usePresenceStore.getState();
    expect(state.presence['user-1']).toBe(3);
    expect(state.hubMembers['user-1']?.status).toBe(3);
  });

  it('clears persisted self status on logout cleanup', () => {
    usePresenceStore.getState().setSelfPresence('user-1', 0);

    usePresenceStore.getState().clearSelfPresence('user-1');

    expect(getPersistedSelfPresence('user-1')).toBeNull();
    expect(usePresenceStore.getState().presence['user-1']).toBeUndefined();
  });
});