import { useEffect, useMemo, useState } from 'react';
import { MenuOverlay, menuDivider } from '../context-menus/MenuOverlay';
import { useUserContextMenuStore } from '../../stores/userContextMenuStore';
import { useProfilePopoverStore } from '../../stores/profilePopoverStore';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import { api } from '../../api/client';
import { useFriendStore } from '../../stores/friendStore';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import { useHubStore } from '../../stores/hubStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useVoiceChannelUiStore } from '../../stores/voiceChannelUiStore';
import { getConversationMembers, isGroupConversation } from '../../utils/conversations';
import type { Hub, RelationshipType } from '../../types';

const menuItemClassName = 'mx-1.5 flex w-[calc(100%-12px)] items-center rounded-[6px] px-2.5 py-[7px] text-left text-[13px] text-[#dbdee1] transition-colors hover:bg-[#232428]';
const menuDangerItemClassName = 'mx-1.5 flex w-[calc(100%-12px)] items-center rounded-[6px] px-2.5 py-[7px] text-left text-[13px] text-[#f38b8f] transition-colors hover:bg-[#5c2b2e] hover:text-white';
const menuDisabledItemClassName = 'mx-1.5 flex w-[calc(100%-12px)] cursor-not-allowed items-center rounded-[6px] px-2.5 py-[7px] text-left text-[13px] text-[#7d828d] opacity-60';

