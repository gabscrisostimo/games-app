// src/games/hiddenroles/onenight/OneNightSession.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OneNightSession } from './OneNightSession';
import { createSession } from './logic';
import type { Config } from './types';

const config: Config = {
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ],
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'], // no insomniac -> no dawn
  discussSeconds: 300,
};

beforeEach(() => localStorage.clear());

describe('OneNightSession (end to end)', () => {
  it('plays night -> discussion -> vote -> result', async () => {
    const user = userEvent.setup();
    // rng=()=>0 deals players [werewolf, seer, robber]; player0 is the lone wolf.
    render(<OneNightSession initial={createSession(config, () => 0)} onHome={() => {}} />);

    // 3 night passes, every actor declines.
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
      // interactive roles (lone wolf, seer, robber) show a "Não agir" choice
      const decline = screen.queryByRole('button', { name: /não agir/i });
      if (decline) await user.click(decline);
      await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    }

    // discussion
    await user.click(screen.getByRole('button', { name: /começar discussão/i }));
    await user.click(screen.getByRole('button', { name: /votar agora/i }));

    // vote pass: each voter picks the first available ballot option (self is excluded,
    // so a fixed name like "Beto" can't be used — Beto can't vote for himself).
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /abrir voto/i }));
      // after opening the ballot only the candidate buttons remain on screen
      await user.click(screen.getAllByRole('button')[0]);
    }

    // result screen
    expect(screen.getByRole('button', { name: /jogar de novo/i })).toBeInTheDocument();
  });
});
