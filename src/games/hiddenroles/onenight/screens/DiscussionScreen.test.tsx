// src/games/hiddenroles/onenight/screens/DiscussionScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscussionScreen } from './DiscussionScreen';
import type { SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

function discState(endsAt: number | null): SessionState {
  return {
    config: { players, bag: [], discussSeconds: 300 },
    scores: {},
    round: {
      deal: [], actions: [], views: [], passIndex: 0, finalRoles: ['villager', 'seer', 'werewolf'],
      endsAt, votes: [-1, -1, -1], deaths: [], winners: null, phase: 'discussion',
    },
  };
}

describe('DiscussionScreen', () => {
  it('shows a start button before the timer is armed', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<DiscussionScreen state={discState(null)} onStart={onStart} onVote={() => {}} />);
    await user.click(screen.getByRole('button', { name: /começar discussão/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('once armed, "Votar agora" begins the vote', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<DiscussionScreen state={discState(Date.now() + 300_000)} onStart={() => {}} onVote={onVote} />);
    await user.click(screen.getByRole('button', { name: /votar agora/i }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });
});
