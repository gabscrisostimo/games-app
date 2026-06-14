// src/games/hiddenroles/onenight/screens/VotePassScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VotePassScreen } from './VotePassScreen';
import type { SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

function voteState(passIndex: number): SessionState {
  return {
    config: { players, bag: [], discussSeconds: 300 },
    scores: {},
    round: {
      deal: [], actions: [], views: [], passIndex, finalRoles: ['villager', 'seer', 'werewolf'],
      endsAt: null, votes: [-1, -1, -1], deaths: [], winners: null, phase: 'vote',
    },
  };
}

describe('VotePassScreen', () => {
  it('cannot vote for yourself and records a vote for another player', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<VotePassScreen state={voteState(0)} onVote={onVote} />); // voter = Ana (index 0)
    await user.click(screen.getByRole('button', { name: /abrir voto/i }));
    expect(screen.queryByRole('button', { name: 'Ana' })).toBeNull(); // self not selectable
    await user.click(screen.getByRole('button', { name: 'Caio' }));
    expect(onVote).toHaveBeenCalledWith(2);
  });
});
