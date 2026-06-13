import { useState } from 'react';
import { TabooApp } from './games/taboo/TabooApp';
import { InsiderApp } from './games/impostor/insider/InsiderApp';
import { SnakeOilApp } from './games/judging/snakeoil/SnakeOilApp';

type View = 'home' | 'taboo' | 'insider' | 'snakeoil';

export function App() {
  const [view, setView] = useState<View>('home');

  if (view === 'taboo') return <TabooApp onHome={() => setView('home')} />;
  if (view === 'insider') return <InsiderApp onHome={() => setView('home')} />;
  if (view === 'snakeoil') return <SnakeOilApp onHome={() => setView('home')} />;

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
        <header className="mt-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">Games App</h1>
          <p className="mt-1 text-muted">Party games pra jogar com os amigos</p>
        </header>

        <button
          className="rounded-2xl border border-line bg-surface p-5 text-left transition active:brightness-95"
          onClick={() => setView('taboo')}
        >
          <div className="text-2xl font-bold text-ink">Taboo</div>
          <div className="mt-1 text-sm text-muted">2 times · dar pistas sem falar as palavras proibidas</div>
        </button>

        <button
          className="rounded-2xl border border-line bg-surface p-5 text-left transition active:brightness-95"
          onClick={() => setView('insider')}
        >
          <div className="text-2xl font-bold text-ink">Insider</div>
          <div className="mt-1 text-sm text-muted">4+ jogadores · um insider sabe a palavra e age como ingênuo</div>
        </button>

        <button
          className="rounded-2xl border border-line bg-surface p-5 text-left transition active:brightness-95"
          onClick={() => setView('snakeoil')}
        >
          <div className="text-2xl font-bold text-ink">Snake Oil</div>
          <div className="mt-1 text-sm text-muted">3+ jogadores · venda produtos absurdos para um cliente improvável</div>
        </button>
      </div>
    </main>
  );
}
