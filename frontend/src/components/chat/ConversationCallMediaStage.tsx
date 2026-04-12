import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Track } from 'livekit-client';

import type { User, DMCallMode } from '../../types';
import type { VoiceParticipant } from '../../stores/voiceStore';
import type { ConversationCallStatus } from '../../utils/dmCallStatus';
import { getUserLabel } from '../../utils/conversations';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import SpeakingAvatar from '../shared/SpeakingAvatar';
import {
  CameraIcon as VoiceCameraIcon,
  MicIcon as VoiceMicIcon,
  ScreenShareIcon,
} from '../voice/VoiceIcons';

export type ConversationCallStageMember = {
  id: string;
  user?: User;
  liveParticipant?: VoiceParticipant;
  isInVoice: boolean;
  isRinging: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  isCurrentUser: boolean;
};

function useAttachedVideoTrack(track: Track | undefined, enabled = true) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!enabled || !track || track.kind !== Track.Kind.Video || !element) {
      return;
    }

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track, enabled]);

  return videoRef;
}

function gridStyleForCount(count: number): CSSProperties {
  if (count <= 0) {
    return {};
  }

  let columns = 1;
  if (count === 2) {
    columns = 2;
  } else if (count <= 4) {
    columns = 2;
  } else {
    columns = 3;
  }

  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };
}

