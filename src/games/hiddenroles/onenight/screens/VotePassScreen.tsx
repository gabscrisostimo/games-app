// src/games/hiddenroles/onenight/screens/VotePassScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function VotePassScreen({
  state,
  onVote,
}: {
  state: SessionState;
  onVote: (target: number) => void;
}) {
  const { config, round } = state;
  const idx = round.passIndex;
  const voter = config.players[idx];
  const others = config.players.map((_, i) => i).filter((i) => i !== idx);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Passe o celular para</p>
        <p key={voter.id} className={`${ui.hero} animate-card-in`}>{voter.name}</p>
        <ActionButton variant="neutral" onClick={() => setOpen(true)}>
          Abrir voto
        </ActionButton>
      </div>
    );
  }

  return (
    <div className={ui.screenCenteredGap5}>
      <p className={ui.title}>Em quem você vota?</p>
      <div className={ui.choiceCol}>
        {others.map((i) => (
          <button key={i} className={ui.choice} onClick={() => onVote(i)}>
            {config.players[i].name}
          </button>
        ))}
      </div>
    </div>
  );
}
