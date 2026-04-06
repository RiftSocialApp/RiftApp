import { useState } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌐' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'science', label: 'Science & Tech', icon: '🔬' },
  { id: 'music', label: 'Music', icon: '🎵' },
];

const PLACEHOLDER_HUBS = [
  { name: 'Rift Official', members: '12,400', category: 'all', color: '#5865f2' },
  { name: 'Indie Game Devs', members: '8,200', category: 'gaming', color: '#43b581' },
  { name: 'Lo-Fi Beats', members: '5,600', category: 'music', color: '#f59e0b' },
  { name: 'Web Dev Hub', members: '9,300', category: 'science', color: '#6366f1' },
  { name: 'Movie Night', members: '3,100', category: 'entertainment', color: '#ed4245' },
  { name: 'Study Together', members: '7,800', category: 'education', color: '#3c45a5' },
];

export default function DiscoverPage() {
  const [active, setActive] = useState('all');

  const filtered = active === 'all'
    ? PLACEHOLDER_HUBS
    : PLACEHOLDER_HUBS.filter((h) => h.category === active);

  return (
    <div className="min-h-screen bg-marketing-light">
      {/* Hero */}
      <section className="bg-marketing-light-accent py-16 text-center">
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-gray-900 sm:text-5xl">
          Discover your next<br />favorite hub
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-gray-600">
          Find a new space to play games, chill with friends, and hang out.
        </p>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                active === cat.id
                  ? 'bg-marketing-hero text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search communities"
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              readOnly
            />
          </div>
        </div>

        {/* Hub grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((hub) => (
            <div
              key={hub.name}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Banner */}
              <div
                className="h-28"
                style={{ background: `linear-gradient(135deg, ${hub.color}, ${hub.color}88)` }}
              />
              {/* Body */}
              <div className="relative px-4 pb-5 pt-8">
                {/* Hub icon */}
                <div
                  className="absolute -top-6 left-4 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white text-lg font-bold text-white shadow-md"
                  style={{ backgroundColor: hub.color }}
                >
                  {hub.name[0]}
                </div>
                <h3 className="text-sm font-bold text-gray-900">{hub.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{hub.members} members</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
