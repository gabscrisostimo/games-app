// src/games/hiddenroles/onenight/screens/ResultScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultScreen } from './ResultScreen';
import type { SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

const finished: SessionState = {
  config: { players, bag: [], discussSeconds: 300 },
  scores: { b: 1, c: 1 },
  round: {
    deal: ['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'werewolf'],
    actions: [], views: [], passIndex: 0,
    finalRoles: ['werewolf', 'seer', 'robber'],
    endsAt: null, votes: [0, 0, 1], deaths: [0],
    winners: { village: true, werewolf: false, tanner: false },
    phase: 'result',
  },
};

describe('ResultScreen', () => {
  it('announces the winning team and the dead player', () => {
    render(<ResultScreen state={finished} onPlayAgain={() => {}} onHome={() => {}} />);
    expect(screen.getByText(/Aldeia/i)).toBeInTheDocument();
    // Ana (index 0) is the dead werewolf — assert via the death line (her name also
    // appears in the role trail and standings, so target the unique "Morreu:" text).
    expect(screen.getByText(/Morreu: Ana/)).toBeInTheDocument();
  });

  it('"Jogar de novo" and "Home" fire their callbacks', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<ResultScreen state={finished} onPlayAgain={onPlayAgain} onHome={onHome} />);
    await user.click(screen.getByRole('button', { name: /jogar de novo/i }));
    await user.click(screen.getByRole('button', { name: /home/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
