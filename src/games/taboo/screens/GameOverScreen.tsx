// src/games/taboo/screens/GameOverScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import { getWinner } from '../logic';
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
  const winner = getWinner(state);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <h1 className="text-center text-3xl font-extrabold text-accent">
        {winner === 'tie' ? 'Empate!' : `${state.teams[winner].name} venceu! 🏆`}
      </h1>
      <Scoreboard teams={state.teams} />
      <button
        className="rounded-2xl bg-good py-5 text-xl font-bold text-ink transition active:brightness-90"
        onClick={onPlayAgain}
      >
        Jogar de novo
      </button>
      <button
        className="rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95"
        onClick={onHome}
      >
        Início
      </button>
    </div>
  );
}
