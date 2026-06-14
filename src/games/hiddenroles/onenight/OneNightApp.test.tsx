// src/games/hiddenroles/onenight/OneNightApp.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OneNightApp } from './OneNightApp';
import { savePlayers } from './playerStore';

beforeEach(() => localStorage.clear());

describe('OneNightApp', () => {
  it('renders the config screen with the One Night title', () => {
    render(<OneNightApp onHome={() => {}} />);
    expect(screen.getByRole('heading', { name: /one night/i })).toBeInTheDocument();
  });

  it('starting a game from config leaves the config screen (enters the night)', async () => {
    const user = userEvent.setup();
    savePlayers([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
      { id: 'c', name: 'Caio' },
    ]);
    render(<OneNightApp onHome={() => {}} />);
    await user.click(screen.getByRole('button', { name: /começar/i }));
    // night handoff shows the first player's name and the reveal button
    expect(screen.getByRole('button', { name: /ver seu papel/i })).toBeInTheDocument();
  });
});
