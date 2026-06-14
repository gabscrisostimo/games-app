// src/games/hiddenroles/onenight/screens/DawnPassScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { ROLES } from '../roles';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function DawnPassScreen({
  state,
  onSubmit,
}: {
  state: SessionState;
  onSubmit: () => void;
}) {
  const { config, round } = state;
  const idx = round.passIndex;
  const player = config.players[idx];
  const isInsomniac = round.deal[idx] === 'insomniac';
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Amanheceu. Passe o celular para</p>
        <p key={player.id} className={`${ui.hero} animate-card-in`}>{player.name}</p>
        <ActionButton variant="neutral" onClick={() => setRevealed(true)}>
          Toque para acordar
        </ActionButton>
      </div>
    );
  }

  return (
    <div className={ui.screenCenteredGap6}>
      <p className={`${ui.title} animate-card-in`}>
        {isInsomniac
          ? `Você acorda como ${ROLES[round.finalRoles[idx]].name}.`
          : 'Você dorme tranquilo — nada mudou.'}
      </p>
      <ActionButton variant="positive" onClick={onSubmit}>
        Esconder e passar
      </ActionButton>
    </div>
  );
}
