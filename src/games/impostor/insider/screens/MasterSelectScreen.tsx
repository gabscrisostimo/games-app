// src/games/impostor/insider/screens/MasterSelectScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import type { SessionState } from '../types';

export function MasterSelectScreen({
  state,
  onSelect,
}: {
  state: SessionState;
  onSelect: (playerId: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4">
      <h2 className="text-2xl font-bold text-white">Quem será o Mestre?</h2>
      {state.config.players.map((p) => (
        <ActionButton key={p.id} variant="neutral" onClick={() => onSelect(p.id)}>
          {p.name}
        </ActionButton>
      ))}
    </div>
  );
}
