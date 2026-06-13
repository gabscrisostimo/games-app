// src/games/impostor/insider/screens/MasterAnnounceScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import type { SessionState } from '../types';

export function MasterAnnounceScreen({
  state,
  onReveal,
}: {
  state: SessionState;
  onReveal: () => void;
}) {
  const master = state.config.players.find((p) => p.id === state.round.masterId);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4 text-center">
      <p className="text-xl text-slate-200">Mestre desta rodada:</p>
      <p className="text-4xl font-extrabold text-white">{master?.name ?? '—'}</p>
      <p className="text-slate-400">
        Passe o celular começando por {state.config.players[0]?.name}. Cada um vê o próprio papel.
      </p>
      <ActionButton variant="positive" onClick={onReveal}>
        Revelar papéis
      </ActionButton>
    </div>
  );
}
