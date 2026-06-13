import { useState } from 'react';
import { generateRoomCode, isValidRoomCode } from '../roomCode';
import type { RoomView } from '../protocol';

export function CreateOrJoin({ onEnter }: { onEnter: (code: string, nickname: string) => void }) {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');

  const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-ink';
  const label = 'flex flex-col gap-1 text-sm font-medium text-muted';
  const trimmed = nickname.trim();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <h1 className="text-3xl font-extrabold text-ink">Jogar junto</h1>
      <label className={label}>
        Apelido
        <input className={field} value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
      </label>

      <button
        className="rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40"
        disabled={!trimmed}
        onClick={() => onEnter(generateRoomCode(), trimmed)}
      >
        Criar sala
      </button>

      <div className="my-1 h-px bg-line" />

      <label className={label}>
        Código da sala
        <input
          className={`${field} uppercase tracking-widest`}
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <button
        className="rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95 disabled:opacity-40"
        disabled={!trimmed || !isValidRoomCode(code.toUpperCase())}
        onClick={() => onEnter(code.toUpperCase(), trimmed)}
      >
        Entrar
      </button>
    </div>
  );
}

export function Lobby({
  room,
  me,
  onStart,
}: {
  room: RoomView;
  me: string;
  onStart: () => void;
}) {
  const isHost = me === room.hostId;
  const presentCount = room.players.filter((p) => p.present).length;
  const canStart = isHost && room.phase === 'lobby' && presentCount >= room.minPlayers;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <p className="text-sm text-muted">Código da sala</p>
        <p className="text-4xl font-extrabold tracking-[0.3em] text-accent">{room.code}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {room.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <span className="text-lg text-ink">{p.nickname}</span>
            <span className={p.present ? 'text-good-text' : 'text-muted'}>
              {p.present ? '● online' : '○ ausente'}
            </span>
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40"
          disabled={!canStart}
          onClick={onStart}
        >
          Começar ({presentCount}/{room.minPlayers})
        </button>
      ) : (
        <p className="text-center text-muted">Esperando o host começar…</p>
      )}
    </div>
  );
}
