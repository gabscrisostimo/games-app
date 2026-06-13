import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { InTurnScreen } from './InTurnScreen';
import { createGame, startTurn } from '../logic';
import { DECKS } from '../../../data/decks';
import type { GameState, MatchConfig } from '../types';

function makeState(turnSeconds: number): GameState {
  const config: MatchConfig = {
    deckId: DECKS[0].id,
    turnSeconds,
    skipLimit: 3,
    skipCostsPoint: false,
    endMode: 'rounds',
    endValue: 5,
    teamNames: ['Time A', 'Time B'],
  };
  const fixedRng = () => 0.42;
  const game = createGame(config, DECKS[0], fixedRng);
  return startTurn(game, Date.now(), fixedRng);
}

describe('InTurnScreen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mostra o container do card sem flash inicialmente', () => {
    const state = makeState(60);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    const container = screen.getByTestId('card-container');
    expect(container.className).toContain('bg-surface');
    expect(container.className).not.toContain('bg-good-soft');
  });

  it('pisca verde ao acertar e limpa após 300ms', () => {
    const state = makeState(60);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    act(() => {
      screen.getByText('Acertou (+1)').click();
    });
    expect(screen.getByTestId('card-container').className).toContain('bg-good-soft');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('card-container').className).toContain('bg-surface');
    expect(screen.getByTestId('card-container').className).not.toContain('bg-good-soft');
  });

  it('aplica classe de urgência quando faltam 10s ou menos', () => {
    const state = makeState(8);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    expect(screen.getByTestId('timer').className).toContain('animate-urgent');
  });

  it('não aplica urgência com tempo confortável', () => {
    const state = makeState(60);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    expect(screen.getByTestId('timer').className).not.toContain('animate-urgent');
  });
});
