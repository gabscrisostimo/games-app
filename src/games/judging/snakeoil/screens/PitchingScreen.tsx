// src/games/judging/snakeoil/screens/PitchingScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { useCountdown } from '../../../../shell/useCountdown';
import { getWordDeck, WORD_DECKS } from '../../../../data/judging';
import type { GameState } from '../types';

const NOOP = () => {};

function PitchTimer({ seconds }: { seconds: number }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const remaining = useCountdown(endsAt, NOOP);
  if (endsAt === null) {
    return (
      <button
        className="rounded-lg bg-slate-700 px-3 py-1 text-sm text-white"
        onClick={() => setEndsAt(Date.now() + seconds * 1000)}
      >
        Iniciar timer ({seconds}s)
      </button>
    );
  }
  return <span className="text-2xl font-bold tabular-nums text-amber-400">{remaining}s</span>;
}

export function PitchingScreen({ state, onVote }: { state: GameState; onVote: () => void }) {
  const round = state.round!;
  const deck = getWordDeck(WORD_DECKS[0].id)!;
  const wordOf = (id: string) => deck.cards.find((c) => c.id === id)?.word ?? id;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <h2 className="text-xl font-bold text-white">Apresentem seus produtos!</h2>
      <p className="text-slate-300">Cada um faz seu pitch para o cliente. Depois, votação.</p>

      <div className="flex flex-1 flex-col gap-3">
        {round.order.map((pi) => (
          <div key={pi} className="rounded-2xl bg-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">{state.players[pi].name}</span>
              {state.config.pitchSeconds !== null && (
                <PitchTimer seconds={state.config.pitchSeconds} />
              )}
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-400">
              {(round.picks[pi] ?? []).map(wordOf).join(' + ')}
            </p>
          </div>
        ))}
      </div>

      <ActionButton variant="positive" onClick={onVote}>
        Ir para votação
      </ActionButton>
    </div>
  );
}
