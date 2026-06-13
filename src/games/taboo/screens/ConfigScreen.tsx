// src/games/taboo/screens/ConfigScreen.tsx
import { useState } from 'react';
import { DECKS, getDeck } from '../../../data/decks';
import { createGame } from '../logic';
import type { EndMode, GameState, MatchConfig } from '../types';

export function ConfigScreen({ onStart }: { onStart: (game: GameState) => void }) {
  const [deckId, setDeckId] = useState(DECKS[0].id);
  const [turnSeconds, setTurnSeconds] = useState(60);
  const [skipLimit, setSkipLimit] = useState<number | null>(3);
  const [skipCostsPoint, setSkipCostsPoint] = useState(false);
  const [endMode, setEndMode] = useState<EndMode>('rounds');
  const [endValue, setEndValue] = useState(5);
  const [teamA, setTeamA] = useState('Time A');
  const [teamB, setTeamB] = useState('Time B');

  function start() {
    const config: MatchConfig = {
      deckId,
      turnSeconds,
      skipLimit,
      skipCostsPoint,
      endMode,
      endValue,
      teamNames: [teamA.trim() || 'Time A', teamB.trim() || 'Time B'],
    };
    const deck = getDeck(deckId)!;
    onStart(createGame(config, deck));
  }

  const field = 'rounded-lg bg-slate-800 px-3 py-2 text-white';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Configurar partida</h1>

      <label className="flex flex-col gap-1 text-slate-200">
        Deck
        <select className={field} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {DECKS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        Duração do turno
        <select
          className={field}
          value={turnSeconds}
          onChange={(e) => setTurnSeconds(Number(e.target.value))}
        >
          {[30, 60, 90].map((s) => (
            <option key={s} value={s}>{s}s</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        Limite de pulos
        <select
          className={field}
          value={skipLimit === null ? 'inf' : skipLimit}
          onChange={(e) => setSkipLimit(e.target.value === 'inf' ? null : Number(e.target.value))}
        >
          {[1, 3, 5].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="inf">Ilimitado</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-slate-200">
        <input
          type="checkbox"
          checked={skipCostsPoint}
          onChange={(e) => setSkipCostsPoint(e.target.checked)}
        />
        Pular tira 1 ponto
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        Fim de jogo
        <select
          className={field}
          value={endMode}
          onChange={(e) => setEndMode(e.target.value as EndMode)}
        >
          <option value="rounds">Por rodadas</option>
          <option value="points">Por pontos</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        {endMode === 'rounds' ? 'Rodadas por time' : 'Meta de pontos'}
        <input
          className={field}
          type="number"
          min={1}
          value={endValue}
          onChange={(e) => setEndValue(Math.max(1, Number(e.target.value)))}
        />
      </label>

      <div className="flex gap-2">
        <input className={`${field} flex-1`} value={teamA} onChange={(e) => setTeamA(e.target.value)} />
        <input className={`${field} flex-1`} value={teamB} onChange={(e) => setTeamB(e.target.value)} />
      </div>

      <button
        className="mt-2 rounded-2xl bg-amber-500 py-4 text-xl font-bold text-slate-900 active:bg-amber-600"
        onClick={start}
      >
        Começar
      </button>
    </div>
  );
}
