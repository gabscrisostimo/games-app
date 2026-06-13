import { ActionButton } from '../../../../shell/ActionButton';
import type { Outcome, SessionState } from '../types';

const TITLES: Record<Outcome, string> = {
  'not-guessed': 'Ninguém adivinhou a tempo',
  'insider-caught': 'Insider capturado! Mestre e Ingênuos vencem',
  'insider-escaped': 'O Insider escapou!',
};

export function ResultScreen({
  state,
  onPlayAgain,
  onHome,
}: {
  state: SessionState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const insider = state.config.players.find((p) => p.id === state.round.insiderId);
  const outcome = state.round.outcome;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-4 text-center">
      <h2 className="text-2xl font-bold text-white">{outcome ? TITLES[outcome] : ''}</h2>
      <p className="text-lg text-slate-200">
        O Insider era: <strong className="text-white">{insider?.name ?? '—'}</strong>
      </p>
      <p className="text-slate-400">Palavra: {state.round.word}</p>
      <ActionButton variant="positive" onClick={onPlayAgain}>
        Jogar de novo
      </ActionButton>
      <ActionButton variant="neutral" onClick={onHome}>
        Início
      </ActionButton>
    </div>
  );
}
