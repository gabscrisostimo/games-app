// src/games/impostor/insider/InsiderSession.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsiderSession } from './InsiderSession';
import { createSession } from './logic';
import type { InsiderConfig } from './types';

const config: InsiderConfig = {
  deckId: 'insider-padrao',
  guessSeconds: 300,
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
    { id: 'd', name: 'Duda' },
  ],
  masterMode: 'rotate',
};

beforeEach(() => localStorage.clear());

describe('InsiderSession', () => {
  it('percorre announce → reveal de todos → guessing', async () => {
    const user = userEvent.setup();
    render(<InsiderSession initial={createSession(config)} onHome={() => {}} />);

    // master-announce
    await user.click(screen.getByRole('button', { name: /revelar papéis/i }));

    // role-reveal × 4 jogadores
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
      await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    }

    // guessing (antes de iniciar a contagem)
    expect(screen.getByRole('button', { name: /começar contagem/i })).toBeInTheDocument();
  });
});
