import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { RichPresenceAsset } from '../../types';

export default function RichPresencePage() {
  const { appId } = useParams();
  const [assets, setAssets] = useState<RichPresenceAsset[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'large' | 'small'>('large');

  useEffect(() => {
    if (appId) api.listRichPresenceAssets(appId).then(a => setAssets(a || []));
  }, [appId]);

  const handleCreate = async () => {
    if (!appId || !name.trim()) return;
    const asset = await api.createRichPresenceAsset(appId, { name: name.trim(), type, image_hash: 'placeholder' });
    setAssets([...assets, asset]);
    setName('');
  };

  const handleDelete = async (id: string) => {
    if (!appId) return;
    await api.deleteRichPresenceAsset(appId, id);
    setAssets(assets.filter(a => a.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-6">Rich Presence</h2>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-white mb-3">Art Assets</h3>
        <div className="flex gap-2 mb-4">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Asset name" className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          <select value={type} onChange={e => setType(e.target.value as 'large' | 'small')} className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="large">Large</option>
            <option value="small">Small</option>
          </select>
          <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors">Add Asset</button>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No assets yet. Upload images for your Rich Presence.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {assets.map(asset => (
              <div key={asset.id} className="bg-[#12122a] border border-white/5 rounded-lg p-3">
                <div className="w-full aspect-square bg-black/20 rounded-lg mb-2 flex items-center justify-center text-gray-600 text-xs">Preview</div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{asset.name}</p>
                    <p className="text-xs text-gray-500">{asset.type}</p>
                  </div>
                  <button onClick={() => handleDelete(asset.id)} className="text-red-400 hover:text-red-300 text-sm">&times;</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 pt-6">
        <h3 className="text-sm font-semibold text-white mb-3">Visualizer</h3>
        <div className="bg-[#12122a] border border-white/5 rounded-lg p-6 text-center text-gray-500 text-sm">
          Rich Presence preview will appear here when you have assets configured.
        </div>
      </div>
    </div>
  );
}
