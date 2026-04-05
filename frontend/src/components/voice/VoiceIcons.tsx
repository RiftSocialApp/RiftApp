import type { SVGProps } from 'react';

type VoiceIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function baseProps({ size = 20, ...props }: VoiceIconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export function VoiceChannelIcon(props: VoiceIconProps) {
  return (
    <svg {...baseProps(props)}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export function MicIcon({ muted = false, ...props }: VoiceIconProps & { muted?: boolean }) {
  if (muted) {
    return (
      <svg {...baseProps(props)}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12m14 0a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  }

  return (
    <svg {...baseProps(props)}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function HeadphonesIcon({ deafened = false, ...props }: VoiceIconProps & { deafened?: boolean }) {
  if (deafened) {
    return (
      <svg {...baseProps(props)}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9a3 3 0 0 1 5-2.24" />
        <path d="M21 12a9 9 0 0 0-7.48-8.86" />
        <path d="M3 12a9 9 0 0 0 8 8.94V18a3 3 0 0 1-3-3v-1" />
      </svg>
    );
  }

  return (
    <svg {...baseProps(props)}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

export function CameraIcon({ enabled = false, ...props }: VoiceIconProps & { enabled?: boolean }) {
  if (enabled) {
    return (
      <svg {...baseProps(props)}>
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    );
  }

  return (
    <svg {...baseProps(props)}>
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34" />
      <path d="M23 7l-7 5 7 5V7z" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function ScreenShareIcon({ active = false, ...props }: VoiceIconProps & { active?: boolean }) {
  return (
    <svg {...baseProps(props)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      {active && <path d="M9 10l3-3 3 3M12 7v6" />}
    </svg>
  );
}

export function ActivitiesIcon(props: VoiceIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export function SoundboardIcon(props: VoiceIconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function SettingsIcon(props: VoiceIconProps) {
  return (
    <svg {...baseProps(props)} strokeWidth={1.75}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function DisconnectIcon(props: VoiceIconProps) {
  return (
    <svg {...baseProps({ ...props, fill: 'currentColor', stroke: 'none' })}>
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1 0-1.36C3.42 8.63 7.51 7 12 7s8.58 1.63 11.71 4.72c.18.18.29.44.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85a.997.997 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}

export function MoreIcon(props: VoiceIconProps) {
  return (
    <svg {...baseProps({ ...props, fill: 'currentColor', stroke: 'none' })}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function NoiseSuppressionIcon({ active = false, ...props }: VoiceIconProps & { active?: boolean }) {
  return (
    <svg {...baseProps({ ...props, fill: 'none', stroke: 'none' })}>
      <rect x="4" y="10" width="2.5" height="8" rx="1" fill="currentColor" />
      <rect x="8" y="6" width="2.5" height="16" rx="1" fill="currentColor" />
      <rect x="12" y="3" width="2.5" height="22" rx="1" fill="currentColor" opacity={active ? 1 : 0.45} />
      <rect x="16" y="7" width="2.5" height="14" rx="1" fill="currentColor" />
      <rect x="20" y="11" width="2.5" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export const activityIcons = {
  game: ActivitiesIcon,
  screen: ScreenShareIcon,
  soundboard: SoundboardIcon,
} as const;