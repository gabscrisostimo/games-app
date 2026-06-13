// src/App.tsx
import { useState } from 'react';
import { TabooApp } from './games/taboo/TabooApp';

type View = 'home' | 'taboo';

export function App() {
  const [view, setView] = useState<View>('home');

  return (
    <main className="min-h-dvh bg-slate-900 text-white">
      {view === 'home' ? (
        <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
          <h1 className="text-3xl font-bold">Games App</h1>
          <p className="text-slate-400">Escolha um jogo:</p>
          <button
            className="rounded-2xl bg-amber-500 py-6 text-2xl font-bold text-slate-900 active:bg-amber-600"
            onClick={() => setView('taboo')}
          >
            Taboo
          </button>
        </div>
      ) : (
        <TabooApp onHome={() => setView('home')} />
      )}
    </main>
  );
}
