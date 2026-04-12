import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ConversationCallMediaStage, { type ConversationCallStageMember } from './ConversationCallMediaStage';

function createParticipant(overrides: Partial<ConversationCallStageMember> = {}): ConversationCallStageMember {
  return {
    id: 'user-1',
    isInVoice: true,
    isRinging: false,
    isMuted: false,
    isCameraOn: false,
    isSpeaking: false,
    isCurrentUser: true,
    ...overrides,
  };
}

describe('ConversationCallMediaStage', () => {
  it('applies a green avatar ring for audio-only participants who are speaking', () => {
    render(
      <ConversationCallMediaStage
        participants={[createParticipant({ isSpeaking: true })]}
        status={null}
      />,
    );

    const avatar = screen.getByText('YO');
    expect(avatar.parentElement).toHaveClass('ring-[3px]');
    expect(avatar.parentElement).toHaveClass('ring-[#3ba55d]');
  });

  it('does not apply the green avatar ring when the participant is not speaking', () => {
    render(
      <ConversationCallMediaStage
        participants={[createParticipant({ isSpeaking: false })]}
        status={null}
      />,
    );

    const avatar = screen.getByText('YO');
    expect(avatar.parentElement).toHaveClass('ring-4');
    expect(avatar.parentElement).not.toHaveClass('ring-[3px]');
  });
});
