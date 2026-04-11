import type { Message } from '../types';

export const MESSAGE_SYSTEM_TYPE_CONVERSATION_CALL_STARTED = 'conversation_call_started';
export const MESSAGE_SYSTEM_TYPE_CONVERSATION_VIDEO_CALL_STARTED = 'conversation_video_call_started';

export function isConversationCallSystemType(systemType?: Message['system_type'] | null) {
  return systemType === MESSAGE_SYSTEM_TYPE_CONVERSATION_CALL_STARTED
    || systemType === MESSAGE_SYSTEM_TYPE_CONVERSATION_VIDEO_CALL_STARTED;
}

export function isConversationCallSystemMessage(message?: Pick<Message, 'system_type'> | null) {
  return isConversationCallSystemType(message?.system_type);
}

export function getConversationCallSystemMessagePreview(systemType?: Message['system_type'] | null) {
  if (systemType === MESSAGE_SYSTEM_TYPE_CONVERSATION_VIDEO_CALL_STARTED) {
    return 'Started a video call';
  }
  if (systemType === MESSAGE_SYSTEM_TYPE_CONVERSATION_CALL_STARTED) {
    return 'Started a call';
  }
  return null;
}

export function getConversationCallSystemMessageSuffix(systemType?: Message['system_type'] | null) {
  if (systemType === MESSAGE_SYSTEM_TYPE_CONVERSATION_VIDEO_CALL_STARTED) {
    return 'started a video call.';
  }
  if (systemType === MESSAGE_SYSTEM_TYPE_CONVERSATION_CALL_STARTED) {
    return 'started a call.';
  }
  return null;
}