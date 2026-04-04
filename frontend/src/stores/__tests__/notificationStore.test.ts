import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../api/client', () => ({
  api: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  },
}));

import { useNotificationStore } from '../notificationStore';
import { api } from '../../api/client';

const mockedApi = vi.mocked(api);

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
    vi.clearAllMocks();
  });

  it('starts with empty notifications', () => {
    expect(useNotificationStore.getState().notifications).toEqual([]);
  });

  it('loadNotifications populates notifications', async () => {
    const notifs = [
      { id: 'n1', type: 'mention', title: 'Test', read: false, created_at: '' },
    ];
    mockedApi.getNotifications.mockResolvedValue(notifs as any);

    await useNotificationStore.getState().loadNotifications();
    expect(useNotificationStore.getState().notifications).toEqual(notifs);
  });

  it('addNotification prepends notification', () => {
    useNotificationStore.setState({
      notifications: [{ id: 'n1', type: 'mention', title: 'Old', read: false, created_at: '' }] as any,
    });

    const newNotif = { id: 'n2', type: 'dm', title: 'New', read: false, created_at: '' } as any;
    useNotificationStore.getState().addNotification(newNotif);

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(2);
    expect(notifs[0].id).toBe('n2');
  });
});
