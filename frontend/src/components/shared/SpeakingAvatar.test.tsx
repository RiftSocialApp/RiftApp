import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SpeakingAvatar from './SpeakingAvatar';

describe('SpeakingAvatar', () => {
  it('applies the green speaking ring when speaking', () => {
    render(
      <SpeakingAvatar
        label="You"
        isSpeaking
        sizeClassName="w-16 h-16"
        fallbackTextClassName="text-sm text-white"
      />,
    );

    const avatar = screen.getByText('YO').parentElement;
    expect(avatar).toHaveClass('ring-[3px]');
    expect(avatar).toHaveClass('ring-[#3ba55d]');
  });

  it('uses the silent ring when not speaking', () => {
    render(
      <SpeakingAvatar
        label="You"
        isSpeaking={false}
        sizeClassName="w-16 h-16"
        fallbackTextClassName="text-sm text-white"
      />,
    );

    const avatar = screen.getByText('YO').parentElement;
    expect(avatar).toHaveClass('ring-4');
    expect(avatar).not.toHaveClass('ring-[3px]');
  });
});