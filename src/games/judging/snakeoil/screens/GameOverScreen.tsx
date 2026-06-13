// src/games/judging/snakeoil/screens/GameOverScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import { getRanking } from '../logic';
import type { GameState } from '../types';

export function GameOverScreen({
  state,
  onPlayAgain,
  onHome,
}: {
  state: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const ranking = getRanking(state);

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col gap-4 p-4">
      <h1 className="text-center text-3xl font-extrabold text-white">Fim de jogo</h1>
      <p className="text-center text-xl text-amber-400">🏆 {ranking[0]?.name}</p>

      <ul className="flex flex-1 flex-col gap-2">
        {ranking.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-white"
          >
            <span>
              {i + 1}º {p.name}
            </span>
            <span className="text-xl font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <ActionButton variant="positive" onClick={onPlayAgain}>
          Jogar de novo
        </ActionButton>
        <ActionButton variant="neutral" onClick={onHome}>
          Início
        </ActionButton>
      </div>
    </div>
  );
}
