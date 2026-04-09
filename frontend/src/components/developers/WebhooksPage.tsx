import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { AppWebhook } from '../../types';

export default function WebhooksPage() {
  const { appId } = useParams();
  const [webhooks, setWebhooks] = useState<AppWebhook[]>([]);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState('');

  useEffect(() => {
    if (appId) api.listAppWebhooks(appId).then(w => setWebhooks(w || []));
  }, [appId]);

  const handleCreate = async () => {
    if (!appId || !url.trim()) return;
    const eventTypes = events.split(',').map(e => e.trim()).filter(Boolean);
    const wh = await api.createAppWebhook(appId, { url: url.trim(), secret, event_types: eventTypes });
    setWebhooks([...webhooks, wh]);
    setUrl('');
    setSecret('');
    setEvents('');
  };

  const handleDelete = async (id: string) => {
    if (!appId) return;
    await api.deleteAppWebhook(appId, id);
    setWebhooks(webhooks.filter(w => w.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-6">Webhooks</h2>

      <div className="bg-[#12122a] border border-white/5 rounded-lg p-4 mb-6 space-y-3">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Webhook URL (https://...)" className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
        <div className="grid grid-cols-2 gap-3">
          <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="Secret (optional)" className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          <input value={events} onChange={e => setEvents(e.target.value)} placeholder="Events (comma-separated)" className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <button onClick={handleCreate} disabled={!url.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors">Create Webhook</button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No webhooks configured.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-[#12122a] border border-white/5 rounded-lg p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white font-mono truncate">{wh.url}</p>
                <div className="flex gap-2 mt-1">
                  {wh.event_types?.map(e => (
                    <span key={e} className="px-2 py-0.5 bg-indigo-600/10 text-indigo-400 rounded text-xs">{e}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDelete(wh.id)} className="text-red-400 hover:text-red-300 text-sm ml-3 flex-shrink-0">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
