import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HubSidebar from '../sidebar/HubSidebar';
import StreamSidebar from '../sidebar/StreamSidebar';
import DMSidebar from '../sidebar/DMSidebar';
import ChatPanel from '../chat/ChatPanel';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useHubStore } from '../../stores/hubStore';
import { useDMStore } from '../../stores/dmStore';

export default function AppLayout() {
  useWebSocket();
  const loadHubs = useHubStore((s) => s.loadHubs);
  const activeConversationId = useDMStore((s) => s.activeConversationId);
  const params = useParams<{ hubId?: string; streamId?: string; conversationId?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    loadHubs();
  }, [loadHubs]);

  useEffect(() => {
    if (params.hubId) {
      const hub = useHubStore.getState();
      if (hub.activeHubId !== params.hubId) {
        hub.setActiveHub(params.hubId);
      }
    } else if (params.conversationId) {
      const dm = useDMStore.getState();
      if (dm.activeConversationId !== params.conversationId) {
        dm.loadConversations().then(() => {
          dm.setActiveConversation(params.conversationId!);
        });
      }
    }
  }, [params.hubId, params.conversationId]);

  return (
    <div className="h-screen flex overflow-hidden">
      <HubSidebar />
      {activeConversationId ? <DMSidebar /> : <StreamSidebar />}
      <ChatPanel />
    </div>
  );
}
