// src/games/judging/snakeoil/SnakeOilApp.tsx
import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { SnakeOilSession } from './SnakeOilSession';
import { loadGame, clearGame } from './persistence';
import type { GameState } from './types';

export function SnakeOilApp({ onHome }: { onHome: () => void }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [resumable, setResumable] = useState<GameState | null>(() => loadGame());

  if (game) {
    return (
      <SnakeOilSession
        key={game.roundsPlayed === 0 && game.phase === 'pre-round' ? 'new' : 'run'}
        initial={game}
        onPlayAgain={() => setGame(null)}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {resumable && resumable.phase !== 'game-over' && (
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 px-4">
          <button
            className="rounded-2xl bg-amber-500 py-4 text-lg font-bold text-slate-900"
            onClick={() => setGame(resumable)}
          >
            Continuar partida
          </button>
          <button
            className="text-sm text-slate-400 underline"
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
