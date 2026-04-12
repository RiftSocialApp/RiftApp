declare global {
  interface Window {
    __RIFT_DEBUG_SPEAKING__?: boolean;
  }
}

export function isVoiceSpeakingDebugEnabled() {
  if (typeof window === 'undefined') {
    return import.meta.env.DEV;
  }

  return import.meta.env.DEV || window.__RIFT_DEBUG_SPEAKING__ === true;
}

export function debugVoiceSpeaking(message: string, details?: Record<string, unknown>) {
  if (!isVoiceSpeakingDebugEnabled()) {
    return;
  }

  if (details) {
    console.debug(`[voice-speaking] ${message}`, details);
    return;
  }

  console.debug(`[voice-speaking] ${message}`);
}