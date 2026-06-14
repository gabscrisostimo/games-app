// src/games/hiddenroles/onenight/screens/ConfigScreen.tsx
import { useState } from 'react';
import { createSession } from '../logic';
import { loadPlayers, savePlayers } from '../playerStore';
import { ROLES } from '../roles';
import { recommendedBag, BOX_LIMITS } from '../../../../data/hiddenroles/onenight/bags';
import type { Player, RoleId, SessionState } from '../types';
import { ui } from '../ui';

const PRESETS = [180, 300, 480]; // 3 / 5 / 8 min
const ROLE_ORDER: RoleId[] = [
  'werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker',
  'drunk', 'insomniac', 'hunter', 'tanner', 'villager',
];

export function ConfigScreen({ onStart }: { onStart: (s: SessionState) => void }) {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [name, setName] = useState('');
  const [bag, setBag] = useState<RoleId[]>(() => recommendedBag(Math.max(3, loadPlayers().length || 3)));
  const [discussSeconds, setDiscussSeconds] = useState(300);

  const needed = players.length + 3;
  const selected = bag.length;
  const canStart = players.length >= 3 && players.length <= 10 && selected === needed;

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers([...players, { id: crypto.randomUUID(), name: trimmed }]);
    setName('');
  }
  function removePlayer(id: string) {
    setPlayers(players.filter((p) => p.id !== id));
  }

  function countOf(role: RoleId): number {
    return bag.filter((r) => r === role).length;
  }
  function addRole(role: RoleId) {
    if (countOf(role) < BOX_LIMITS[role]) setBag([...bag, role]);
  }
  function removeRole(role: RoleId) {
    const idx = bag.lastIndexOf(role);
    if (idx >= 0) setBag(bag.filter((_, i) => i !== idx));
  }
  function resetBag() {
    setBag(recommendedBag(Math.min(10, Math.max(3, players.length))));
  }

  function start() {
    savePlayers(players);
    onStart(createSession({ players, bag, discussSeconds }));
  }

  return (
    <div className={`${ui.screenGap4} animate-screen-in`}>
      <h1 className={ui.title}>One Night</h1>

      <div className={ui.section}>
        <span className={ui.label}>Jogadores ({players.length})</span>
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
          <button className={ui.addBtn} onClick={addPlayer}>+</button>
        </div>
        {players.length < 3 && <p className={ui.warn}>Mínimo de 3 jogadores.</p>}
        {players.length > 10 && <p className={ui.warn}>Máximo de 10 jogadores.</p>}
      </div>

      <div className={ui.section}>
        <div className="flex items-center justify-between">
          <span className={ui.label}>Cartas no saco</span>
          <span className={`${ui.counter} ${selected === needed ? ui.counterOk : ui.counterOff}`}>
            {selected}/{needed}
          </span>
        </div>
        <ul className={ui.list}>
          {ROLE_ORDER.map((role) => (
            <li key={role} className={ui.roleRow}>
              <span className={ui.roleName}>{ROLES[role].name}</span>
              <div className={ui.stepper}>
                <button
                  className={ui.stepBtn}
                  onClick={() => removeRole(role)}
                  disabled={countOf(role) === 0}
                  aria-label={`Remover ${ROLES[role].name}`}
                >
                  −
                </button>
                <span className={ui.count}>{countOf(role)}</span>
                <button
                  className={ui.stepBtn}
                  onClick={() => addRole(role)}
                  disabled={countOf(role) >= BOX_LIMITS[role]}
                  aria-label={`Adicionar ${ROLES[role].name}`}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button className={ui.linkBtn} onClick={resetBag}>Restaurar conjunto recomendado</button>
      </div>

      <label className={ui.fieldGroup}>
        Duração da discussão
        <select
          className={ui.field}
          value={discussSeconds}
          onChange={(e) => setDiscussSeconds(Number(e.target.value))}
        >
          {PRESETS.map((s) => (
            <option key={s} value={s}>{s / 60} min</option>
          ))}
        </select>
      </label>

      <button className={ui.primaryCta} onClick={start} disabled={!canStart}>
        Começar
      </button>
    </div>
  );
}
