import { ActionButton } from '../../../../shell/ActionButton';
import type { Accusation, SessionState } from '../types';
import { ui } from '../ui';

export function InsiderHuntScreen({
  state,
  onAccuse,
}: {
  state: SessionState;
  onAccuse: (accusation: Accusation) => void;
}) {
  return (
    <div className={ui.screenGap3}>
      <h2 className={ui.title}>Quem é o Insider?</h2>
      <p className={ui.muted}>Discutam e toquem uma vez, em consenso.</p>
      {state.config.players.map((p) => (
        <ActionButton key={p.id} variant="neutral" onClick={() => onAccuse({ kind: 'player', id: p.id })}>
          {p.name}
        </ActionButton>
      ))}
      <ActionButton variant="negative" onClick={() => onAccuse({ kind: 'nobody' })}>
        Ninguém
      </ActionButton>
    </div>
  );
}
