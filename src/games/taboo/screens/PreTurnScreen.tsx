// src/games/taboo/screens/PreTurnScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import type { GameState } from '../types';

export function PreTurnScreen({ state, onStart }: { state: GameState; onStart: () => void }) {
  const team = state.teams[state.currentTeam];
  const judge = state.teams[state.currentTeam === 0 ? 1 : 0];
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <Scoreboard teams={state.teams} currentTeam={state.currentTeam} />
      <div className="text-center">
        <p className="text-slate-300">Vez de</p>
        <p className="text-3xl font-bold text-amber-400">{team.name}</p>
        <p className="mt-4 text-sm text-slate-400">
          Juiz: alguém do <span className="font-semibold text-slate-200">{judge.name}</span> olha a
          tela e aperta <span className="font-semibold">Proibida</span> se ouvir uma palavra proibida.
        </p>
      </div>
      <button
        className="rounded-2xl bg-emerald-600 py-6 text-2xl font-bold text-white active:bg-emerald-700"
        onClick={onStart}
      >
        Começar turno
      </button>
    </div>
  );
}
