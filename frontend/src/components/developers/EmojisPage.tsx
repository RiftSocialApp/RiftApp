import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { AppEmoji } from '../../types';

export default function EmojisPage() {
  const { appId } = useParams();
  const [emojis, setEmojis] = useState<AppEmoji[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (appId) api.listAppEmojis(appId).then(e => setEmojis(e || []));
  }, [appId]);

  const handleCreate = async () => {
    if (!appId || !newName.trim()) return;
    const emoji = await api.createAppEmoji(appId, newName.trim(), 'placeholder');
    setEmojis([...emojis, emoji]);
    setNewName('');
  };

  const handleDelete = async (id: string) => {
    if (!appId) return;
    await api.deleteAppEmoji(appId, id);
    setEmojis(emojis.filter(e => e.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-6">Emojis</h2>

      <div className="flex gap-2 mb-6">
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Emoji name" className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
        <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors">Upload Emoji</button>
      </div>

      {emojis.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">😶</p>
          <p className="text-sm">No emojis yet. Upload your first custom emoji.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {emojis.map(emoji => (
            <div key={emoji.id} className="bg-[#12122a] border border-white/5 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{emoji.name}</p>
                <p className="text-xs text-gray-500 font-mono truncate">{emoji.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => handleDelete(emoji.id)} className="text-red-400 hover:text-red-300 text-sm">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