export default function UserContextMenu() {
  const user = useUserContextMenuStore((s) => s.user);
  const rawX = useUserContextMenuStore((s) => s.x);
  const rawY = useUserContextMenuStore((s) => s.y);
  const close = useUserContextMenuStore((s) => s.close);
  const openProfile = useProfilePopoverStore((s) => s.openModal);
  const currentUser = useAuthStore((s) => s.user);
  const developerMode = useAppSettingsStore((s) => s.developerMode);
  const activeConversation = useDMStore((s) => s.conversations.find((entry) => entry.id === s.activeConversationId) ?? null);
  const openDM = useDMStore((s) => s.openDM);
  const patchConversation = useDMStore((s) => s.patchConversation);
  const removeConversationMember = useDMStore((s) => s.removeConversationMember);
  const hubs = useHubStore((s) => s.hubs);
  const loadHubs = useHubStore((s) => s.loadHubs);
  const [relationship, setRelationship] = useState<RelationshipType>('none');
  const [relLoading, setRelLoading] = useState(false);
  const [inviteSubmenuOpen, setInviteSubmenuOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSendingHubId, setInviteSendingHubId] = useState<string | null>(null);

  const isSelf = currentUser?.id === user?.id;
  const isActiveGroupConversation = Boolean(activeConversation && isGroupConversation(activeConversation, currentUser?.id));
  const activeConversationMembers = useMemo(() => getConversationMembers(activeConversation), [activeConversation]);
  const targetIsActiveGroupMember = Boolean(user && activeConversationMembers.some((member) => member.id === user.id));
  const canManageGroupMembership = Boolean(
    user
    && currentUser?.id
    && activeConversation?.owner_id === currentUser.id
    && isActiveGroupConversation
    && targetIsActiveGroupMember
    && user.id !== currentUser.id,
  );
  const canTransferOwnership = Boolean(canManageGroupMembership && activeConversation?.owner_id !== user?.id);
  const sortedInviteHubs = useMemo(
    () => [...hubs].sort((left, right) => left.name.localeCompare(right.name)),
    [hubs],
  );

  useEffect(() => {
    if (user) {
      setRelationship('none');
      setInviteSubmenuOpen(false);
      setInviteLoading(false);
      setInviteSendingHubId(null);
      if (currentUser && user.id !== currentUser.id) {
        api.getRelationship(user.id).then((r) => setRelationship(r.relationship)).catch(() => {});
      }
    }
  }, [user, currentUser]);

  useEffect(() => {
    if (!user || !inviteSubmenuOpen || hubs.length > 0) {
      return;
    }

    let cancelled = false;
    setInviteLoading(true);
    void loadHubs()
      .finally(() => {
        if (!cancelled) {
          setInviteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hubs.length, inviteSubmenuOpen, loadHubs, user]);

  if (!user) return null;

  const handleProfile = () => {
    openProfile(user);
    close();
  };

  const handleMention = () => {
    document.dispatchEvent(new CustomEvent('insert-mention', { detail: user.username }));
    close();
  };

  const handleMessage = async () => {
    close();
    await openDM(user.id);
  };

  const handleStartCall = async () => {
    if (!currentUser?.id) {
      return;
    }

    close();
    await openDM(user.id);

    const conversationId = useDMStore.getState().activeConversationId;
    if (!conversationId) {
      return;
    }

    const voiceState = useVoiceStore.getState();
    const isCurrentConversationCall = voiceState.targetKind === 'conversation'
      && voiceState.conversationId === conversationId
      && voiceState.connected;
    if (isCurrentConversationCall) {
      useVoiceChannelUiStore.getState().setActiveChannel(conversationId, 'conversation');
      return;
    }

    const existingRing = voiceState.conversationCallRings[conversationId];
    const activeMembers = voiceState.conversationVoiceMembers[conversationId] ?? [];
    const hasOtherParticipants = activeMembers.some((memberId) => memberId !== currentUser.id);
    let startedRing = false;

    if (!hasOtherParticipants && !existingRing) {
      await voiceState.startConversationCallRing(conversationId, 'audio');
      startedRing = true;
    }

    useVoiceChannelUiStore.getState().setActiveChannel(conversationId, 'conversation');
    await useVoiceStore.getState().joinConversation(conversationId);

    const joinedState = useVoiceStore.getState();
    const joinedConversationCall = joinedState.targetKind === 'conversation'
      && joinedState.conversationId === conversationId
      && joinedState.connected;
    if (startedRing && !joinedConversationCall) {
      await joinedState.cancelConversationCallRing(conversationId);
    }
  };

  const handleRemoveFromGroup = async () => {
    if (!activeConversation) {
      return;
    }

    close();
    await removeConversationMember(activeConversation.id, user.id);
  };

  const handleMakeGroupOwner = async () => {
    if (!activeConversation) {
      return;
    }

    close();
    await patchConversation(activeConversation.id, { owner_id: user.id });
  };

  const handleInviteToServer = async (hub: Hub) => {
    setInviteSendingHubId(hub.id);
    try {
      const invite = await api.createInvite(hub.id, { expires_in: 604800 });
      const conversation = await api.createOrOpenDM(user.id);
      useDMStore.getState().addConversation(conversation);
      await api.sendDMMessage(conversation.id, `${window.location.origin}/invite/${invite.code}`);
      void useDMStore.getState().loadConversations();
      close();
    } finally {
      setInviteSendingHubId(null);
    }
  };

  const handleCopyId = () => {
    void navigator.clipboard.writeText(user.id);
    close();
  };

  const handleAddFriend = async () => {
    setRelLoading(true);
    try {
      await useFriendStore.getState().sendRequest(user.id);
      setRelationship('pending_outgoing');
    } catch { /* ignore */ }
    setRelLoading(false);
    close();
  };

  const handleRemoveFriend = async () => {
    setRelLoading(true);
    try {
      await useFriendStore.getState().removeFriend(user.id);
      setRelationship('none');
    } catch { /* ignore */ }
    setRelLoading(false);
    close();
  };

  const handleAcceptFriend = async () => {
    setRelLoading(true);
    try {
      await useFriendStore.getState().acceptRequest(user.id);
      setRelationship('friends');
    } catch { /* ignore */ }
    setRelLoading(false);
    close();
  };

  const handleBlock = async () => {
    setRelLoading(true);
    try {
      await useFriendStore.getState().blockUser(user.id);
      setRelationship('blocked');
    } catch { /* ignore */ }
    setRelLoading(false);
    close();
  };

  const handleUnblock = async () => {
    setRelLoading(true);
    try {
      await useFriendStore.getState().unblockUser(user.id);
      setRelationship('none');
    } catch { /* ignore */ }
    setRelLoading(false);
    close();
  };

  const renderFriendAction = () => {
    if (isSelf || relationship === 'blocked') {
      return null;
    }

    if (relationship === 'friends') {
      return (
        <MenuRow
          label={relLoading ? 'Removing...' : 'Remove Friend'}
          onClick={() => { void handleRemoveFriend(); }}
          danger
        />
      );
    }

    if (relationship === 'pending_incoming') {
      return (
        <MenuRow
          label={relLoading ? 'Accepting...' : 'Accept Friend Request'}
          onClick={() => { void handleAcceptFriend(); }}
        />
      );
    }

    if (relationship === 'pending_outgoing') {
      return <MenuRow label="Friend Request Pending" disabled />;
    }

    return (
      <MenuRow
        label={relLoading ? 'Sending...' : 'Add Friend'}
        onClick={() => { void handleAddFriend(); }}
      />
    );
  };

  return (
    <MenuOverlay x={rawX} y={rawY} onClose={close} zIndex={260}>
      <div className="rift-context-menu-shell overflow-visible text-[#dbdee1]" onContextMenu={(event) => event.preventDefault()}>
        <MenuRow label="Profile" onClick={handleProfile} />

        {!isSelf ? <MenuRow label="Mention" onClick={handleMention} /> : null}
        {!isSelf ? <MenuRow label="Message" onClick={() => { void handleMessage(); }} /> : null}
        {!isSelf ? <MenuRow label="Start a Call" onClick={() => { void handleStartCall(); }} /> : null}

        {canManageGroupMembership || canTransferOwnership ? menuDivider() : null}

        {canManageGroupMembership ? (
          <MenuRow label="Remove from Group" onClick={() => { void handleRemoveFromGroup(); }} danger />
        ) : null}
        {canTransferOwnership ? (
          <MenuRow label="Make Group Owner" onClick={() => { void handleMakeGroupOwner(); }} danger />
        ) : null}

        {!isSelf ? menuDivider() : null}

        {!isSelf ? (
          <div
            className="relative mx-0.5"
            onMouseEnter={() => setInviteSubmenuOpen(true)}
            onMouseLeave={() => setInviteSubmenuOpen(false)}
          >
            <div className={`${menuItemClassName} cursor-default justify-between ${inviteSubmenuOpen ? 'bg-[#232428]' : ''}`}>
              <span>Invite to Server</span>
              <span className="text-riftapp-text-dim">›</span>
            </div>

            {inviteSubmenuOpen ? (
              <div className="absolute left-full top-0 z-10 pl-1" onMouseEnter={() => setInviteSubmenuOpen(true)}>
                <div className="rift-context-submenu-shell min-w-[220px] max-h-[min(70vh,340px)] overflow-y-auto">
                  {inviteLoading ? (
                    <div className="mx-1.5 flex w-[calc(100%-12px)] items-center rounded-[6px] px-2.5 py-[7px] text-[13px] text-[#8f949c]">
                      Loading servers...
                    </div>
                  ) : sortedInviteHubs.length === 0 ? (
                    <div className="mx-1.5 flex w-[calc(100%-12px)] items-center rounded-[6px] px-2.5 py-[7px] text-[13px] text-[#8f949c]">
                      No servers available
                    </div>
                  ) : (
                    sortedInviteHubs.map((hub) => (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => { void handleInviteToServer(hub); }}
                        disabled={inviteSendingHubId != null}
                        className={inviteSendingHubId != null ? menuDisabledItemClassName : menuItemClassName}
                      >
                        <span className="truncate">{inviteSendingHubId === hub.id ? 'Sending...' : hub.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isSelf ? renderFriendAction() : null}
        {!isSelf && relationship !== 'blocked' ? (
          <MenuRow label={relLoading ? 'Blocking...' : 'Block'} onClick={() => { void handleBlock(); }} danger />
        ) : null}
        {!isSelf && relationship === 'blocked' ? (
          <MenuRow label={relLoading ? 'Unblocking...' : 'Unblock'} onClick={() => { void handleUnblock(); }} />
        ) : null}

        {developerMode ? (
          <>
            {menuDivider()}
            <MenuRow
              label="Copy User ID"
              onClick={handleCopyId}
              trailing={<span className="rounded bg-white/10 px-1 py-px text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b5bac1]">ID</span>}
            />
          </>
        ) : null}
      </div>
    </MenuOverlay>
  );
}

function MenuRow({
  label,
  onClick,
  danger,
  disabled,
  trailing,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? menuDisabledItemClassName : danger ? menuDangerItemClassName : `${menuItemClassName} justify-between gap-2`}
    >
      <span>{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}
