import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigScreen } from './ConfigScreen';
import { savePlayers } from '../playerStore';

beforeEach(() => localStorage.clear());

const three = [
  { id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }, { id: 'c', name: 'Caio' },
];

describe('ConfigScreen', () => {
  it('desabilita "Começar" com menos de 3 jogadores', () => {
    savePlayers(three.slice(0, 2));
    render(<ConfigScreen onStart={() => {}} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });

  it('com 3+ jogadores, "Começar" chama onStart com uma sessão em answering', async () => {
    const user = userEvent.setup();
    savePlayers(three);
    const onStart = vi.fn();
    render(<ConfigScreen onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: /começar/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const session = onStart.mock.calls[0][0];
    expect(session.config.players).toHaveLength(3);
    expect(session.round.phase).toBe('answering');
  });
});