function getAvatarColor(identity: string): string {
  let hash = 0;
  for (let index = 0; index < identity.length; index += 1) {
    hash = identity.charCodeAt(index) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 30%, 18%)`;
}

function getMemberLabel(member: ConversationCallStageMember) {
  if (member.isCurrentUser) {
    return 'You';
  }
  return member.user ? getUserLabel(member.user) : member.id;
}

function participantHasCameraVideo(member: ConversationCallStageMember) {
  return Boolean(
    member.liveParticipant?.videoTrack
    && member.liveParticipant.videoTrack.kind === Track.Kind.Video
    && member.liveParticipant.isCameraOn,
  );
}

function participantHasScreenShareMedia(member: ConversationCallStageMember) {
  return Boolean(
    member.liveParticipant?.screenTrack
    && member.liveParticipant.screenTrack.kind === Track.Kind.Video,
  );
}

function participantIsScreenSharing(member: ConversationCallStageMember) {
  return Boolean(member.liveParticipant?.isScreenSharing || participantHasScreenShareMedia(member));
}

function statusToneClasses(tone: ConversationCallStatus['tone'] | undefined) {
  switch (tone) {
    case 'warning':
      return 'border-[#f0b232]/30 bg-[#f0b232]/12 text-[#ffd27a]';
    case 'danger':
      return 'border-[#f87171]/30 bg-[#f87171]/12 text-[#fca5a5]';
    case 'success':
      return 'border-[#23a55a]/30 bg-[#23a55a]/12 text-[#77e0a2]';
    default:
      return 'border-white/10 bg-white/[0.05] text-[#d2d5db]';
  }
}

function ParticipantOverlay({
  member,
  label,
  showScreenShare,
}: {
  member: ConversationCallStageMember;
  label: string;
  showScreenShare?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
      <div className="flex min-w-0 items-center gap-2 rounded-lg bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
        {member.isSpeaking ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#23a55a]" /> : null}
        {member.isMuted ? <VoiceMicIcon muted size={13} className="shrink-0 text-[#ff7b7b]" /> : null}
        {member.isCameraOn ? <VoiceCameraIcon enabled size={13} className="shrink-0 text-[#d2d5db]" /> : null}
        {showScreenShare ? <ScreenShareIcon active size={13} className="shrink-0 text-[#d2d5db]" /> : null}
        <span className="truncate text-sm font-medium text-white">{label}</span>
      </div>
    </div>
  );
}

function ParticipantTile({ member }: { member: ConversationCallStageMember }) {
  const label = getMemberLabel(member);
  const avatarUrl = member.user?.avatar_url;
  const liveParticipant = member.liveParticipant;
  const hasCameraVideo = participantHasCameraVideo(member);
  const videoRef = useAttachedVideoTrack(liveParticipant?.videoTrack, hasCameraVideo);

  return (
    <div
      className={`relative min-h-[170px] overflow-hidden rounded-2xl border bg-black/30 transition-all duration-300 ${
        hasCameraVideo && member.isSpeaking
          ? 'border-[#23a55a]/50 shadow-[0_0_0_1px_rgba(35,165,90,0.25)]'
          : 'border-white/10'
      }`}
      style={!hasCameraVideo ? { backgroundColor: getAvatarColor(member.id) } : undefined}
    >
      {hasCameraVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6">
          <SpeakingAvatar
            label={label}
            avatarUrl={avatarUrl}
            isSpeaking={member.isSpeaking}
            sizeClassName="h-[min(28vw,112px)] w-[min(28vw,112px)] max-h-[112px] max-w-[112px]"
            fallbackTextClassName="text-3xl font-semibold text-white"
          />
        </div>
      )}
      <ParticipantOverlay member={member} label={label} showScreenShare={!hasCameraVideo && participantIsScreenSharing(member)} />
    </div>
  );
}

function AudioOnlyParticipantAvatar({ member }: { member: ConversationCallStageMember }) {
  const label = getMemberLabel(member);
  const avatarUrl = member.user?.avatar_url;

  return (
    <div
      role="listitem"
      aria-label={label}
      title={label}
      className="relative flex shrink-0 items-center justify-center"
    >
      {member.isRinging ? (
        <>
          <span className="rift-dm-call-pulse absolute inset-0 rounded-full border border-white/80" />
          <span className="rift-dm-call-pulse-delay absolute inset-[-8px] rounded-full border border-white/45" />
        </>
      ) : null}
      <SpeakingAvatar
        label={label}
        avatarUrl={avatarUrl}
        backgroundColor={getAvatarColor(member.id)}
        isSpeaking={member.isSpeaking}
        sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
        fallbackTextClassName="text-2xl font-semibold text-white"
        speakingRingClassName="ring-[3px] ring-[#3ba55d] shadow-[0_0_0_6px_rgba(59,165,93,0.18)] scale-[1.02]"
      />
      {member.isMuted ? (
        <span className="pointer-events-none absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#111214] bg-[#1a1c21] text-[#ff7b7b] shadow-[0_10px_22px_rgba(0,0,0,0.34)]">
          <VoiceMicIcon muted size={13} />
        </span>
      ) : null}
    </div>
  );
}

function AudioOnlyStage({
  participants,
}: {
  participants: ConversationCallStageMember[];
}) {
  return (
    <div className="flex min-h-[170px] w-full items-center justify-center px-3 py-2 transition-all duration-300">
      <div
        role="list"
        aria-label="Call participants"
        className="flex w-full max-w-[720px] flex-wrap items-center justify-center gap-4 sm:gap-6"
      >
        {participants.map((member) => (
          <AudioOnlyParticipantAvatar key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function ScreenShareTile({ member }: { member: ConversationCallStageMember }) {
  const label = getMemberLabel(member);
  const liveParticipant = member.liveParticipant;
  const videoRef = useAttachedVideoTrack(liveParticipant?.screenTrack, participantHasScreenShareMedia(member));

  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-black transition-all duration-300">
      <div className="absolute right-3 top-3 z-10 rounded-md bg-[#ed4245] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
        Live
      </div>
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
      <ParticipantOverlay member={member} label={`${label}'s screen`} showScreenShare />
    </div>
  );
}

