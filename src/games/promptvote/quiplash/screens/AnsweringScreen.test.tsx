import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnsweringScreen } from './AnsweringScreen';
import { createSession, promptsForPlayer } from '../logic';
import { getQuiplashDeck } from '../../../../data/promptvote';
import type { QuiplashConfig } from '../types';

const config: QuiplashConfig = {
  players: [
    { id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' }, { id: 'd', name: 'Duda' },
  ],
  mode: 'duel', rounds: 2, deckId: 'quiplash-padrao',
};
const deck = getQuiplashDeck('quiplash-padrao')!;
beforeEach(() => localStorage.clear());

describe('AnsweringScreen', () => {
  it('handoff esconde o prompt; revela; bloqueia submit vazio; envia textos', async () => {
    const user = userEvent.setup();
    const s = createSession(config, deck, () => 0);
    const onSubmit = vi.fn();
    render(<AnsweringScreen state={s} onSubmit={onSubmit} />);

    // handoff: mostra o nome do jogador atual (answerIndex 0 = Ana)
    expect(screen.getByText('Ana')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver meus prompts/i }));

    // submit começa desabilitado (campos vazios)
    const submit = screen.getByRole('button', { name: /esconder e passar/i });
    expect(submit).toBeDisabled();

    // preenche todos os textareas
    const boxes = screen.getAllByRole('textbox');
    expect(boxes).toHaveLength(promptsForPlayer(s.round, 'a').length);
    for (const box of boxes) await user.type(box, 'minha resposta');
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toBe('a');
    expect(onSubmit.mock.calls[0][1].every((t: string) => t.length > 0)).toBe(true);
  });
});
