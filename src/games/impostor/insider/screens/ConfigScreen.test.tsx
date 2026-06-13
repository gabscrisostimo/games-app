import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigScreen } from './ConfigScreen';
import { savePlayers } from '../playerStore';

beforeEach(() => localStorage.clear());

describe('ConfigScreen', () => {
  it('desabilita "Começar" com menos de 4 jogadores', () => {
    savePlayers([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
      { id: 'c', name: 'Caio' },
    ]);
    render(<ConfigScreen onStart={() => {}} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });

  it('com 4+ jogadores, "Começar" chama onStart com uma sessão', async () => {
    const user = userEvent.setup();
    savePlayers([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
      { id: 'c', name: 'Caio' },
      { id: 'd', name: 'Duda' },
    ]);
    const onStart = vi.fn();
    render(<ConfigScreen onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: /começar/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const session = onStart.mock.calls[0][0];
    expect(session.config.players).toHaveLength(4);
    expect(['master-announce', 'master-select']).toContain(session.round.phase);
  });
});