function RingingAvatar({ member }: { member: ConversationCallStageMember }) {
  const label = getMemberLabel(member);
  const avatarUrl = member.user?.avatar_url;

  return (
    <div className="flex items-center justify-center text-center transition-all duration-300">
      <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
        {member.isRinging ? (
          <>
            <span className="rift-dm-call-pulse absolute inset-0 rounded-full border border-white/80" />
            <span className="rift-dm-call-pulse-delay absolute inset-[-8px] rounded-full border border-white/45" />
          </>
        ) : null}
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: getAvatarColor(member.id) }}
        >
          {avatarUrl ? (
            <img src={publicAssetUrl(avatarUrl)} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-semibold text-white">{label.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function RingingStage({
  participants,
}: {
  participants: ConversationCallStageMember[];
}) {
  return (
    <div className="flex min-h-[150px] w-full items-center justify-center px-6 py-2 transition-all duration-300">
      <div className="flex w-full max-w-[260px] flex-wrap items-center justify-center gap-6">
        {participants.map((member) => (
          <RingingAvatar key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function StageStatusBanner({ status }: { status: ConversationCallStatus }) {
  return (
    <div className={`inline-flex items-center self-start rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusToneClasses(status.tone)}`}>
      {status.label}
    </div>
  );
}

export default function ConversationCallMediaStage({
  participants,
  status,
  preferredMode = null,
  videoPreviewInitiatorId = null,
}: {
  participants: ConversationCallStageMember[];
  status?: ConversationCallStatus | null;
  preferredMode?: DMCallMode | null;
  videoPreviewInitiatorId?: string | null;
}) {
  const activeParticipants = useMemo(
    () => participants.filter((member) => member.isInVoice),
    [participants],
  );
  const pendingParticipants = useMemo(
    () => participants.filter((member) => !member.isInVoice && !member.isRinging),
    [participants],
  );
  const ringingParticipants = useMemo(
    () => participants.filter((member) => member.isRinging),
    [participants],
  );
  const audioOnlyParticipants = useMemo(
    () => participants.filter((member) => member.isInVoice || member.isRinging),
    [participants],
  );
  const screenShareParticipants = useMemo(
    () => activeParticipants.filter(
      (member) => participantHasScreenShareMedia(member),
    ),
    [activeParticipants],
  );
  const activeRemoteParticipants = useMemo(
    () => activeParticipants.filter((member) => !member.isCurrentUser),
    [activeParticipants],
  );
  const preferVideoTiles = preferredMode === 'video';
  const previewTileParticipants = useMemo(() => {
    if (!preferVideoTiles) {
      return activeParticipants;
    }

    const filtered = participants.filter(
      (member) => member.isCurrentUser || member.isInVoice || member.isRinging || member.id === videoPreviewInitiatorId,
    );

    return filtered.length > 0 ? filtered : activeParticipants;
  }, [activeParticipants, participants, preferVideoTiles, videoPreviewInitiatorId]);
  const participantsWithAnyMedia = useMemo(
    () => activeParticipants.filter((member) => participantHasCameraVideo(member) || participantIsScreenSharing(member)),
    [activeParticipants],
  );
  const showAudioOnlyStage = useMemo(
    () => !preferVideoTiles && participantsWithAnyMedia.length === 0 && audioOnlyParticipants.length > 0,
    [audioOnlyParticipants, participantsWithAnyMedia, preferVideoTiles],
  );
  const showRingingStage = ringingParticipants.length > 0 && activeRemoteParticipants.length === 0 && !preferVideoTiles;
  const showEndedBanner = Boolean(
    status
    && status.indicator === 'ended'
    && activeParticipants.length <= 1
    && !showRingingStage
    && ringingParticipants.length === 0
    && pendingParticipants.length === 0,
  );

  if (showRingingStage) {
    const ringingStageParticipants = participants.filter((member) => member.isCurrentUser || member.isRinging || member.isInVoice);
    return <RingingStage participants={ringingStageParticipants} />;
  }

  return (
    <div className="flex min-w-0 w-full flex-1 flex-col gap-3 transition-all duration-300">
      {showEndedBanner && status ? <StageStatusBanner status={status} /> : null}
      {screenShareParticipants.length > 0 ? (
        <div className="grid gap-3" style={gridStyleForCount(screenShareParticipants.length)}>
          {screenShareParticipants.map((member) => (
            <ScreenShareTile key={`${member.id}-screen`} member={member} />
          ))}
        </div>
      ) : null}

      {previewTileParticipants.length > 0 ? (
        showAudioOnlyStage ? (
          <AudioOnlyStage participants={audioOnlyParticipants} />
        ) : (
          <div className="grid gap-3" style={gridStyleForCount(previewTileParticipants.length)}>
            {previewTileParticipants.map((member) => (
              <ParticipantTile key={member.id} member={member} />
            ))}
          </div>
        )
      ) : (
        <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/25 px-4 text-sm text-[#8e9297]">
          Waiting for someone to join.
        </div>
      )}
    </div>
  );
}