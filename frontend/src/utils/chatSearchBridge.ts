export const CHAT_SEARCH_REQUEST_EVENT = 'riftapp:chat-search-request';

export type ChatSearchRequestDetail = {
  query?: string;
  run?: boolean;
};

export function dispatchChatSearchRequest(detail: ChatSearchRequestDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ChatSearchRequestDetail>(CHAT_SEARCH_REQUEST_EVENT, { detail }));
}

export function subscribeToChatSearchRequests(
  listener: (detail: ChatSearchRequestDetail) => void,
) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ChatSearchRequestDetail>;
    listener(customEvent.detail ?? {});
  };

  window.addEventListener(CHAT_SEARCH_REQUEST_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(CHAT_SEARCH_REQUEST_EVENT, handler as EventListener);
  };
}