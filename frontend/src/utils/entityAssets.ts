import type { Block, Conversation, Friendship, Hub, Message, Notification, User } from '../types';

const ASSET_VERSION_PARAM = 'v';

function rewriteVersionParam(raw: string, version?: string, remove = false): string {
  const hashIndex = raw.indexOf('#');
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : '';
  const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(query);

  if (remove) params.delete(ASSET_VERSION_PARAM);
  else if (version) params.set(ASSET_VERSION_PARAM, version);

  const nextQuery = params.toString();
  return `${path}${nextQuery ? `?${nextQuery}` : ''}${hash}`;
}

export function withAssetVersion(raw: string | undefined | null, version: string | undefined | null): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!version) return trimmed;
  return rewriteVersionParam(trimmed, version);
}

export function stripAssetVersion(raw: string | undefined | null): string {
  if (raw == null) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return rewriteVersionParam(trimmed, undefined, true);
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    avatar_url: withAssetVersion(user.avatar_url, user.updated_at),
  };
}

export function normalizeUsers(users: User[]): User[] {
  return users.map(normalizeUser);
}

export function normalizeHub(hub: Hub): Hub {
  const version = hub.updated_at || hub.created_at;
  return {
    ...hub,
    icon_url: withAssetVersion(hub.icon_url, version),
    banner_url: withAssetVersion(hub.banner_url, version),
  };
}

export function normalizeHubs(hubs: Hub[]): Hub[] {
  return hubs.map(normalizeHub);
}

export function normalizeMessage(message: Message): Message {
  return {
    ...message,
    author: message.author ? normalizeUser(message.author) : message.author,
  };
}

export function normalizeMessages(messages: Message[]): Message[] {
  return messages.map(normalizeMessage);
}

export function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    recipient: normalizeUser(conversation.recipient),
    last_message: conversation.last_message ? normalizeMessage(conversation.last_message) : conversation.last_message,
  };
}

export function normalizeNotification(notification: Notification): Notification {
  return {
    ...notification,
    actor: notification.actor ? normalizeUser(notification.actor) : notification.actor,
  };
}

export function normalizeFriendship(friendship: Friendship): Friendship {
  return {
    ...friendship,
    user: friendship.user ? normalizeUser(friendship.user) : friendship.user,
  };
}

export function normalizeBlock(block: Block): Block {
  return {
    ...block,
    user: block.user ? normalizeUser(block.user) : block.user,
  };
}