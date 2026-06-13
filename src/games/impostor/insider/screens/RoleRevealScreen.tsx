import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { roleOf } from '../logic';
import type { SessionState } from '../types';

export function RoleRevealScreen({
  state,
  onAdvance,
}: {
  state: SessionState;
  onAdvance: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const player = state.config.players[state.round.revealIndex];
  const role = roleOf(state, player.id);

  if (!revealed) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 p-4 text-center">
        <p className="text-xl text-slate-300">Passe o celular para</p>
        <p className="text-4xl font-extrabold text-white">{player.name}</p>
        <ActionButton variant="neutral" onClick={() => setRevealed(true)}>
          Toque para ver seu papel
        </ActionButton>
      </div>
    );
  }

  const text =
    role === 'master'
      ? `Você é o MESTRE. Palavra: ${state.round.word}. Memorize.`
      : role === 'insider'
        ? `Você é o INSIDER. Palavra: ${state.round.word}. Aja como ingênuo.`
        : 'Você é INGÊNUO.';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-4 text-center">
      <p className="text-2xl font-bold text-white">{text}</p>
      <ActionButton
        variant="positive"
        onClick={() => {
          setRevealed(false);
          onAdvance();
        }}
      >
        Esconder e passar
      </ActionButton>
    </div>
  );
}
