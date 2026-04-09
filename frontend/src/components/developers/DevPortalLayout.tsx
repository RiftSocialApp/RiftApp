import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useDeveloperStore } from '../../stores/developerStore';

const sidebarLinks = [
  { label: 'General Information', path: '' },
  { label: 'Installation', path: 'installation' },
  { label: 'OAuth2', path: 'oauth2' },
  { label: 'Bot', path: 'bot' },
  { label: 'Emojis', path: 'emojis' },
  { label: 'Webhooks', path: 'webhooks' },
  { label: 'Rich Presence', path: 'rich-presence' },
  { label: 'App Testers', path: 'testers' },
  { label: 'App Verification', path: 'verification' },
];

export default function DevPortalLayout() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { applications, currentApp, fetchMe, fetchApplications, fetchApplication, setCurrentApp } = useDeveloperStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchMe();
      await fetchApplications();
      setLoaded(true);
    };
    init();
  }, [fetchMe, fetchApplications]);

  useEffect(() => {
    if (appId && loaded) {
      if (!currentApp || currentApp.id !== appId) {
        fetchApplication(appId);
      }
    }
  }, [appId, loaded, currentApp, fetchApplication]);

  const handleAppChange = (id: string) => {
    const app = applications.find(a => a.id === id);
    if (app) {
      setCurrentApp(app);
      navigate(`/developers/${id}`);
    }
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!appId) {
    return <Outlet />;
  }

  return (
    <div className="flex h-full bg-[#1a1a2e] text-gray-200">
      <aside className="w-60 flex-shrink-0 bg-[#12122a] border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <NavLink to="/developers" className="flex items-center gap-2 text-white font-semibold hover:opacity-80 transition-opacity">
            <img src="/icon.png" alt="RiftApp" className="w-7 h-7 rounded" />
            <span className="text-sm">Developer Portal</span>
          </NavLink>
        </div>

        <div className="p-3">
          <select
            value={currentApp?.id || ''}
            onChange={(e) => handleAppChange(e.target.value)}
            className="w-full bg-[#1a1a38] border border-white/10 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            {applications.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {sidebarLinks.map(link => (
            <NavLink
              key={link.path}
              to={`/developers/${appId}/${link.path}`}
              end={link.path === ''}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <NavLink
            to="/developers"
            className="block text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            &larr; All Applications
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
