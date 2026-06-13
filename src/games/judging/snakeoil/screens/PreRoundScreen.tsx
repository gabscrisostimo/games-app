// src/games/judging/snakeoil/screens/PreRoundScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import { getPersonaDeck, PERSONA_DECKS } from '../../../../data/judging';
import type { GameState } from '../types';

export function PreRoundScreen({ state, onStart }: { state: GameState; onStart: () => void }) {
  const round = state.round!;
  const customer = state.players[round.customerIndex];
  const deck = getPersonaDeck(PERSONA_DECKS[0].id)!;
  const persona = deck.cards.find((c) => c.id === round.personaId)?.persona ?? '—';

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-6 p-4 text-center">
      <p className="text-lg text-slate-300">Cliente da rodada</p>
      <p className="text-4xl font-extrabold text-white">{customer.name}</p>
      <div className="w-full rounded-3xl bg-slate-800 p-6">
        <p className="text-sm uppercase tracking-wide text-slate-400">É um(a)…</p>
        <p className="mt-2 text-3xl font-bold text-amber-400">{persona}</p>
      </div>
      <p className="text-slate-300">
        {customer.name} lê a persona em voz alta. Os outros vão montar um produto pra vender pra
        ele(a).
      </p>
      <ActionButton variant="positive" onClick={onStart}>
        Começar rodada
      </ActionButton>
    </div>
  );
}
