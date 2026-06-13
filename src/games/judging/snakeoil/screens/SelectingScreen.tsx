// src/games/judging/snakeoil/screens/SelectingScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { getWordDeck, WORD_DECKS } from '../../../../data/judging';
import type { GameState, WordDeck } from '../types';

export function SelectingScreen({
  state,
  onConfirm,
  wordDeck,
}: {
  state: GameState;
  onConfirm: (picks: string[]) => void;
  wordDeck?: WordDeck;
}) {
  const round = state.round!;
  const pitcherIndex = round.order[round.selIndex];
  const pitcher = state.players[pitcherIndex];

  const [revealed, setRevealed] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);

  const deck = wordDeck ?? getWordDeck(WORD_DECKS[0].id)!;
  const wordOf = (id: string) => deck.cards.find((c) => c.id === id)?.word ?? id;

  const limit = state.config.cardsPerPitch;

  function toggle(id: string) {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= limit) return prev;
      return [...prev, id];
    });
  }

  if (!revealed) {
    return (
      <div className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-6 p-4 text-center">
        <p className="text-lg text-slate-300">Passe o celular para</p>
        <p className="text-4xl font-extrabold text-white">{pitcher.name}</p>
        <p className="text-slate-400">Mais ninguém pode ver a tela.</p>
        <ActionButton variant="neutral" onClick={() => setRevealed(true)}>
          Estou com o celular
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between text-slate-200">
        <span className="text-lg font-semibold">{pitcher.name}</span>
        <span className="text-sm">
          Escolha {limit} ({picks.length}/{limit})
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2 content-start gap-3">
        {pitcher.hand.map((id) => {
          const selected = picks.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`rounded-2xl p-4 text-lg font-bold ${
                selected ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-white'
              }`}
            >
              {wordOf(id)}
            </button>
          );
        })}
      </div>

      <ActionButton
        variant="positive"
        disabled={picks.length !== limit}
        onClick={() => onConfirm(picks)}
      >
        Confirmar
      </ActionButton>
    </div>
  );
}
