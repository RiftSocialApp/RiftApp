import type { DMCallRing } from '../types';

type DesktopAttentionSignalInput = {
  notificationUnreadCount: number;
  dmUnreadCount: number;
  streamUnreads: Record<string, number>;
  conversationCallRings: Record<string, DMCallRing>;
  currentUserId?: string | null;
};

function normalizeUnreadCount(value: number | null | undefined) {
  return Number.isFinite(value) && value != null && value > 0 ? value : 0;
}

export function sumUnreadCounts(counts: Record<string, number>) {
  return Object.values(counts).reduce((total, count) => total + normalizeUnreadCount(count), 0);
}

export function countIncomingConversationCallRings(
  conversationCallRings: Record<string, DMCallRing>,
  currentUserId?: string | null,
) {
  if (!currentUserId) {
    return 0;
  }

  return Object.values(conversationCallRings).filter((ring) => {
    if (ring.initiator_id === currentUserId) {
      return false;
    }

    return !(ring.declined_user_ids ?? []).includes(currentUserId);
  }).length;
}

export function getDesktopAttentionSignalCount({
  notificationUnreadCount,
  dmUnreadCount,
  streamUnreads,
  conversationCallRings,
  currentUserId,
}: DesktopAttentionSignalInput) {
  return normalizeUnreadCount(notificationUnreadCount)
    + normalizeUnreadCount(dmUnreadCount)
    + sumUnreadCounts(streamUnreads)
    + countIncomingConversationCallRings(conversationCallRings, currentUserId);
}