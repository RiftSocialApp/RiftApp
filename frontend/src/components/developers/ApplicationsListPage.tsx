import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeveloperStore } from '../../stores/developerStore';
import { api } from '../../api/client';
import type { Application } from '../../types';

export default function ApplicationsListPage() {
  const { applications, fetchApplications, fetchMe, isLoading, createApplication } = useDeveloperStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newName, setNewName] = useState('');
  const [importToken, setImportToken] = useState('');
  const [importName, setImportName] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBotToken, setNewBotToken] = useState('');

  useEffect(() => {
    fetchMe();
    fetchApplications();
  }, [fetchMe, fetchApplications]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { app, botToken } = await createApplication(newName.trim());
      setNewBotToken(botToken);
      setNewName('');
      setShowCreate(false);
      navigate(`/developers/${app.id}`);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    if (!importToken.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const result = await api.importDiscordBot(importToken.trim(), importName.trim() || undefined);
      setImportToken('');
      setImportName('');
      setShowImport(false);
      await fetchApplications();
      navigate(`/developers/${result.application.id}`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#1a1a2e] text-gray-200">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="RiftApp" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-white">Applications</h1>
              <p className="text-sm text-gray-400">Manage your RiftApp bots and integrations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-[#2d2d5e] hover:bg-[#3d3d6e] text-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              Import Discord Bot
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              New Application
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-white mb-2">No applications yet</h2>
            <p className="text-gray-400 mb-6">Create your first application to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              New Application
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app: Application) => (
              <button
                key={app.id}
                onClick={() => navigate(`/developers/${app.id}`)}
                className="bg-[#12122a] border border-white/5 rounded-lg p-4 text-left hover:border-indigo-500/30 hover:bg-[#16163a] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-xl font-bold">
                    {app.icon ? (
                      <img src={app.icon} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      app.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">{app.name}</h3>
                    <p className="text-xs text-gray-500 font-mono truncate">{app.id}</p>
                  </div>
                </div>
                {app.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">{app.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {app.tags?.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-indigo-600/10 text-indigo-400 rounded text-xs">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {newBotToken && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setNewBotToken('')}>
            <div className="bg-[#1e1e3a] rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-2">Bot Token Created</h3>
              <p className="text-sm text-gray-400 mb-4">Copy your bot token now. You won't be able to see it again.</p>
              <div className="bg-black/40 rounded p-3 font-mono text-sm text-green-400 break-all mb-4 select-all">{newBotToken}</div>
              <button onClick={() => { navigator.clipboard.writeText(newBotToken); setNewBotToken(''); }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors">
                Copy & Close
              </button>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-[#1e1e3a] rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-4">Create Application</h3>
              <label className="block text-sm text-gray-400 mb-1">Application Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="My Bot"
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mb-4"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowImport(false)}>
            <div className="bg-[#1e1e3a] rounded-lg p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-2">Import Discord Bot</h3>
              <p className="text-sm text-gray-400 mb-4">
                Paste your Discord bot token below. We'll fetch your bot's full configuration
                (name, description, icon, tags, intents, privacy URLs, and more) from Discord
                and clone it into a new RiftApp application.
              </p>
              <label className="block text-sm text-gray-400 mb-1">Discord Bot Token</label>
              <input
                value={importToken}
                onChange={e => setImportToken(e.target.value)}
                placeholder="MTI3NjAx..."
                type="password"
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mb-3 font-mono"
                autoFocus
              />
              <label className="block text-sm text-gray-400 mb-1">Override Name (optional)</label>
              <input
                value={importName}
                onChange={e => setImportName(e.target.value)}
                placeholder="Leave blank to use Discord bot's name"
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 mb-3"
              />
              {importError && <p className="text-sm text-red-400 mb-3">{importError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleImport} disabled={importing || !importToken.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
