import { useState, useEffect, useRef } from 'react';
import { useStreamStore } from '../../stores/streamStore';
import ModalOverlay from '../shared/ModalOverlay';
import type { Stream } from '../../types';

const REGION_OPTIONS = [
  { value: '', label: 'Automatic' },
  { value: 'us-east', label: 'US East' },
  { value: 'us-west', label: 'US West' },
  { value: 'us-central', label: 'US Central' },
  { value: 'eu-west', label: 'Europe West' },
  { value: 'eu-central', label: 'Europe Central' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'japan', label: 'Japan' },
  { value: 'brazil', label: 'Brazil' },
  { value: 'australia', label: 'Australia' },
  { value: 'india', label: 'India' },
];

interface Props {
  stream: Stream;
  onClose: () => void;
}

export default function EditChannelModal({ stream, onClose }: Props) {
  const [name, setName] = useState(stream.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patchStream = useStreamStore((s) => s.patchStream);
  const inputRef = useRef<HTMLInputElement>(null);

  const isVoice = stream.type === 1;
  const [bitrate, setBitrate] = useState(stream.bitrate || 64000);
  const [userLimit, setUserLimit] = useState(stream.user_limit || 0);
  const [region, setRegion] = useState(stream.region || '');

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSave = async () => {
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!trimmed || saving) {
      return;
    }

    const nameChanged = trimmed !== stream.name;
    const voiceChanged = isVoice && (
      bitrate !== (stream.bitrate || 64000) ||
      userLimit !== (stream.user_limit || 0) ||
      region !== (stream.region || '')
    );

    if (!nameChanged && !voiceChanged) {
      onClose();
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const voiceSettings = isVoice ? { bitrate, user_limit: userLimit, region } : undefined;
      await patchStream(stream.id, trimmed, voiceSettings);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update channel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay isOpen onClose={onClose} zIndex={300}>
      <div className="bg-riftapp-panel rounded-xl shadow-modal w-full max-w-[440px] overflow-hidden border border-riftapp-border/50">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">
              {isVoice ? 'Voice Channel Settings' : 'Text Channel Settings'}
            </h2>
            <button type="button" onClick={onClose} className="text-riftapp-text-dim hover:text-riftapp-text transition-colors p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-riftapp-text-dim mb-4">Change how this channel appears in the sidebar.</p>
          <label className="text-xs font-bold uppercase tracking-wide text-riftapp-text-dim block mb-2">Channel Name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
            }}
            className="w-full bg-riftapp-bg border border-riftapp-border/60 rounded-lg px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-riftapp-accent/40"
            autoComplete="off"
          />

          {isVoice && (
            <div className="mt-5 space-y-4">
              <div className="h-px bg-riftapp-border/40" />

              {/* Bitrate */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-riftapp-text-dim block mb-2">
                  Bitrate — {Math.round(bitrate / 1000)}kbps
                </label>
                <input
                  type="range"
                  min={8000}
                  max={96000}
                  step={1000}
                  value={bitrate}
                  onChange={(e) => setBitrate(Number(e.target.value))}
                  className="w-full accent-riftapp-accent"
                />
                <div className="flex justify-between text-[10px] text-riftapp-text-dim mt-1">
                  <span>8kbps</span>
                  <span>96kbps</span>
                </div>
              </div>

              {/* User Limit */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-riftapp-text-dim block mb-2">
                  User Limit
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={userLimit}
                    onChange={(e) => setUserLimit(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
                    className="w-20 bg-riftapp-bg border border-riftapp-border/60 rounded-lg px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-riftapp-accent/40"
                  />
                  <span className="text-sm text-riftapp-text-dim">{userLimit === 0 ? 'No limit' : `${userLimit} user${userLimit !== 1 ? 's' : ''}`}</span>
                </div>
              </div>

              {/* Region Override */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-riftapp-text-dim block mb-2">
                  Region Override
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-riftapp-bg border border-riftapp-border/60 rounded-lg px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-riftapp-accent/40 appearance-none"
                >
                  {REGION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-riftapp-danger mt-3">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-riftapp-bg/40 flex justify-end gap-2 border-t border-riftapp-border/40">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-riftapp-surface-hover transition-colors">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-riftapp-accent text-white hover:bg-riftapp-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
