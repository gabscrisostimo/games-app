import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuiplashSession } from './QuiplashSession';
import { createSession } from './logic';
import { getQuiplashDeck } from '../../../data/promptvote';
import type { QuiplashConfig } from './types';

const config: QuiplashConfig = {
  players: [
    { id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }, { id: 'c', name: 'Caio' },
  ],
  mode: 'group', rounds: 2, deckId: 'quiplash-padrao',
};
const deck = getQuiplashDeck('quiplash-padrao')!;
beforeEach(() => localStorage.clear());

describe('QuiplashSession (fluxo grupo, 3 jogadores)', () => {
  it('answering de todos → voting de todos → round-result', async () => {
    const user = userEvent.setup();
    render(<QuiplashSession initial={createSession(config, deck, () => 0)} onHome={() => {}} />);

    // answering: 3 jogadores, 1 prompt cada
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /ver meus prompts/i }));
      await user.type(screen.getByRole('textbox'), `resposta ${i}`);
      await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    }

    // voting: 3 votantes, 1 cédula cada (grupo) → clica em ver e vota na 1ª opção
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /toque para votar/i }));
      const options = screen.getAllByText(/^resposta \d$/);
      await user.click(options[0]);
    }

    // round-result (gate neutro)
    expect(screen.getByRole('button', { name: /revelar/i })).toBeInTheDocument();
  });
});
