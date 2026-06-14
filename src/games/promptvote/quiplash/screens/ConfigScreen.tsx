import { useState } from 'react';
import { QUIPLASH_DECKS } from '../../../../data/promptvote';
import { createSession } from '../logic';
import { loadPlayers, savePlayers } from '../playerStore';
import type { Mode, Player, SessionState } from '../types';
import { ui } from '../ui';

const ROUND_OPTIONS = [2, 3, 4, 5];

export function ConfigScreen({ onStart }: { onStart: (s: SessionState) => void }) {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('duel');
  const [rounds, setRounds] = useState(3);
  const [deckId, setDeckId] = useState(QUIPLASH_DECKS[0].id);

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
    const deck = QUIPLASH_DECKS.find((d) => d.id === deckId)!;
    onStart(createSession({ players, mode, rounds, deckId }, deck));
  }

  const canStart = players.length >= 3 && players.length <= 12;

  return (
    <div className={`${ui.screenGap4} animate-screen-in`}>
      <h1 className={ui.title}>Quiplash</h1>

      <div className={ui.section}>
        <span className={ui.label}>Jogadores ({players.length})</span>
        <ul className={ui.list}>
          {players.map((p) => (
            <li key={p.id} className={ui.listItem}>
              <span>{p.name}</span>
              <button className={ui.removeBtn} onClick={() => removePlayer(p.id)} aria-label={`Remover ${p.name}`}>✕</button>
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
          <button className={ui.addBtn} onClick={addPlayer}>+</button>
        </div>
        {players.length < 3 && <p className={ui.warn}>Mínimo de 3 jogadores.</p>}
        {players.length > 8 && players.length <= 12 && (
          <p className={ui.warn}>Acima de 8 fica longo no pass-and-play.</p>
        )}
        {players.length > 12 && <p className={ui.warn}>Máximo de 12 jogadores.</p>}
      </div>

      <label className={ui.fieldGroup}>
        Modo
        <select className={ui.field} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="duel">Duelo (2 por prompt)</option>
          <option value="group">Grupo (todos no mesmo prompt)</option>
        </select>
      </label>

      <label className={ui.fieldGroup}>
        Rodadas
        <select className={ui.field} value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
          {ROUND_OPTIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
        </select>
      </label>

      <label className={ui.fieldGroup}>
        Deck
        <select className={ui.field} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {QUIPLASH_DECKS.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
        </select>
      </label>

      <button className={ui.primaryCta} onClick={start} disabled={!canStart}>Começar</button>
    </div>
  );
}
