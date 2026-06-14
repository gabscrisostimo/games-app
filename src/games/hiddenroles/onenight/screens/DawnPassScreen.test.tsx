// src/games/hiddenroles/onenight/screens/DawnPassScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DawnPassScreen } from './DawnPassScreen';
import type { RoleId, SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

function dawnState(deal: RoleId[], finalRoles: RoleId[], passIndex: number): SessionState {
  return {
    config: { players, bag: deal, discussSeconds: 300 },
    scores: {},
    round: {
      deal, actions: [], views: [null, null, null], passIndex,
      finalRoles, endsAt: null, votes: [-1, -1, -1], deaths: [], winners: null, phase: 'dawn',
    },
  };
}

describe('DawnPassScreen', () => {
  it('the insomniac sees their final role', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['insomniac', 'werewolf', 'seer', 'robber', 'villager', 'troublemaker'];
    const finalRoles: RoleId[] = ['robber', 'werewolf', 'seer']; // insomniac became robber
    render(<DawnPassScreen state={dawnState(deal, finalRoles, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /acordar/i }));
    expect(screen.getByText(/Ladrão/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('a non-insomniac just sleeps', async () => {
    const user = userEvent.setup();
    const deal: RoleId[] = ['insomniac', 'werewolf', 'seer', 'robber', 'villager', 'troublemaker'];
    const finalRoles: RoleId[] = ['insomniac', 'werewolf', 'seer'];
    render(<DawnPassScreen state={dawnState(deal, finalRoles, 1)} onSubmit={() => {}} />);
    await user.click(screen.getByRole('button', { name: /acordar/i }));
    expect(screen.getByText(/dorme/i)).toBeInTheDocument();
  });
});
