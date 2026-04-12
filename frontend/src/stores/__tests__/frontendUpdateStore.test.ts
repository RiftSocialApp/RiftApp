import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFrontendUpdateStore } from '../frontendUpdateStore';

const { reloadFrontendIgnoringCache, reloadOnceForFrontendUpdate } = vi.hoisted(() => ({
  reloadFrontendIgnoringCache: vi.fn(),
  reloadOnceForFrontendUpdate: vi.fn(),
}));

vi.mock('../../utils/desktop', () => ({
  getDesktop: () => ({
    reloadFrontendIgnoringCache,
  }),
}));

vi.mock('../../utils/frontendUpdate', () => ({
  reloadOnceForFrontendUpdate,
}));

describe('frontendUpdateStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reloadFrontendIgnoringCache.mockReset();
    reloadFrontendIgnoringCache.mockResolvedValue(false);
    reloadOnceForFrontendUpdate.mockReset();
    useFrontendUpdateStore.setState({
      currentCommitSha: __RIFT_FRONTEND_COMMIT_SHA__,
      currentBuildId: __RIFT_FRONTEND_BUILD_ID__,
      currentSignature: null,
      currentBackendIdentity: null,
      latestSignature: null,
      latestBackendIdentity: null,
      updateReady: false,
      applyingUpdate: false,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('marks an update ready when the backend identity changes', () => {
    useFrontendUpdateStore.setState({ currentBackendIdentity: 'backend-sha-a|run-1' });

    useFrontendUpdateStore.getState().markBackendUpdateReady('backend-sha-b|run-2');

    const state = useFrontendUpdateStore.getState();
    expect(state.updateReady).toBe(true);
    expect(state.latestBackendIdentity).toBe('backend-sha-b|run-2');
  });

  it('does not mark an update ready when the backend identity is unchanged', () => {
    useFrontendUpdateStore.setState({ currentBackendIdentity: 'backend-sha-a|run-1' });

    useFrontendUpdateStore.getState().markBackendUpdateReady('backend-sha-a|run-1');

    const state = useFrontendUpdateStore.getState();
    expect(state.updateReady).toBe(false);
    expect(state.latestBackendIdentity).toBeNull();
  });

  it('marks an update ready when a protected asset load fails before signature polling completes', () => {
    useFrontendUpdateStore.getState().markUpdateReadyFromAssetFailure();

    const state = useFrontendUpdateStore.getState();
    expect(state.updateReady).toBe(true);
    expect(state.latestSignature).toBeTruthy();
  });

  it('preserves the discovered signature when an asset failure happens later', () => {
    useFrontendUpdateStore.setState({
      latestSignature: '/assets/app-new.js|/assets/app-new.css',
      updateReady: false,
    });

    useFrontendUpdateStore.getState().markUpdateReadyFromAssetFailure();

    expect(useFrontendUpdateStore.getState().latestSignature).toBe('/assets/app-new.js|/assets/app-new.css');
  });

  it('shows the transition splash before asking the desktop shell to reload the frontend ignoring cache', async () => {
    useFrontendUpdateStore.setState({ updateReady: true });

    useFrontendUpdateStore.getState().applyUpdate();

    expect(useFrontendUpdateStore.getState().applyingUpdate).toBe(true);
    expect(reloadFrontendIgnoringCache).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(650);

    expect(reloadFrontendIgnoringCache).toHaveBeenCalledTimes(1);
  });
});