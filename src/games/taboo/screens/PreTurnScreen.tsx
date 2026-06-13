// src/games/taboo/screens/PreTurnScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import type { GameState } from '../types';

export function PreTurnScreen({ state, onStart }: { state: GameState; onStart: () => void }) {
  const team = state.teams[state.currentTeam];
  const judge = state.teams[state.currentTeam === 0 ? 1 : 0];
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <Scoreboard teams={state.teams} currentTeam={state.currentTeam} />
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-muted">Vez de</p>
        <p className="text-3xl font-extrabold text-accent">{team.name}</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4 text-center text-sm text-muted">
        Juiz: alguém do <span className="font-semibold text-ink">{judge.name}</span> olha a tela e
        aperta <span className="font-semibold text-bad-text">Proibida</span> se ouvir uma palavra proibida.
      </div>
      <button
        className="rounded-2xl bg-good py-6 text-2xl font-bold text-ink transition active:brightness-90"
        onClick={onStart}
      >
        Começar turno
      </button>
    </div>
  );
}
