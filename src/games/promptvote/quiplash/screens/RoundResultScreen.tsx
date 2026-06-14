import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { matchupResults } from '../logic';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function RoundResultScreen({
  state,
  onNext,
}: {
  state: SessionState;
  onNext: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const isLast = state.round.index >= state.config.rounds - 1;
  const nameOf = (id: string) => state.config.players.find((p) => p.id === id)?.name ?? id;

  if (!revealed) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Votação encerrada</p>
        <p className={ui.muted}>Junte o grupo para ver o resultado.</p>
        <ActionButton variant="positive" onClick={() => setRevealed(true)}>
          Revelar resultados
        </ActionButton>
      </div>
    );
  }

  const results = matchupResults(state.round);

  return (
    <div className={ui.screenGap4}>
      <h2 className={ui.title}>Rodada {state.round.index + 1}</h2>
      {results.map((r, ri) => (
        <div key={ri} className={ui.card}>
          <p className={ui.prompt}>{r.promptText}</p>
          {r.tallies.map((t) => (
            <p key={t.authorId} className={ui.muted}>
              <span className={ui.accent}>{nameOf(t.authorId)}</span>: “{t.text}” — {t.votes} voto(s), +{t.points} pts
              {t.quiplash && <span className={ui.badge}>Quiplash!</span>}
            </p>
          ))}
        </div>
      ))}
      <ActionButton variant="positive" onClick={onNext}>
        {isLast ? 'Ver resultado final' : 'Próxima rodada'}
      </ActionButton>
    </div>
  );
}
