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
  const [teams, setTeams] = useState(['Time A', 'Time B']);

  function setTeamName(i: number, val: string) {
    setTeams((prev) => prev.map((n, idx) => (idx === i ? val : n)));
  }
  function addTeam() {
    setTeams((prev) => [...prev, `Time ${String.fromCharCode(65 + prev.length)}`]);
  }
  function removeTeam() {
    setTeams((prev) => prev.slice(0, -1));
  }

  function start() {
    const config: MatchConfig = {
      deckId,
      turnSeconds,
      skipLimit,
      skipCostsPoint,
      endMode,
      endValue,
      teamNames: teams.map((n, i) => n.trim() || `Time ${String.fromCharCode(65 + i)}`),
    };
    const deck = getDeck(deckId)!;
    onStart(createGame(config, deck));
  }

  const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-ink';
  const labelText = 'flex flex-col gap-1 text-sm font-medium text-muted';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 animate-screen-in">
      <h1 className="text-2xl font-bold text-ink">Configurar partida</h1>

      <label className={labelText}>
        Deck
        <select className={field} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {DECKS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label className={labelText}>
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

      <label className={labelText}>
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

      <label className="flex items-center gap-2 text-ink">
        <input
          type="checkbox"
          checked={skipCostsPoint}
          onChange={(e) => setSkipCostsPoint(e.target.checked)}
          className="accent-accent"
        />
        Pular tira 1 ponto
      </label>

      <label className={labelText}>
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

      <label className={labelText}>
        {endMode === 'rounds' ? 'Rodadas por time' : 'Meta de pontos'}
        <input
          className={field}
          type="number"
          min={1}
          value={endValue}
          onChange={(e) => setEndValue(Math.max(1, Number(e.target.value)))}
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Times ({teams.length})</span>
          <div className="flex gap-2">
            {teams.length > 2 && (
              <button
                type="button"
                className="rounded-lg border border-line bg-surface px-3 py-1 text-sm text-ink active:brightness-90"
                onClick={removeTeam}
              >
                − Remover
              </button>
            )}
            {teams.length < 5 && (
              <button
                type="button"
                className="rounded-lg border border-line bg-surface px-3 py-1 text-sm text-ink active:brightness-90"
                onClick={addTeam}
              >
                + Adicionar
              </button>
            )}
          </div>
        </div>
        {teams.map((name, i) => (
          <input
            key={i}
            className={field}
            value={name}
            onChange={(e) => setTeamName(i, e.target.value)}
          />
        ))}
      </div>

      <button
        className="mt-2 rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90"
        onClick={start}
      >
        Começar
      </button>
    </div>
  );
}
