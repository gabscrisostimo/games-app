// src/games/impostor/insider/screens/MasterSelectScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function MasterSelectScreen({
  state,
  onSelect,
}: {
  state: SessionState;
  onSelect: (playerId: string) => void;
}) {
  return (
    <div className={ui.screenGap3}>
      <h2 className={ui.title}>Quem será o Mestre?</h2>
      {state.config.players.map((p) => (
        <ActionButton key={p.id} variant="neutral" onClick={() => onSelect(p.id)}>
          {p.name}
        </ActionButton>
      ))}
    </div>
  );
}
