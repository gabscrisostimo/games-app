// src/games/judging/snakeoil/screens/JudgingScreen.tsx
import { getWordDeck, WORD_DECKS } from '../../../../data/judging';
import type { GameState } from '../types';

export function JudgingScreen({
  state,
  onPick,
}: {
  state: GameState;
  onPick: (winnerIndex: number) => void;
}) {
  const round = state.round!;
  const customer = state.players[round.customerIndex];
  const deck = getWordDeck(WORD_DECKS[0].id)!;
  const wordOf = (id: string) => deck.cards.find((c) => c.id === id)?.word ?? id;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <h2 className="text-xl font-bold text-white">
        {customer.name}, escolha o melhor produto
      </h2>
      <div className="flex flex-1 flex-col gap-3">
        {round.order.map((pi) => (
          <button
            key={pi}
            onClick={() => onPick(pi)}
            className="rounded-2xl bg-slate-800 p-4 text-left active:bg-slate-700"
          >
            <span className="text-lg font-semibold text-white">{state.players[pi].name}</span>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {(round.picks[pi] ?? []).map(wordOf).join(' + ')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
