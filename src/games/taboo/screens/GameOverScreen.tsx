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
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <h1 className="text-center text-3xl font-bold text-white">
        {winner === 'tie' ? 'Empate!' : `${state.teams[winner].name} venceu! 🏆`}
      </h1>
      <Scoreboard teams={state.teams} />
      <button
        className="rounded-2xl bg-emerald-600 py-5 text-xl font-bold text-white active:bg-emerald-700"
        onClick={onPlayAgain}
      >
        Jogar de novo
      </button>
      <button className="rounded-2xl bg-slate-700 py-4 text-lg text-white" onClick={onHome}>
        Início
      </button>
    </div>
  );
}
