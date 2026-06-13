// src/net/NetDemoApp.tsx
import { useState } from 'react';
import { getPlayerId } from './client/identity';
import { useRoom } from './client/useRoom';
import { CreateOrJoin, Lobby } from './ui/LobbyScreens';
import { DemoGameView } from './__demo__/DemoGameView';
import type { DemoAction, DemoProjection } from './__demo__/promptvoteDemo';

export function NetDemoApp() {
  const [session, setSession] = useState<{ code: string; nickname: string } | null>(null);
  if (!session) return <CreateOrJoin onEnter={(code, nickname) => setSession({ code, nickname })} />;
  return <Connected code={session.code} nickname={session.nickname} />;
}

function Connected({ code, nickname }: { code: string; nickname: string }) {
  const playerId = getPlayerId();
  const { state, send } = useRoom(code, playerId, nickname);

  if (!state.room) {
    return <p className="p-6 text-center text-muted">Conectando à sala {code}…</p>;
  }

  const banner = state.error ? (
    <p className="bg-bad-soft p-2 text-center text-bad-text">{state.error}</p>
  ) : null;

  if (state.room.phase === 'lobby') {
    return (
      <>
        {banner}
        <Lobby room={state.room} me={playerId} onStart={() => send({ t: 'start' })} />
      </>
    );
  }

  // playing
  return (
    <>
      {banner}
      {state.projection ? (
        <DemoGameView
          projection={state.projection as DemoProjection}
          onAction={(a: DemoAction) => send({ t: 'action', action: a })}
        />
      ) : (
        <p className="p-6 text-center text-muted">Carregando…</p>
      )}
    </>
  );
}
