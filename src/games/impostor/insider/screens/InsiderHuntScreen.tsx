import { ActionButton } from '../../../../shell/ActionButton';
import type { Accusation, SessionState } from '../types';

export function InsiderHuntScreen({
  state,
  onAccuse,
}: {
  state: SessionState;
  onAccuse: (accusation: Accusation) => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4">
      <h2 className="text-2xl font-bold text-white">Quem é o Insider?</h2>
      <p className="text-slate-400">Discutam e toquem uma vez, em consenso.</p>
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
