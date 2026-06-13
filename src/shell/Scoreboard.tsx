// src/shell/Scoreboard.tsx
import type { TeamState } from '../games/taboo/types';

export function Scoreboard({
  teams,
  currentTeam,
}: {
  teams: [TeamState, TeamState];
  currentTeam?: 0 | 1;
}) {
  return (
    <div className="flex gap-2">
      {teams.map((t, i) => (
        <div
          key={i}
          className={`flex-1 rounded-xl p-3 text-center ${
            currentTeam === i ? 'bg-slate-700 ring-2 ring-amber-400' : 'bg-slate-800'
          }`}
        >
          <div className="truncate text-sm text-slate-300">{t.name}</div>
          <div className="text-3xl font-bold text-white">{t.score}</div>
        </div>
      ))}
    </div>
  );
}
