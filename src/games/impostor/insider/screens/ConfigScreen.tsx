import { useState } from 'react';
import { INSIDER_DECKS } from '../data/decks';
import { createSession } from '../logic';
import { loadPlayers, savePlayers } from '../playerStore';
import type { MasterMode, Player, SessionState } from '../types';
import { ui } from '../ui';

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

  const canStart = players.length >= 4;

  return (
    <div className={ui.screenGap4}>
      <h1 className={ui.title}>Insider</h1>

      <div className={ui.section}>
        <span className={ui.label200}>Jogadores ({players.length})</span>
        <ul className={ui.list}>
          {players.map((p) => (
            <li key={p.id} className={ui.listItem}>
              <span>{p.name}</span>
              <button className={ui.removeBtn} onClick={() => removePlayer(p.id)} aria-label={`Remover ${p.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className={ui.inputRow}>
          <input
            className={`${ui.field} flex-1`}
            value={name}
            placeholder="Nome do jogador"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button className={ui.addBtn} onClick={addPlayer}>
            +
          </button>
        </div>
        {!canStart && <p className={ui.warn}>Mínimo de 4 jogadores.</p>}
      </div>

      <label className={ui.fieldGroup}>
        Deck
        <select className={ui.field} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {INSIDER_DECKS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label className={ui.fieldGroup}>
        Duração da adivinhação
        <select
          className={ui.field}
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
          className={ui.field}
          type="number"
          min={30}
          step={30}
          value={guessSeconds}
          onChange={(e) => setGuessSeconds(Math.max(30, Number(e.target.value)))}
          aria-label="Segundos da adivinhação"
        />
      </label>

      <label className={ui.fieldGroup}>
        Modo do Mestre
        <select
          className={ui.field}
          value={masterMode}
          onChange={(e) => setMasterMode(e.target.value as MasterMode)}
        >
          <option value="rotate">Rodízio (sem repetir)</option>
          <option value="choose">Grupo escolhe</option>
        </select>
      </label>

      <button
        className={ui.primaryCta}
        onClick={start}
        disabled={!canStart}
      >
        Começar
      </button>
    </div>
  );
}
