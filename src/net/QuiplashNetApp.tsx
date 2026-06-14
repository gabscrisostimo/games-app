// src/net/QuiplashNetApp.tsx
// App de rede do Quiplash real: lobby genérico (reusa CreateOrJoin/Lobby) +
// QuiplashNetView dirigida pela projeção. Espelha o NetDemoApp, trocando só a
// view e os tipos do jogo.
import { useState } from 'react';
import { getPlayerId } from './client/identity';
import { useRoom } from './client/useRoom';
import { CreateOrJoin, Lobby } from './ui/LobbyScreens';
import { QuiplashNetView } from './adapters/QuiplashNetView';
import type { QuiplashNetAction, QuiplashProjection } from './adapters/quiplash';

export function QuiplashNetApp() {
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

  const banner = !state.connected ? (
    <p className="bg-bad-soft p-2 text-center text-bad-text">Reconectando…</p>
  ) : state.error ? (
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

  return (
    <>
      {banner}
      {state.projection ? (
        <QuiplashNetView
          projection={state.projection as QuiplashProjection}
          onAction={(a: QuiplashNetAction) => send({ t: 'action', action: a })}
        />
      ) : (
        <p className="p-6 text-center text-muted">Carregando…</p>
      )}
    </>
  );
}
