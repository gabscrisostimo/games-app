import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsiderHuntScreen } from './InsiderHuntScreen';
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
    revealIndex: 4,
    endsAt: 1,
    accusation: null,
    outcome: null,
    phase: 'insider-hunt',
  },
};

describe('InsiderHuntScreen', () => {
  it('acusar um jogador chama onAccuse com kind player', async () => {
    const user = userEvent.setup();
    const onAccuse = vi.fn();
    render(<InsiderHuntScreen state={state} onAccuse={onAccuse} />);
    await user.click(screen.getByRole('button', { name: 'Caio' }));
    expect(onAccuse).toHaveBeenCalledWith({ kind: 'player', id: 'c' });
  });

  it('"Ninguém" chama onAccuse com kind nobody', async () => {
    const user = userEvent.setup();
    const onAccuse = vi.fn();
    render(<InsiderHuntScreen state={state} onAccuse={onAccuse} />);
    await user.click(screen.getByRole('button', { name: /ninguém/i }));
    expect(onAccuse).toHaveBeenCalledWith({ kind: 'nobody' });
  });
});
