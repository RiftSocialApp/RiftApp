import { publicAssetUrl } from '../../utils/publicAssetUrl';

const DEFAULT_SPEAKING_RING_CLASS = 'ring-[3px] ring-[#3ba55d] shadow-[0_0_0_4px_rgba(59,165,93,0.18)] scale-[1.02]';
const DEFAULT_SILENT_RING_CLASS = 'ring-4 ring-black/25';

export default function SpeakingAvatar({
  label,
  avatarUrl,
  backgroundColor,
  isSpeaking,
  sizeClassName,
  fallbackTextClassName,
  silentRingClassName = DEFAULT_SILENT_RING_CLASS,
  speakingRingClassName = DEFAULT_SPEAKING_RING_CLASS,
}: {
  label: string;
  avatarUrl?: string | null;
  backgroundColor?: string;
  isSpeaking: boolean;
  sizeClassName: string;
  fallbackTextClassName: string;
  silentRingClassName?: string;
  speakingRingClassName?: string;
}) {
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full transition-all duration-150 ${sizeClassName} ${
        isSpeaking ? speakingRingClassName : silentRingClassName
      }`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {avatarUrl ? (
        <img src={publicAssetUrl(avatarUrl)} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className={fallbackTextClassName}>{initials}</span>
      )}
    </div>
  );
}