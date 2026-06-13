// src/games/impostor/insider/screens/MasterAnnounceScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function MasterAnnounceScreen({
  state,
  onReveal,
}: {
  state: SessionState;
  onReveal: () => void;
}) {
  const master = state.config.players.find((p) => p.id === state.round.masterId);
  return (
    <div className={ui.screenCenteredGap6}>
      <p className={ui.lead200}>Mestre desta rodada:</p>
      <p className={ui.hero}>{master?.name ?? '—'}</p>
      <p className={ui.muted}>
        Passe o celular começando por {state.config.players[0]?.name}. Cada um vê o próprio papel.
      </p>
      <ActionButton variant="positive" onClick={onReveal}>
        Revelar papéis
      </ActionButton>
    </div>
  );
}
