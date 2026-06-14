// src/games/hiddenroles/onenight/screens/NightPassScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NightPassScreen } from './NightPassScreen';
import type { RoleId, SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

function state(deal: RoleId[], passIndex: number): SessionState {
  return {
    config: { players, bag: deal, discussSeconds: 300 },
    scores: {},
    round: {
      deal, actions: [], views: [null, null, null, null], passIndex,
      finalRoles: [], endsAt: null, votes: [-1, -1, -1, -1], deaths: [], winners: null, phase: 'night',
    },
  };
}

describe('NightPassScreen', () => {
  it('shows the handoff name, then the role on reveal', async () => {
    const user = userEvent.setup();
    const deal: RoleId[] = ['werewolf', 'werewolf', 'villager', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={() => {}} />);
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    expect(screen.getByText(/Lobisomem/i)).toBeInTheDocument();
  });

  it('a werewolf with a partner sees the partner and passes with no action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['werewolf', 'villager', 'werewolf', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    expect(screen.getByText(/Caio/)).toBeInTheDocument(); // partner at index 2
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });

  it('the robber picks a target and passes a robber action; the view shows the stolen role', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['robber', 'werewolf', 'villager', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    await user.click(screen.getByRole('button', { name: /roubar de beto/i }));
    expect(screen.getByText(/Lobisomem/i)).toBeInTheDocument(); // stole werewolf
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'robber', actor: 0, target: 1 });
  });

  it('the drunk must swap with a center card', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['drunk', 'werewolf', 'villager', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    await user.click(screen.getByRole('button', { name: /carta do centro 1/i })); // center index 4 (N=4)
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'drunk', actor: 0, center: 4 });
  });

  it('the seer can decline and pass with no action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['seer', 'werewolf', 'villager', 'robber', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    await user.click(screen.getByRole('button', { name: /não agir/i }));
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });
});
