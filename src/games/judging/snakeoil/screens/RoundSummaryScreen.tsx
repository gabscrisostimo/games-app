// src/games/judging/snakeoil/screens/RoundSummaryScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import { getRanking } from '../logic';
import type { GameState } from '../types';

export function RoundSummaryScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const round = state.round!;
  const winner = round.winnerIndex !== null ? state.players[round.winnerIndex] : null;
  const ranking = getRanking(state);

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col gap-4 p-4">
      <div className="rounded-3xl bg-slate-800 p-6 text-center">
        <p className="text-sm uppercase tracking-wide text-slate-400">Vencedor da rodada</p>
        <p className="mt-2 text-3xl font-extrabold text-amber-400">🏆 {winner?.name ?? '—'}</p>
      </div>

      <ul className="flex flex-1 flex-col gap-2">
        {ranking.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-white"
          >
            <span>{p.name}</span>
            <span className="text-xl font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ul>

      <ActionButton variant="positive" onClick={onNext}>
        Próxima rodada
      </ActionButton>
    </div>
  );
}
