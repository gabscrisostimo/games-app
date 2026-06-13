// src/games/judging/snakeoil/screens/SelectingScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectingScreen } from './SelectingScreen';
import { createGame, startRound } from '../logic';
import type { MatchConfig, PersonaDeck, WordDeck } from '../types';

const config: MatchConfig = {
  playerNames: ['Ana', 'Beto', 'Caio'],
  handSize: 4,
  cardsPerPitch: 2,
  pitchSeconds: null,
  endMode: 'rotations',
  endValue: 1,
};
const wordDeck: WordDeck = {
  id: 'wd',
  name: 'wd',
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, word: `palavra${i}` })),
};
const personaDeck: PersonaDeck = { id: 'pd', name: 'pd', cards: [{ id: 'p0', persona: 'x' }] };

function selectingState() {
  return startRound(createGame(config, wordDeck, personaDeck, () => 0));
}

describe('SelectingScreen', () => {
  it('mostra o portão antes de revelar a mão', () => {
    render(<SelectingScreen state={selectingState()} onConfirm={() => {}} wordDeck={wordDeck} />);
    expect(screen.getByText(/passe o celular/i)).toBeInTheDocument();
  });

  it('confirmar fica desabilitado até escolher cardsPerPitch', () => {
    render(<SelectingScreen state={selectingState()} onConfirm={() => {}} wordDeck={wordDeck} />);
    fireEvent.click(screen.getByRole('button', { name: /estou com o celular/i }));
    const confirm = screen.getByRole('button', { name: /confirmar/i });
    expect(confirm).toBeDisabled();
  });

  it('chama onConfirm com as cartas escolhidas', () => {
    const onConfirm = vi.fn();
    const state = selectingState();
    render(<SelectingScreen state={state} onConfirm={onConfirm} wordDeck={wordDeck} />);
    fireEvent.click(screen.getByRole('button', { name: /estou com o celular/i }));
    const pitcher = state.round!.order[0];
    const hand = state.players[pitcher].hand;
    fireEvent.click(screen.getByText('palavra' + hand[0].slice(1)));
    fireEvent.click(screen.getByText('palavra' + hand[1].slice(1)));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toHaveLength(2);
  });
});
