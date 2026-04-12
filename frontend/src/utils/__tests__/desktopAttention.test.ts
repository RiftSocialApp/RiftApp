import { describe, expect, it } from 'vitest';

import { countIncomingConversationCallRings, getDesktopAttentionSignalCount, sumUnreadCounts } from '../desktopAttention';

describe('desktopAttention', () => {
  it('sums notification, dm, stream, and incoming call attention signals', () => {
    expect(getDesktopAttentionSignalCount({
      notificationUnreadCount: 2,
      dmUnreadCount: 3,
      streamUnreads: {
        alpha: 4,
        beta: 1,
      },
      conversationCallRings: {
        ringA: {
          conversation_id: 'conv-a',
          initiator_id: 'user-2',
          mode: 'audio',
          started_at: '2026-04-12T12:00:00.000Z',
        },
      },
      currentUserId: 'user-1',
    })).toBe(11);
  });

  it('ignores outgoing or declined call rings when counting incoming attention', () => {
    expect(countIncomingConversationCallRings({
      outgoing: {
        conversation_id: 'conv-a',
        initiator_id: 'user-1',
        mode: 'video',
        started_at: '2026-04-12T12:00:00.000Z',
      },
      declined: {
        conversation_id: 'conv-b',
        initiator_id: 'user-2',
        mode: 'audio',
        started_at: '2026-04-12T12:01:00.000Z',
        declined_user_ids: ['user-1'],
      },
      incoming: {
        conversation_id: 'conv-c',
        initiator_id: 'user-3',
        mode: 'video',
        started_at: '2026-04-12T12:02:00.000Z',
      },
    }, 'user-1')).toBe(1);
  });

  it('normalizes invalid unread counts to zero', () => {
    expect(sumUnreadCounts({
      alpha: -2,
      beta: 0,
      gamma: 5,
    })).toBe(5);
  });
});