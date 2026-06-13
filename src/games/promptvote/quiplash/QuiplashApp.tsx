import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { QuiplashSession } from './QuiplashSession';
import { loadSession, clearSession } from './persistence';
import type { SessionState } from './types';
import { ui } from './ui';

export function QuiplashApp({ onHome }: { onHome: () => void }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [resumable, setResumable] = useState<SessionState | null>(() => loadSession());

  if (session) {
    return (
      <QuiplashSession
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
      {resumable && resumable.round.phase !== 'final-result' && (
        <div className={ui.banner}>
          <button className={ui.resumeBtn} onClick={() => setSession(resumable)}>
            Continuar partida
          </button>
          <button
            className={ui.linkBtn}
            onClick={() => { clearSession(); setResumable(null); }}
          >
            Descartar e começar nova
          </button>
        </div>
      )}
      <ConfigScreen onStart={(s) => setSession(s)} />
    </div>
  );
}
