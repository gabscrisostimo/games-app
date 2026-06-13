// src/games/taboo/screens/TurnSummaryScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import { isGameOver } from '../logic';
import type { GameState, Outcome } from '../types';

export function TurnSummaryScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const results = state.turn?.results ?? [];
  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const willEnd = isGameOver({ ...state, turnsTaken: state.turnsTaken + 1 });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Scoreboard teams={state.teams} />
      <div className="rounded-2xl bg-slate-800 p-4 text-center text-slate-200">
        <p className="text-lg font-semibold text-white">Fim do turno</p>
        <div className="mt-3 flex justify-around">
          <div><div className="text-2xl font-bold text-emerald-400">{count('correct')}</div>acertos</div>
          <div><div className="text-2xl font-bold text-rose-400">{count('taboo')}</div>proibidas</div>
          <div><div className="text-2xl font-bold text-slate-400">{count('skip')}</div>pulos</div>
        </div>
      </div>
      <button
        className="rounded-2xl bg-amber-500 py-5 text-xl font-bold text-slate-900 active:bg-amber-600"
        onClick={onNext}
      >
        {willEnd ? 'Ver resultado' : 'Próximo time'}
      </button>
    </div>
  );
}
