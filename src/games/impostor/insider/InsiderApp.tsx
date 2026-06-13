// src/games/impostor/insider/InsiderApp.tsx
import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { InsiderSession } from './InsiderSession';
import { loadSession, clearSession } from './persistence';
import type { SessionState } from './types';

export function InsiderApp({ onHome }: { onHome: () => void }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [resumable, setResumable] = useState<SessionState | null>(() => loadSession());

  if (session) {
    return (
      <InsiderSession
        initial={session}
        onHome={() => {
          clearSession();
          setSession(null);
          onHome();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {resumable && resumable.round.phase !== 'result' && (
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 px-4">
          <button
            className="rounded-2xl bg-amber-500 py-4 text-lg font-bold text-slate-900"
            onClick={() => setSession(resumable)}
          >
            Continuar rodada
          </button>
          <button
            className="text-sm text-slate-400 underline"
            onClick={() => {
              clearSession();
              setResumable(null);
            }}
          >
            Descartar e começar nova
          </button>
        </div>
      )}
      <ConfigScreen onStart={(s) => setSession(s)} />
    </div>
  );
}
