import type { MessageEmbed as EmbedType } from '../../types';

function intToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

function EmbedFieldItem({ name, value, inline }: { name: string; value: string; inline?: boolean }) {
  return (
    <div className={inline ? 'min-w-[120px] flex-1' : 'w-full'}>
      <div className="text-xs font-semibold text-riftapp-text/80 mb-0.5">{name}</div>
      <div className="text-sm text-riftapp-text/70 whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}

export default function MessageEmbedCard({ embed }: { embed: EmbedType }) {
  const barColor = embed.color ? intToHex(embed.color) : '#5865F2';

  const inlineFields = embed.fields?.filter((f) => f.inline) ?? [];
  const blockFields = embed.fields?.filter((f) => !f.inline) ?? [];

  return (
    <div className="max-w-[520px] mt-1 rounded overflow-hidden bg-riftapp-content-elevated/60 border border-riftapp-border/30 flex">
      <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: barColor }} />
      <div className="py-2 px-3 min-w-0 flex-1 space-y-1.5">
        {embed.author && (
          <div className="flex items-center gap-1.5">
            {embed.author.icon_url && (
              <img src={embed.author.icon_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            )}
            {embed.author.url ? (
              <a href={embed.author.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-riftapp-text hover:underline">
                {embed.author.name}
              </a>
            ) : (
              <span className="text-xs font-semibold text-riftapp-text">{embed.author.name}</span>
            )}
          </div>
        )}

        {embed.title && (
          <div className="font-semibold text-sm text-riftapp-text">
            {embed.url ? (
              <a href={embed.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-riftapp-accent">
                {embed.title}
              </a>
            ) : embed.title}
          </div>
        )}

        {embed.description && (
          <div className="text-sm text-riftapp-text/70 whitespace-pre-wrap break-words">{embed.description}</div>
        )}

        {(inlineFields.length > 0 || blockFields.length > 0) && (
          <div className="space-y-1">
            {inlineFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {inlineFields.map((f, i) => (
                  <EmbedFieldItem key={i} name={f.name} value={f.value} inline />
                ))}
              </div>
            )}
            {blockFields.map((f, i) => (
              <EmbedFieldItem key={`b-${i}`} name={f.name} value={f.value} />
            ))}
          </div>
        )}

        {embed.image && (
          <img src={embed.image.url} alt="" className="max-w-full rounded mt-1" style={{ maxHeight: 300 }} />
        )}

        {(embed.footer || embed.timestamp) && (
          <div className="flex items-center gap-1.5 text-xs text-riftapp-text-dim">
            {embed.footer?.icon_url && (
              <img src={embed.footer.icon_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            )}
            {embed.footer?.text && <span>{embed.footer.text}</span>}
            {embed.footer?.text && embed.timestamp && <span>•</span>}
            {embed.timestamp && <span>{new Date(embed.timestamp).toLocaleString()}</span>}
          </div>
        )}
      </div>

      {embed.thumbnail && (
        <div className="p-2 shrink-0">
          <img src={embed.thumbnail.url} alt="" className="w-20 h-20 rounded object-cover" />
        </div>
      )}
    </div>
  );
}
