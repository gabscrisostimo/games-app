import { useState } from 'react';
import { INSIDER_DECKS } from '../data/decks';
import { createSession } from '../logic';
import { loadPlayers, savePlayers } from '../playerStore';
import type { MasterMode, Player, SessionState } from '../types';

const PRESETS = [180, 300, 420];

export function ConfigScreen({ onStart }: { onStart: (s: SessionState) => void }) {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [name, setName] = useState('');
  const [deckId, setDeckId] = useState(INSIDER_DECKS[0].id);
  const [guessSeconds, setGuessSeconds] = useState(300);
  const [masterMode, setMasterMode] = useState<MasterMode>('rotate');

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers([...players, { id: crypto.randomUUID(), name: trimmed }]);
    setName('');
  }

  function removePlayer(id: string) {
    setPlayers(players.filter((p) => p.id !== id));
  }

  function start() {
    savePlayers(players);
    onStart(createSession({ deckId, guessSeconds, players, masterMode }));
  }

  const field = 'rounded-lg bg-slate-800 px-3 py-2 text-white';
  const canStart = players.length >= 4;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Insider</h1>

      <div className="flex flex-col gap-2">
        <span className="text-slate-200">Jogadores ({players.length})</span>
        <ul className="flex flex-col gap-1">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-white">
              <span>{p.name}</span>
              <button className="text-rose-400" onClick={() => removePlayer(p.id)} aria-label={`Remover ${p.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className={`${field} flex-1`}
            value={name}
            placeholder="Nome do jogador"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button className="rounded-lg bg-emerald-600 px-4 font-bold text-white" onClick={addPlayer}>
            +
          </button>
        </div>
        {!canStart && <p className="text-sm text-amber-400">Mínimo de 4 jogadores.</p>}
      </div>

      <label className="flex flex-col gap-1 text-slate-200">
        Deck
        <select className={field} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {INSIDER_DECKS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        Duração da adivinhação
        <select
          className={field}
          value={PRESETS.includes(guessSeconds) ? guessSeconds : 'custom'}
          onChange={(e) => {
            if (e.target.value !== 'custom') setGuessSeconds(Number(e.target.value));
          }}
        >
          {PRESETS.map((s) => (
            <option key={s} value={s}>{s / 60} min</option>
          ))}
          <option value="custom">Personalizado…</option>
        </select>
        <input
          className={field}
          type="number"
          min={30}
          step={30}
          value={guessSeconds}
          onChange={(e) => setGuessSeconds(Math.max(30, Number(e.target.value)))}
          aria-label="Segundos da adivinhação"
        />
      </label>

      <label className="flex flex-col gap-1 text-slate-200">
        Modo do Mestre
        <select
          className={field}
          value={masterMode}
          onChange={(e) => setMasterMode(e.target.value as MasterMode)}
        >
          <option value="rotate">Rodízio (sem repetir)</option>
          <option value="choose">Grupo escolhe</option>
        </select>
      </label>

      <button
        className="mt-2 rounded-2xl bg-amber-500 py-4 text-xl font-bold text-slate-900 active:bg-amber-600 disabled:opacity-40"
        onClick={start}
        disabled={!canStart}
      >
        Começar
      </button>
    </div>
  );
}
