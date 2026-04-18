import { useState } from 'react';
import type { MessageComponent } from '../../types';
import { api } from '../../api/client';

const BUTTON_STYLES: Record<number, string> = {
  1: 'bg-riftapp-accent hover:bg-riftapp-accent-hover text-white',
  2: 'bg-riftapp-content-elevated hover:bg-riftapp-border text-riftapp-text',
  3: 'bg-green-600 hover:bg-green-700 text-white',
  4: 'bg-red-600 hover:bg-red-700 text-white',
  5: 'bg-riftapp-content-elevated hover:bg-riftapp-border text-riftapp-accent',
};

function ComponentButton({ component, messageId }: { component: MessageComponent; messageId: string }) {
  const [loading, setLoading] = useState(false);
  const style = BUTTON_STYLES[component.style ?? 2] ?? BUTTON_STYLES[2];

  const handleClick = async () => {
    if (component.style === 5 && component.url) {
      window.open(component.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!component.custom_id) return;
    setLoading(true);
    try {
      await api.post('/component-interactions', {
        message_id: messageId,
        custom_id: component.custom_id,
        values: [],
      });
    } catch {
      // interaction failed silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={component.disabled || loading}
      onClick={() => void handleClick()}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${style}`}
    >
      {component.label ?? 'Button'}
      {component.style === 5 && (
        <svg className="inline-block w-3 h-3 ml-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </button>
  );
}

function ComponentSelectMenu({ component, messageId }: { component: MessageComponent; messageId: string }) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, (o) => o.value);
    setSelected(values);
    if (!component.custom_id) return;
    try {
      await api.post('/component-interactions', {
        message_id: messageId,
        custom_id: component.custom_id,
        values,
      });
    } catch {
      // interaction failed silently
    }
  };

  return (
    <select
      multiple={component.max_values != null && component.max_values > 1}
      disabled={component.disabled}
      value={selected}
      onChange={(e) => void handleChange(e)}
      className="w-full max-w-[400px] bg-riftapp-bg border border-riftapp-border/60 rounded px-3 py-1.5 text-sm text-riftapp-text outline-none focus:ring-2 focus:ring-riftapp-accent/30 disabled:opacity-50"
    >
      {!selected.length && component.placeholder && (
        <option value="" disabled>{component.placeholder}</option>
      )}
      {component.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function ActionRow({ component, messageId }: { component: MessageComponent; messageId: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {component.components?.map((child, i) => (
        <ComponentItem key={child.custom_id ?? i} component={child} messageId={messageId} />
      ))}
    </div>
  );
}

function ComponentItem({ component, messageId }: { component: MessageComponent; messageId: string }) {
  switch (component.type) {
    case 1:
      return <ActionRow component={component} messageId={messageId} />;
    case 2:
      return <ComponentButton component={component} messageId={messageId} />;
    case 3:
      return <ComponentSelectMenu component={component} messageId={messageId} />;
    default:
      return null;
  }
}

export default function MessageComponents({ components, messageId }: { components: MessageComponent[]; messageId: string }) {
  if (!components || components.length === 0) return null;

  return (
    <div className="mt-1 space-y-1">
      {components.map((c, i) => (
        <ComponentItem key={c.custom_id ?? `row-${i}`} component={c} messageId={messageId} />
      ))}
    </div>
  );
}
