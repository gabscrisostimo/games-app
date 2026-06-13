// src/games/taboo/screens/TurnSummaryScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import { isGameOver } from '../logic';
import type { GameState, Outcome } from '../types';

export function TurnSummaryScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const results = state.turn?.results ?? [];
  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const willEnd = isGameOver({ ...state, turnsTaken: state.turnsTaken + 1 });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <Scoreboard teams={state.teams} />
      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <p className="text-lg font-semibold text-ink">Fim do turno</p>
        <div className="mt-4 flex justify-around">
          <div className="text-muted">
            <div className="text-3xl font-bold text-good-text">{count('correct')}</div>acertos
          </div>
          <div className="text-muted">
            <div className="text-3xl font-bold text-bad-text">{count('taboo')}</div>proibidas
          </div>
          <div className="text-muted">
            <div className="text-3xl font-bold text-ink">{count('skip')}</div>pulos
          </div>
        </div>
      </div>
      <button
        className="rounded-2xl bg-accent py-5 text-xl font-bold text-bg transition active:brightness-90"
        onClick={onNext}
      >
        {willEnd ? 'Ver resultado' : 'Próximo time'}
      </button>
    </div>
  );
}
