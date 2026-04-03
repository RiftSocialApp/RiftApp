import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../api/client', () => ({
  api: {
    getHubs: vi.fn(),
    createHub: vi.fn(),
    updateHub: vi.fn(),
  },
}));

import { useHubStore } from '../hubStore';
import { api } from '../../api/client';

const mockedApi = vi.mocked(api);

describe('hubStore', () => {
  beforeEach(() => {
    useHubStore.setState({ hubs: [], activeHubId: null });
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const state = useHubStore.getState();
    expect(state.hubs).toEqual([]);
    expect(state.activeHubId).toBeNull();
  });

  it('loadHubs populates hubs', async () => {
    const mockHubs = [
      { id: '1', name: 'Hub 1', owner_id: 'u1', created_at: '' },
      { id: '2', name: 'Hub 2', owner_id: 'u2', created_at: '' },
    ];
    mockedApi.getHubs.mockResolvedValue(mockHubs as any);

    await useHubStore.getState().loadHubs();
    expect(useHubStore.getState().hubs).toEqual(mockHubs);
  });

  it('createHub adds hub to list', async () => {
    const newHub = { id: '3', name: 'New Hub', owner_id: 'u1', created_at: '' };
    mockedApi.createHub.mockResolvedValue(newHub as any);

    const result = await useHubStore.getState().createHub('New Hub');
    expect(result).toEqual(newHub);
    expect(useHubStore.getState().hubs).toContainEqual(newHub);
  });

  it('updateHub updates hub in list', async () => {
    useHubStore.setState({
      hubs: [{ id: '1', name: 'Old', owner_id: 'u1', created_at: '' }] as any,
    });

    const updated = { id: '1', name: 'Updated', owner_id: 'u1', created_at: '' };
    mockedApi.updateHub.mockResolvedValue(updated as any);

    await useHubStore.getState().updateHub('1', { name: 'Updated' });
    expect(useHubStore.getState().hubs[0].name).toBe('Updated');
  });

  it('clearActive resets activeHubId', () => {
    useHubStore.setState({ activeHubId: '1' });
    useHubStore.getState().clearActive();
    expect(useHubStore.getState().activeHubId).toBeNull();
  });
});
