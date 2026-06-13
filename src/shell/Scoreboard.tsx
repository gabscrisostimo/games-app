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
          className={`flex-1 rounded-xl border p-3 text-center transition ${
            currentTeam === i
              ? 'border-accent bg-surface ring-2 ring-accent'
              : 'border-line bg-surface'
          }`}
        >
          <div className="truncate text-sm text-muted">{t.name}</div>
          <div className="text-3xl font-bold text-ink">{t.score}</div>
        </div>
      ))}
    </div>
  );
}
