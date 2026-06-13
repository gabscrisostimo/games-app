import { ActionButton } from '../../../../shell/ActionButton';
import type { Outcome, SessionState } from '../types';
import { ui } from '../ui';

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
    <div className={ui.screenCenteredGap5}>
      <h2 className={ui.title}>{outcome ? TITLES[outcome] : ''}</h2>
      <p className={ui.resultLine}>
        O Insider era: <strong className={ui.strongInk}>{insider?.name ?? '—'}</strong>
      </p>
      <p className={ui.muted}>Palavra: {state.round.word}</p>
      <ActionButton variant="positive" onClick={onPlayAgain}>
        Jogar de novo
      </ActionButton>
      <ActionButton variant="neutral" onClick={onHome}>
        Início
      </ActionButton>
    </div>
  );
}
