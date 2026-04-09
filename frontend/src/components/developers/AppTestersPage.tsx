import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { AppTester } from '../../types';

export default function AppTestersPage() {
  const { appId } = useParams();
  const [testers, setTesters] = useState<AppTester[]>([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    if (appId) api.listAppTesters(appId).then(t => setTesters(t || []));
  }, [appId]);

  const handleAdd = async () => {
    if (!appId || !userId.trim()) return;
    await api.addAppTester(appId, userId.trim());
    const updated = await api.listAppTesters(appId);
    setTesters(updated || []);
    setUserId('');
  };

  const handleRemove = async (uid: string) => {
    if (!appId) return;
    await api.removeAppTester(appId, uid);
    setTesters(testers.filter(t => t.user_id !== uid));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-6">App Testers</h2>

      <p className="text-sm text-gray-400 mb-6">
        Add users who can test your application before it's publicly available. Testers can access your bot even if it's not verified.
      </p>

      <div className="flex gap-2 mb-6">
        <input value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="User ID" className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" />
        <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors">Add Tester</button>
      </div>

      {testers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">No testers added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {testers.map(tester => (
            <div key={tester.user_id} className="bg-[#12122a] border border-white/5 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
                  {tester.user?.display_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{tester.user?.display_name || tester.user?.username || tester.user_id}</p>
                  <p className="text-xs text-gray-500">{tester.status}</p>
                </div>
              </div>
              <button onClick={() => handleRemove(tester.user_id)} className="text-red-400 hover:text-red-300 text-sm">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
