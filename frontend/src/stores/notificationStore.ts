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
}

export const useNotificationStore = create<NotificationState>((set) => ({
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
      return {
        notifications: [notif, ...s.notifications],
        unreadCount: s.unreadCount + (notif.read ? 0 : 1),
      };
    });
  },

  markNotifRead: async (notifId) => {
    try {
      await api.markNotificationRead(notifId);
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === notifId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {}
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
