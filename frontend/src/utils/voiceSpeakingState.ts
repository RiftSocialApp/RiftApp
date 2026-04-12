interface ResolveVoiceParticipantSpeakingStateInput {
  transientSpeaking: boolean;
  hasExplicitSpeakingSignal: boolean;
  explicitSpeakingSignal: boolean;
  liveKitSpeaking: boolean;
  isLocalParticipant: boolean;
}

export function resolveVoiceParticipantSpeakingState({
  transientSpeaking,
  hasExplicitSpeakingSignal,
  explicitSpeakingSignal,
  liveKitSpeaking,
  isLocalParticipant,
}: ResolveVoiceParticipantSpeakingStateInput) {
  if (transientSpeaking) {
    return true;
  }

  if (isLocalParticipant) {
    return liveKitSpeaking || explicitSpeakingSignal === true;
  }

  if (!hasExplicitSpeakingSignal) {
    return liveKitSpeaking;
  }

  if (explicitSpeakingSignal) {
    return true;
  }

  return liveKitSpeaking;
}