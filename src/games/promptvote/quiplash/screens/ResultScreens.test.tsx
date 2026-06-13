import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoundResultScreen } from './RoundResultScreen';
import { FinalResultScreen } from './FinalResultScreen';
import type { SessionState } from '../types';

const base: SessionState = {
  config: {
    players: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }],
    mode: 'duel', rounds: 2, deckId: 'd',
  },
  scores: { a: 1500, b: 0 },
  usedPromptIds: [],
  round: {
    index: 0, multiplier: 1, isLastLash: false, answerIndex: 2,
    ballots: [], voteCursor: 0, phase: 'round-result',
    matchups: [{
      promptId: 'p', promptText: 'A pior coisa pra dizer num encontro',
      answers: [{ authorId: 'a', text: 'Resposta da Ana' }, { authorId: 'b', text: 'Resposta do Beto' }],
      voterIds: ['c', 'd'], votes: { c: 'a', d: 'a' },
    }],
  },
};

describe('RoundResultScreen', () => {
  it('gate neutro esconde autores; revela; mostra Quiplash!; botão "Próxima rodada"', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<RoundResultScreen state={base} onNext={onNext} />);

    // antes de revelar, os autores não aparecem
    expect(screen.queryByText(/Resposta da Ana/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /revelar/i }));

    expect(screen.getByText(/Resposta da Ana/)).toBeInTheDocument();
    expect(screen.getByText(/quiplash!/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /próxima rodada/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('na última rodada o botão é "Ver resultado final"', async () => {
    const user = userEvent.setup();
    const last = { ...base, round: { ...base.round, index: 1 } }; // rounds=2 → última
    render(<RoundResultScreen state={last} onNext={() => {}} />);
    await user.click(screen.getByRole('button', { name: /revelar/i }));
    expect(screen.getByRole('button', { name: /resultado final/i })).toBeInTheDocument();
  });
});

describe('FinalResultScreen', () => {
  it('mostra o ranking e os botões de jogar de novo / início', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<FinalResultScreen state={base} onPlayAgain={onPlayAgain} onHome={onHome} />);
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /jogar de novo/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /início/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
