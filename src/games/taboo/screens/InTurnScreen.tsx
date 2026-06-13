// src/games/taboo/screens/InTurnScreen.tsx
import { useCallback } from 'react';
import { ActionButton } from '../../../shell/ActionButton';
import { useCountdown } from '../../../shell/useCountdown';
import { canSkip } from '../logic';
import { getDeck } from '../../../data/decks';
import type { GameState, Outcome } from '../types';

export function InTurnScreen({
  state,
  onAction,
  onExpire,
}: {
  state: GameState;
  onAction: (outcome: Outcome) => void;
  onExpire: () => void;
}) {
  const turn = state.turn!;
  const stableExpire = useCallback(onExpire, [onExpire]);
  const remaining = useCountdown(turn.endsAt, stableExpire);

  const deck = getDeck(state.config.deckId)!;
  const card = deck.cards.find((c) => c.id === turn.currentCardId) ?? null;
  const skipsLeft =
    state.config.skipLimit === null ? '∞' : state.config.skipLimit - turn.skipsUsed;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between text-slate-200">
        <span className="text-lg">{state.teams[state.currentTeam].name}</span>
        <span className="text-3xl font-bold tabular-nums">{remaining}s</span>
        <span className="text-sm">Pulos: {skipsLeft}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-slate-800 p-6 text-center">
        {card ? (
          <>
            <p className="text-5xl font-extrabold text-white">{card.target}</p>
            <ul className="mt-6 flex flex-col gap-1">
              {card.taboo.map((w) => (
                <li key={w} className="text-xl font-semibold text-rose-400">{w}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xl text-slate-300">Sem cartas — encerre o turno.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <ActionButton variant="positive" onClick={() => onAction('correct')} disabled={!card}>
          Acertou (+1)
        </ActionButton>
        <div className="flex gap-3">
          <ActionButton
            variant="neutral"
            onClick={() => onAction('skip')}
            disabled={!card || !canSkip(state)}
          >
            Pular
          </ActionButton>
          <ActionButton variant="negative" onClick={() => onAction('taboo')} disabled={!card}>
            Proibida (-1)
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
