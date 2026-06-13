// src/games/impostor/insider/InsiderApp.tsx
import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { InsiderSession } from './InsiderSession';
import { loadSession, clearSession } from './persistence';
import type { SessionState } from './types';
import { ui } from './ui';

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
    <div className={ui.appRoot}>
      {resumable && resumable.round.phase !== 'result' && (
        <div className={ui.banner}>
          <button
            className={ui.resumeBtn}
            onClick={() => setSession(resumable)}
          >
            Continuar rodada
          </button>
          <button
            className={ui.linkBtn}
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
