import { useCallback, useEffect, useState } from 'react';
import { MenuOverlay, menuDivider } from '../context-menus/MenuOverlay';
import type { User } from '../../types';
import type { VoiceParticipant } from '../../stores/voiceStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import { useStreamStore } from '../../stores/streamStore';
import { useProfilePopoverStore } from '../../stores/profilePopoverStore';
import { useNavigate } from 'react-router-dom';

function MenuRow({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-[14px] transition-colors flex items-center justify-between gap-3 ${
        disabled
          ? 'text-[#5c5e66] cursor-not-allowed opacity-60'
          : danger
            ? 'text-[#f23f42] hover:bg-[#f23f42]/10'
            : 'text-[#dbdee1] hover:bg-[#5865f2]/30 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-[11px] text-[#949ba4] font-normal mt-0.5">{children}</span>;
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#949ba4] shrink-0">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
        checked ? 'bg-[#5865f2] border-[#5865f2]' : 'border-[#4e5058] bg-[#1e1f22]'
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

interface Props {
  participant: VoiceParticipant;
  member: User | undefined;
  x: number;
  y: number;
  showNonVideoParticipants: boolean;
  onToggleShowNonVideo: () => void;
  onClose: () => void;
  onRequestFocus: () => void;
  onRequestFullscreen: () => void;
  /** Stream tile hidden via Stop Watching — offer to show again */
  streamHiddenLocally?: boolean;
  onResumeStream?: () => void;
}

export default function VoiceParticipantContextMenu({
  participant,
  member,
  x,
  y,
  showNonVideoParticipants,
  onToggleShowNonVideo,
  onClose,
  onRequestFocus,
  onRequestFullscreen,
  streamHiddenLocally,
  onResumeStream,
}: Props) {
  const navigate = useNavigate();
  const myId = useAuthStore((s) => s.user?.id);
  const isLocal = myId != null && participant.identity === myId;

  const setParticipantVolume = useVoiceStore((s) => s.setParticipantVolume);
  const participantVolumes = useVoiceStore((s) => s.participantVolumes);
  const toggleMute = useVoiceStore((s) => s.toggleMute);
  const toggleCamera = useVoiceStore((s) => s.toggleCamera);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isCameraOn = useVoiceStore((s) => s.isCameraOn);
  const openProfile = useProfilePopoverStore((s) => s.open);
  const openDM = useDMStore((s) => s.openDM);
  const setViewingVoice = useStreamStore((s) => s.setViewingVoice);

  const [sliderVal, setSliderVal] = useState(100);

  useEffect(() => {
    setSliderVal(Math.round((participantVolumes[participant.identity] ?? 1) * 100));
  }, [participant.identity, participantVolumes]);

  const handleProfile = useCallback(() => {
    if (member) openProfile(member, new DOMRect(x, y, 0, 0));
    onClose();
  }, [member, openProfile, x, y, onClose]);

  const handleMessage = useCallback(async () => {
    if (!member?.id) return;
    onClose();
    setViewingVoice(null);
    await openDM(member.id);
    const convId = useDMStore.getState().activeConversationId;
    if (convId) navigate(`/dms/${convId}`);
  }, [member?.id, navigate, onClose, openDM, setViewingVoice]);

  const handleMention = useCallback(() => {
    const uname = member?.username;
    if (uname) {
      document.dispatchEvent(new CustomEvent('insert-mention', { detail: uname }));
    }
    onClose();
  }, [member?.username, onClose]);

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(participant.identity);
    onClose();
  }, [participant.identity, onClose]);

  const muteChecked = isLocal ? isMuted : participant.isMuted;
  const videoDisabledChecked = isLocal ? !isCameraOn : !participant.isCameraOn;

  const volumeSection = !isLocal ? (
    <div className="px-3 py-2">
      <div className="text-[12px] font-semibold text-[#dbdee1] mb-2">User Volume</div>
      <input
        type="range"
        min={0}
        max={100}
        value={sliderVal}
        onChange={(e) => {
          const n = Number(e.target.value);
          setSliderVal(n);
          setParticipantVolume(participant.identity, n / 100);
        }}
        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-[#4e5058] accent-[#5865f2]"
        style={{
          background: `linear-gradient(to right, #5865f2 0%, #5865f2 ${sliderVal}%, #4e5058 ${sliderVal}%, #4e5058 100%)`,
        }}
      />
    </div>
  ) : null;

  return (
    <MenuOverlay x={x} y={y} onClose={onClose}>
      <div
        className="min-w-[220px] max-w-[280px] max-h-[min(85vh,560px)] overflow-y-auto rounded-md bg-[#111214] py-1 shadow-modal border border-black/40"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="px-1">
          <MenuRow onClick={handleProfile} disabled={!member}>
            <span>Profile</span>
          </MenuRow>
          {streamHiddenLocally && participant.isScreenSharing && participant.screenTrack && (
            <MenuRow
              onClick={() => {
                onResumeStream?.();
                onClose();
              }}
            >
              <span>Resume watching stream</span>
            </MenuRow>
          )}
          <MenuRow onClick={() => { void handleMessage(); }} disabled={!member?.id || isLocal}>
            <span>Message</span>
          </MenuRow>
          <MenuRow onClick={() => { onRequestFocus(); onClose(); }}>
            <span>Focus tile</span>
          </MenuRow>
          <MenuRow onClick={() => { onRequestFullscreen(); onClose(); }}>
            <span>Fullscreen</span>
          </MenuRow>
        </div>

        {menuDivider()}

        <div className="px-1">
          <MenuRow disabled>
            <div>
              Add Note
              <SubLabel>Only visible to you</SubLabel>
            </div>
          </MenuRow>
          <MenuRow disabled>
            <span>Add Friend Nickname</span>
          </MenuRow>
        </div>

        {menuDivider()}

        {volumeSection}

        {volumeSection ? menuDivider() : null}

        <div className="px-1">
          <MenuRow
            onClick={() => {
              if (isLocal) void toggleMute();
            }}
            disabled={!isLocal}
          >
            <span>Mute</span>
            <CheckboxMark checked={muteChecked} />
          </MenuRow>
          <MenuRow disabled>
            <span>Mute Soundboard</span>
            <CheckboxMark checked={false} />
          </MenuRow>
          <MenuRow
            onClick={() => {
              if (isLocal) void toggleCamera();
            }}
            disabled={!isLocal}
          >
            <span>Disable Video</span>
            <CheckboxMark checked={videoDisabledChecked} />
          </MenuRow>
          <MenuRow disabled>
            <span>View Verification Code</span>
          </MenuRow>
          <MenuRow disabled>
            <span>Apps</span>
            <ChevronRight />
          </MenuRow>
          <MenuRow disabled>
            <span>Invite to Server</span>
            <ChevronRight />
          </MenuRow>
          <MenuRow disabled danger>
            <span>Remove Friend</span>
          </MenuRow>
          <MenuRow disabled>
            <span>Ignore</span>
          </MenuRow>
          <MenuRow disabled danger>
            <span>Block</span>
          </MenuRow>
        </div>

        {menuDivider()}

        <div className="px-1">
          <MenuRow disabled>
            <span>Roles</span>
            <ChevronRight />
          </MenuRow>
          <MenuRow disabled>
            <span>Move to</span>
            <ChevronRight />
          </MenuRow>
        </div>

        {menuDivider()}

        <div className="px-1">
          <MenuRow disabled>
            <span>Pop Out User</span>
          </MenuRow>
          <MenuRow
            onClick={() => {
              onToggleShowNonVideo();
            }}
          >
            <span>Show Non-Video Participants</span>
            <CheckboxMark checked={showNonVideoParticipants} />
          </MenuRow>
        </div>

        {menuDivider()}

        <div className="px-1">
          <MenuRow disabled>
            <span>Open in Mod View</span>
          </MenuRow>
          <MenuRow disabled danger>
            <span>Server Mute</span>
            <CheckboxMark checked={false} />
          </MenuRow>
          <MenuRow disabled danger>
            <span>Server Deafen</span>
            <CheckboxMark checked={false} />
          </MenuRow>
          <MenuRow disabled danger>
            <span>Disconnect</span>
          </MenuRow>
        </div>

        {menuDivider()}

        <div className="px-1">
          <MenuRow onClick={handleMention} disabled={!member?.username}>
            <span>Mention</span>
          </MenuRow>
          <MenuRow onClick={handleCopyId}>
            <span>Copy User ID</span>
          </MenuRow>
        </div>
      </div>
    </MenuOverlay>
  );
}
