import { render, screen } from '@testing-library/react';
import { Track } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';

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

  it('renders audio-only participants in an inline participant strip', () => {
    render(
      <ConversationCallMediaStage
        participants={[
          createParticipant(),
          createParticipant({ id: 'user-2', isCurrentUser: false }),
        ]}
        status={null}
      />,
    );

    const participantList = screen.getByRole('list', { name: 'Call participants' });
    expect(participantList).toHaveClass('flex-wrap');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps ringing participants in the inline stage without rendering ringing copy', () => {
    render(
      <ConversationCallMediaStage
        participants={[
          createParticipant({ id: 'caller', isCurrentUser: false }),
          createParticipant({ id: 'target', isCurrentUser: true, isInVoice: false, isRinging: true }),
        ]}
        status={{
          label: 'You declined • 1 still ringing',
          tone: 'muted',
          indicator: 'ended',
        }}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/still ringing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^ringing$/i)).not.toBeInTheDocument();
  });

  it('renders a screen-share tile when a participant has a screen track even if the share flag lags', () => {
    const mockScreenTrack = {
      kind: Track.Kind.Video,
      attach: vi.fn(),
      detach: vi.fn(() => []),
    } as unknown as Track;

    render(
      <ConversationCallMediaStage
        participants={[
          createParticipant({
            liveParticipant: {
              identity: 'user-1',
              isSpeaking: false,
              isMuted: false,
              isCameraOn: false,
              isScreenSharing: false,
              screenTrack: mockScreenTrack,
            },
          }),
        ]}
        status={null}
      />,
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('keeps incoming video-call previews in the tile layout before the room has media tracks', () => {
    render(
      <ConversationCallMediaStage
        participants={[
          createParticipant({ id: 'caller', isCurrentUser: false, isInVoice: false }),
          createParticipant({ id: 'target', isCurrentUser: true, isInVoice: false, isRinging: true }),
        ]}
        status={{
          label: 'Incoming Video Call',
          tone: 'warning',
          indicator: 'ringing',
        }}
        preferredMode="video"
        videoPreviewInitiatorId="caller"
      />,
    );

    expect(screen.queryByRole('list', { name: 'Call participants' })).not.toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('caller')).toBeInTheDocument();
  });
});
