// src/games/judging/snakeoil/screens/ConfigScreen.tsx
import { useState } from 'react';
import { WORD_DECKS, PERSONA_DECKS, getWordDeck, getPersonaDeck } from '../../../../data/judging';
import { createGame, maxPlayers } from '../logic';
import type { EndMode, GameState, MatchConfig } from '../types';

const field = 'rounded-lg bg-slate-800 px-3 py-2 text-white';

export function ConfigScreen({ onStart }: { onStart: (game: GameState) => void }) {
  const [names, setNames] = useState<string[]>(['Jogador 1', 'Jogador 2', 'Jogador 3']);
  const [handSize, setHandSize] = useState(6);
  const [cardsPerPitch, setCardsPerPitch] = useState(2);
  const [timerOn, setTimerOn] = useState(false);
  const [pitchSeconds, setPitchSeconds] = useState(60);
  const [endMode, setEndMode] = useState<EndMode>('rotations');
  const [endValue, setEndValue] = useState(1);

  const wordDeckSize = getWordDeck(WORD_DECKS[0].id)!.cards.length;
  const cap = maxPlayers(wordDeckSize, handSize);
  const overCapacity = names.length > cap;

  function setName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }
  function addPlayer() {
    setNames((prev) => [...prev, `Jogador ${prev.length + 1}`]);
  }
  function removePlayer(i: number) {
    setNames((prev) => (prev.length > 3 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function start() {
    if (overCapacity) return;
    const playerNames = names.map((n, i) => n.trim() || `Jogador ${i + 1}`);
    const config: MatchConfig = {
      playerNames,
      handSize,
      cardsPerPitch,
      pitchSeconds: timerOn ? pitchSeconds : null,
      endMode,
      endValue,
    };
    const wordDeck = getWordDeck(WORD_DECKS[0].id)!;
    const personaDeck = getPersonaDeck(PERSONA_DECKS[0].id)!;
    onStart(createGame(config, wordDeck, personaDeck));
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Snake Oil — configurar</h1>

      <div className="flex flex-col gap-2">
        <span className="text-slate-200">Jogadores (mín. 3)</span>
        {names.map((n, i) => (
          <div key={i} className="flex gap-2">
            <input className={`${field} flex-1`} value={n} onChange={(e) => setName(i, e.target.value)} />
            <button
              className="rounded-lg bg-rose-700 px-3 text-white disabled:opacity-40"
              onClick={() => removePlayer(i)}
              disabled={names.length <= 3}
            >
              −
            </button>
          </div>
        ))}
        <button
          className="rounded-lg bg-slate-700 py-2 text-white disabled:opacity-40"
          onClick={addPlayer}
          disabled={names.length >= cap}
        >
          + jogador
        </button>
      </div>

      <label className="flex flex-col gap-1 text-slate-200">
        Tamanho da mão
        <select className={field} value={handSize} onChange={(e) => setHandSize(Number(e.target.value))}>
          {[5, 6, 7].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        Cartas por pitch
        <select
          className={field}
          value={cardsPerPitch}
          onChange={(e) => setCardsPerPitch(Number(e.target.value))}
        >
          {[1, 2, 3].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-slate-200">
        <input type="checkbox" checked={timerOn} onChange={(e) => setTimerOn(e.target.checked)} />
        Timer por pitch
      </label>
      {timerOn && (
        <label className="flex flex-col gap-1 text-slate-200">
          Segundos por pitch
          <select
            className={field}
            value={pitchSeconds}
            onChange={(e) => setPitchSeconds(Number(e.target.value))}
          >
            {[30, 45, 60, 90].map((s) => (
              <option key={s} value={s}>{s}s</option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-slate-200">
        Fim de jogo
        <select className={field} value={endMode} onChange={(e) => setEndMode(e.target.value as EndMode)}>
          <option value="rotations">Por rotações</option>
          <option value="points">Por pontos</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        {endMode === 'rotations' ? 'Rotações (cada um é cliente N vezes)' : 'Meta de pontos'}
        <input
          className={field}
          type="number"
          min={1}
          value={endValue}
          onChange={(e) => setEndValue(Math.max(1, Number(e.target.value)))}
        />
      </label>

      {overCapacity && (
        <p className="text-sm text-rose-400">
          Cartas insuficientes: com mão de {handSize}, no máximo {cap} jogadores neste deck.
        </p>
      )}

      <button
        className="mt-2 rounded-2xl bg-amber-500 py-4 text-xl font-bold text-slate-900 active:bg-amber-600 disabled:opacity-40"
        onClick={start}
        disabled={overCapacity}
      >
        Começar
      </button>
    </div>
  );
}
