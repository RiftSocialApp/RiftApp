import { create } from 'zustand';
import type { Notification } from '../types';
import { api } from '../api/client';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  loadNotifications: () => Promise<void>;
  addNotification: (notif: Notification) => void;
  markNotifRead: (notifId: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  /** Mark all unread notifications tied to a text channel as read (e.g. after opening #channel). */
  markStreamNotificationsRead: (streamId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    try {
      const fetched = await api.getNotifications();
      set((s) => {
        const fetchedIds = new Set(fetched.map((n) => n.id));
        const wsOnly = s.notifications.filter((n) => !fetchedIds.has(n.id));
        const merged = [...wsOnly, ...fetched];
        const unreadCount = merged.filter((n) => !n.read).length;
        return { notifications: merged, unreadCount };
      });
    } catch {}
  },

  addNotification: (notif) => {
    set((s) => {
      if (s.notifications.some((n) => n.id === notif.id)) return s;
      const notifications = [notif, ...s.notifications];
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    });
  },

  markNotifRead: async (notifId) => {
    try {
      await api.markNotificationRead(notifId);
      set((s) => {
        const notifications = s.notifications.map((n) =>
          n.id === notifId ? { ...n, read: true } : n
        );
        return {
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        };
      });
    } catch {}
  },

  markStreamNotificationsRead: async (streamId) => {
    const ids = get()
      .notifications.filter((n) => !n.read && n.stream_id === streamId)
      .map((n) => n.id);
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    try {
      await Promise.all(ids.map((id) => api.markNotificationRead(id)));
    } catch {
      return;
    }
    set((s) => {
      const notifications = s.notifications.map((n) =>
        idSet.has(n.id) ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    });
  },

  markAllNotifsRead: async () => {
    try {
      await api.markAllNotificationsRead();
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch {}
  },
}));
