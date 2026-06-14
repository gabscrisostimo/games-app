// src/games/hiddenroles/onenight/screens/ConfigScreen.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigScreen } from './ConfigScreen';
import { savePlayers } from '../playerStore';

beforeEach(() => localStorage.clear());

const fourPlayers = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

describe('ConfigScreen', () => {
  it('disables "Começar" with fewer than 3 players', () => {
    savePlayers([{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }]);
    render(<ConfigScreen onStart={() => {}} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });

  it('with a valid recommended bag, "Começar" calls onStart with a night session', async () => {
    const user = userEvent.setup();
    savePlayers(fourPlayers);
    const onStart = vi.fn();
    render(<ConfigScreen onStart={onStart} />);
    // recommendedBag(4) has length 7 = 4 + 3 -> counter satisfied, start enabled
    const begin = screen.getByRole('button', { name: /começar/i });
    expect(begin).toBeEnabled();
    await user.click(begin);
    expect(onStart).toHaveBeenCalledTimes(1);
    const session = onStart.mock.calls[0][0];
    expect(session.config.players).toHaveLength(4);
    expect(session.config.bag).toHaveLength(7);
    expect(session.round.phase).toBe('night');
  });

  it('adding a card past the needed count disables "Começar"', async () => {
    const user = userEvent.setup();
    savePlayers(fourPlayers);
    render(<ConfigScreen onStart={() => {}} />);
    // bump villager up by one -> bag length 8 != 7 needed
    await user.click(screen.getByRole('button', { name: /adicionar aldeão/i }));
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });
});
