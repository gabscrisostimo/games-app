import { useCallback, useEffect, useRef, useState } from 'react';
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

  const [flash, setFlash] = useState<'correct' | 'taboo' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const handleAction = (outcome: Outcome) => {
    if (outcome === 'correct') setFlash('correct');
    else if (outcome === 'taboo') setFlash('taboo');
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 300);
    onAction(outcome);
  };

  const deck = getDeck(state.config.deckId)!;
  const card = deck.cards.find((c) => c.id === turn.currentCardId) ?? null;
  const skipsLeft =
    state.config.skipLimit === null ? '∞' : state.config.skipLimit - turn.skipsUsed;

  const urgent = remaining <= 10;
  const flashBg =
    flash === 'correct' ? 'bg-good-soft' : flash === 'taboo' ? 'bg-bad-soft' : 'bg-surface';

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-lg text-muted">{state.teams[state.currentTeam].name}</span>
        <span
          data-testid="timer"
          className={`text-3xl font-bold tabular-nums ${
            urgent ? 'text-bad-text animate-urgent' : 'text-accent'
          }`}
        >
          {remaining}s
        </span>
        <span className="text-sm text-muted">Pulos: {skipsLeft}</span>
      </div>

      <div
        data-testid="card-container"
        className={`flex flex-1 flex-col items-center justify-center rounded-3xl border border-line p-6 text-center transition-colors duration-200 ${flashBg}`}
      >
        {card ? (
          <div key={turn.currentCardId} className="animate-card-in">
            <p className="text-5xl font-extrabold text-ink">{card.target}</p>
            <div className="my-5 h-px bg-line" />
            <ul className="flex flex-col gap-1">
              {card.taboo.map((w) => (
                <li key={w} className="text-lg font-medium text-bad-text">{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xl text-muted">Sem cartas — encerre o turno.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <ActionButton variant="positive" onClick={() => handleAction('correct')} disabled={!card}>
          Acertou (+1)
        </ActionButton>
        <div className="flex gap-3">
          <ActionButton
            variant="neutral"
            onClick={() => handleAction('skip')}
            disabled={!card || !canSkip(state)}
          >
            Pular
          </ActionButton>
          <ActionButton variant="negative" onClick={() => handleAction('taboo')} disabled={!card}>
            Proibida (-1)
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
