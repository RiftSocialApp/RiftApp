export type ActiveSpeakerTrackType = 'camera' | 'screenshare';

interface ActiveSpeakerCandidate<TTrack = unknown> {
  identity: string;
  isSpeaking: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  videoTrack?: TTrack | null;
  screenTrack?: TTrack | null;
}

interface ActiveSpeakerSelection<TTrack = unknown> {
  userId: string;
  trackType: ActiveSpeakerTrackType | null;
  track: TTrack | null;
  priority: number;
}

interface CurrentActiveSpeakerTarget {
  userId: string;
  trackType: ActiveSpeakerTrackType | null;
}

export function getActiveSpeakerTrackPriority(trackType: ActiveSpeakerTrackType | null) {
  if (trackType === 'screenshare') return 3;
  if (trackType === 'camera') return 2;
  return 1;
}

export function getActiveSpeakerMediaSelection<TTrack>(
  participant: ActiveSpeakerCandidate<TTrack>,
): ActiveSpeakerSelection<TTrack> {
  const hasScreenshare = participant.isScreenSharing !== false && participant.screenTrack != null;
  if (hasScreenshare) {
    return {
      userId: participant.identity,
      trackType: 'screenshare',
      track: participant.screenTrack ?? null,
      priority: 3,
    };
  }

  const hasCamera = participant.isCameraOn !== false && participant.videoTrack != null;
  if (hasCamera) {
    return {
      userId: participant.identity,
      trackType: 'camera',
      track: participant.videoTrack ?? null,
      priority: 2,
    };
  }

  return {
    userId: participant.identity,
    trackType: null,
    track: null,
    priority: 1,
  };
}

export function activeSpeakerTargetKey(
  selection: Pick<CurrentActiveSpeakerTarget, 'userId' | 'trackType'> | null,
) {
  if (!selection) {
    return null;
  }

  return `${selection.userId}:${selection.trackType ?? 'avatar'}`;
}

export function selectPreferredActiveSpeaker<TTrack>(
  participants: ActiveSpeakerCandidate<TTrack>[],
  current: CurrentActiveSpeakerTarget | null,
): ActiveSpeakerSelection<TTrack> | null {
  const speakingParticipants = participants.filter((participant) => participant.isSpeaking);

  const mediaParticipants = participants.filter((participant) => {
    const sel = getActiveSpeakerMediaSelection(participant);
    return sel.trackType !== null && sel.track != null;
  });

  const pool = speakingParticipants.length > 0 ? speakingParticipants : mediaParticipants;
  if (pool.length === 0) {
    return null;
  }

  const selections = pool
    .map((participant) => ({
      participant,
      selection: getActiveSpeakerMediaSelection(participant),
    }))
    .filter(({ selection }) => selection.trackType !== null && selection.track != null);

  if (selections.length === 0) {
    return null;
  }

  const best = selections.reduce((winner, entry) => (
    entry.selection.priority > winner.selection.priority ? entry : winner
  )).selection;

  if (!current) {
    return best;
  }

  const currentInPool = pool.find((participant) => participant.identity === current.userId);
  if (!currentInPool) {
    return best;
  }

  const currentSelection = getActiveSpeakerMediaSelection(currentInPool);
  if (currentSelection.trackType === null || currentSelection.track == null) {
    return best;
  }

  if (currentSelection.priority >= best.priority) {
    return currentSelection;
  }

  return best;
}