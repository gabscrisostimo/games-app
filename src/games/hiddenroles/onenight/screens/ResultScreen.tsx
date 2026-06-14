// src/games/hiddenroles/onenight/screens/ResultScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import { ROLES } from '../roles';
import type { SessionState, WinResult } from '../types';
import { ui } from '../ui';

function winnerLine(w: WinResult): string {
  const parts: string[] = [];
  if (w.village) parts.push('Aldeia');
  if (w.werewolf) parts.push('Time dos Lobos');
  if (w.tanner) parts.push('Tanner');
  return parts.length ? `Venceu: ${parts.join(' + ')}` : 'Ninguém venceu';
}

export function ResultScreen({
  state,
  onPlayAgain,
  onHome,
}: {
  state: SessionState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const { config, round, scores } = state;
  const winners = round.winners ?? { village: false, werewolf: false, tanner: false };
  const deadNames = round.deaths.map((i) => config.players[i].name);
  const standings = [...config.players].sort((p, q) => (scores[q.id] ?? 0) - (scores[p.id] ?? 0));

  return (
    <div className={`${ui.screenGap4} animate-screen-in`}>
      <h1 className={ui.title}>{winnerLine(winners)}</h1>

      <p className={ui.body}>
        {deadNames.length ? `Morreu: ${deadNames.join(', ')}.` : 'Ninguém morreu.'}
      </p>

      <div className={ui.section}>
        <span className={ui.label}>Papéis (início → fim)</span>
        <ul className={ui.list}>
          {config.players.map((p, i) => {
            const start = ROLES[round.deal[i]].name;
            const end = ROLES[round.finalRoles[i]].name;
            const dead = round.deaths.includes(i);
            return (
              <li key={p.id} className={ui.listItem}>
                <span>
                  {p.name}
                  {dead && <span className={ui.deathTag}> ☠</span>}
                </span>
                <span className={ui.muted}>{start === end ? end : `${start} → ${end}`}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={ui.section}>
        <span className={ui.label}>Placar</span>
        <ul className={ui.list}>
          {standings.map((p) => (
            <li key={p.id} className={ui.standing}>
              <span>{p.name}</span>
              <span className="tabular-nums">{scores[p.id] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={ui.buttonCol}>
        <ActionButton variant="positive" onClick={onPlayAgain}>
          Jogar de novo
        </ActionButton>
        <button className={ui.linkBtn} onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
