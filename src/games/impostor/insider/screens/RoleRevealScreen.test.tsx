import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleRevealScreen } from './RoleRevealScreen';
import type { SessionState } from '../types';

const state: SessionState = {
  config: {
    deckId: 'insider-padrao',
    guessSeconds: 300,
    masterMode: 'rotate',
    players: [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
      { id: 'c', name: 'Caio' },
      { id: 'd', name: 'Duda' },
    ],
  },
  masterRotation: ['a'],
  round: {
    word: 'GIRAFA',
    masterId: 'a',
    insiderId: 'b',
    revealIndex: 0,
    endsAt: null,
    accusation: null,
    outcome: null,
    phase: 'role-reveal',
  },
};

describe('RoleRevealScreen', () => {
  it('mostra de quem é a vez, revela o papel do Mestre com a palavra e avança', async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    render(<RoleRevealScreen state={state} onAdvance={onAdvance} />);

    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));

    expect(screen.getByText(/MESTRE/)).toBeInTheDocument();
    expect(screen.getByText(/GIRAFA/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('mostra o papel de Insider para o jogador insider', async () => {
    const user = userEvent.setup();
    const insiderTurn: SessionState = {
      ...state,
      round: { ...state.round, revealIndex: 1 }, // Beto = insider
    };
    render(<RoleRevealScreen state={insiderTurn} onAdvance={() => {}} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    expect(screen.getByText(/INSIDER/)).toBeInTheDocument();
  });
});
