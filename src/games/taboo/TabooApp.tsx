// src/games/taboo/TabooApp.tsx
import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { TabooSession } from './TabooSession';
import { loadGame, clearGame } from './persistence';
import type { GameState } from './types';

export function TabooApp({ onHome }: { onHome: () => void }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [resumable, setResumable] = useState<GameState | null>(() => loadGame());

  if (game) {
    return (
      <TabooSession
        key={game.turnsTaken === 0 && game.phase === 'pre-turn' ? 'new' : 'run'}
        initial={game}
        onPlayAgain={() => setGame(null)}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {resumable && resumable.phase !== 'game-over' && (
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 px-4">
          <button
            className="rounded-2xl bg-accent py-4 text-lg font-bold text-bg transition active:brightness-90"
            onClick={() => setGame(resumable)}
          >
            Continuar partida
          </button>
          <button
            className="text-sm text-muted underline"
            onClick={() => {
              clearGame();
              setResumable(null);
            }}
          >
            Descartar e começar nova
          </button>
        </div>
      )}
      <ConfigScreen onStart={(g) => setGame(g)} />
    </div>
  );
}
