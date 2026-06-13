import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuessingScreen } from './GuessingScreen';
import type { SessionState } from '../types';

const base: SessionState = {
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
    endsAt: null,
    accusation: null,
    outcome: null,
    phase: 'guessing',
  },
};

describe('GuessingScreen', () => {
  it('antes de iniciar, "Começar contagem" chama onStart', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <GuessingScreen state={base} onStart={onStart} onGuessed={() => {}} onExpire={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: /começar contagem/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('rodando, "Adivinharam!" chama onGuessed', async () => {
    const user = userEvent.setup();
    const onGuessed = vi.fn();
    const running: SessionState = {
      ...base,
      round: { ...base.round, endsAt: Date.now() + 300000 },
    };
    render(
      <GuessingScreen state={running} onStart={() => {}} onGuessed={onGuessed} onExpire={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: /adivinharam/i }));
    expect(onGuessed).toHaveBeenCalledTimes(1);
  });
});
