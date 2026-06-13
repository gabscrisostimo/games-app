# Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a identidade visual "Fusão" (azul-meia-noite + Inter) em todas as telas do games-app, com 4 animações CSS e ícones PWA reais, sem alterar lógica ou navegação.

**Architecture:** Tokens de design centralizados via `@theme` do Tailwind v4 em `src/index.css`; cada componente/tela troca cores soltas por utilitários de token; animações em CSS puro (`@keyframes` + transições); ícones gerados por script Node com `sharp`. Os 33 testes de lógica permanecem intactos; novos testes cobrem só a nova lógica de UI (flash de feedback e urgência do timer).

**Tech Stack:** Vite, React 18, TypeScript, Tailwind v4 (`@theme`), Vitest, @testing-library/react, vite-plugin-pwa, sharp (devDependency para gerar ícones).

**Spec:** `docs/superpowers/specs/2026-06-13-visual-polish-design.md`

**Escopo / não tocar:** `src/games/taboo/logic.ts`, `types.ts`, `reducer.ts`, `persistence.ts`, `src/data/`. Não adicionar bibliotecas de animação. Ver memória `project-scope-coordination`.

---

## Convenção de tokens (referência para todas as tasks)

Após a Task 1, estes utilitários Tailwind estarão disponíveis (gerados de `--color-*` no `@theme`):

| Utilitário | Cor | Uso |
|---|---|---|
| `bg-bg` | `#0c1220` | fundo da página |
| `bg-surface` | `#131c30` | cards, campos, blocos |
| `border-line` | `#1e3a5f` | bordas e divisores |
| `text-ink` | `#f8fafc` | texto principal |
| `text-muted` | `#94a3b8` | texto secundário |
| `text-accent` / `bg-accent` | `#7dd3fc` | azul-céu: labels, timer, CTA |
| `bg-good` | `#15803d` | botão acerto |
| `bg-good-soft` | `#14532d` | bloco/feedback acerto |
| `text-good-text` | `#86efac` | texto sobre verde |
| `bg-bad` | `#be123c` | botão proibida |
| `bg-bad-soft` | `#881337` | bloco/feedback proibida |
| `text-bad-text` | `#fca5a5` | proibidas, texto vermelho |

Animações disponíveis: `animate-card-in`, `animate-screen-in`, `animate-urgent`. Inter é a fonte padrão (via `--font-sans`), então `body` já usa Inter sem classe extra.

---

## Task 1: Tokens de design + fonte Inter

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Adicionar os links da fonte Inter no `index.html`**

Substituir o `<head>` atual por:

```html
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0c1220" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>Games App</title>
  </head>
```

- [ ] **Step 2: Definir os tokens em `src/index.css`**

Substituir todo o conteúdo de `src/index.css` por:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0c1220;
  --color-surface: #131c30;
  --color-line: #1e3a5f;
  --color-ink: #f8fafc;
  --color-muted: #94a3b8;
  --color-accent: #7dd3fc;
  --color-good: #15803d;
  --color-good-soft: #14532d;
  --color-good-text: #86efac;
  --color-bad: #be123c;
  --color-bad-soft: #881337;
  --color-bad-text: #fca5a5;

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

body {
  background-color: var(--color-bg);
  color: var(--color-ink);
}
```

- [ ] **Step 3: Verificar build e testes**

Run: `npm run test:run && npm run build`
Expected: testes passam (33), build conclui sem erro.

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat(visual): tokens de design Fusão + fonte Inter"
```

---

## Task 2: Animações CSS + reduced-motion

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Adicionar keyframes, animações e reduced-motion ao final de `src/index.css`**

Acrescentar ao final do arquivo (depois do bloco `body`):

```css
@theme {
  --animate-card-in: card-in 250ms ease-out;
  --animate-screen-in: screen-in 200ms ease-out;
  --animate-urgent: urgent 1s ease-in-out infinite;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes screen-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes urgent {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.12); opacity: 0.85; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(visual): keyframes de animação + suporte a reduced-motion"
```

---

## Task 3: ActionButton com tokens

**Files:**
- Modify: `src/shell/ActionButton.tsx`

- [ ] **Step 1: Reescrever `src/shell/ActionButton.tsx`**

Substituir todo o conteúdo por:

```tsx
// src/shell/ActionButton.tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'positive' | 'neutral' | 'negative';

const styles: Record<Variant, string> = {
  positive: 'bg-good active:brightness-90',
  neutral: 'bg-surface border border-line active:brightness-90',
  negative: 'bg-bad active:brightness-90',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function ActionButton({ variant = 'neutral', className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`w-full rounded-2xl py-6 text-2xl font-bold text-ink transition disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/shell/ActionButton.tsx
git commit -m "feat(visual): ActionButton usa tokens de design"
```

---

## Task 4: Scoreboard com tokens

**Files:**
- Modify: `src/shell/Scoreboard.tsx`

- [ ] **Step 1: Reescrever `src/shell/Scoreboard.tsx`**

Substituir todo o conteúdo por:

```tsx
// src/shell/Scoreboard.tsx
import type { TeamState } from '../games/taboo/types';

export function Scoreboard({
  teams,
  currentTeam,
}: {
  teams: [TeamState, TeamState];
  currentTeam?: 0 | 1;
}) {
  return (
    <div className="flex gap-2">
      {teams.map((t, i) => (
        <div
          key={i}
          className={`flex-1 rounded-xl border p-3 text-center transition ${
            currentTeam === i
              ? 'border-accent bg-surface ring-2 ring-accent'
              : 'border-line bg-surface'
          }`}
        >
          <div className="truncate text-sm text-muted">{t.name}</div>
          <div className="text-3xl font-bold text-ink">{t.score}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/shell/Scoreboard.tsx
git commit -m "feat(visual): Scoreboard usa tokens de design"
```

---

## Task 5: Home (App.tsx)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Reescrever `src/App.tsx`**

Substituir todo o conteúdo por:

```tsx
// src/App.tsx
import { useState } from 'react';
import { TabooApp } from './games/taboo/TabooApp';

type View = 'home' | 'taboo';

export function App() {
  const [view, setView] = useState<View>('home');

  return (
    <main className="min-h-dvh bg-bg text-ink">
      {view === 'home' ? (
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
        </div>
      ) : (
        <TabooApp onHome={() => setView('home')} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(visual): home com cards de jogo no estilo Fusão"
```

---

## Task 6: ConfigScreen

**Files:**
- Modify: `src/games/taboo/screens/ConfigScreen.tsx`

- [ ] **Step 1: Reescrever `src/games/taboo/screens/ConfigScreen.tsx`**

Substituir todo o conteúdo por (lógica idêntica; só muda a apresentação e a constante `field`):

```tsx
// src/games/taboo/screens/ConfigScreen.tsx
import { useState } from 'react';
import { DECKS, getDeck } from '../../../data/decks';
import { createGame } from '../logic';
import type { EndMode, GameState, MatchConfig } from '../types';

export function ConfigScreen({ onStart }: { onStart: (game: GameState) => void }) {
  const [deckId, setDeckId] = useState(DECKS[0].id);
  const [turnSeconds, setTurnSeconds] = useState(60);
  const [skipLimit, setSkipLimit] = useState<number | null>(3);
  const [skipCostsPoint, setSkipCostsPoint] = useState(false);
  const [endMode, setEndMode] = useState<EndMode>('rounds');
  const [endValue, setEndValue] = useState(5);
  const [teamA, setTeamA] = useState('Time A');
  const [teamB, setTeamB] = useState('Time B');

  function start() {
    const config: MatchConfig = {
      deckId,
      turnSeconds,
      skipLimit,
      skipCostsPoint,
      endMode,
      endValue,
      teamNames: [teamA.trim() || 'Time A', teamB.trim() || 'Time B'],
    };
    const deck = getDeck(deckId)!;
    onStart(createGame(config, deck));
  }

  const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-ink';
  const labelText = 'flex flex-col gap-1 text-sm font-medium text-muted';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 animate-screen-in">
      <h1 className="text-2xl font-bold text-ink">Configurar partida</h1>

      <label className={labelText}>
        Deck
        <select className={field} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {DECKS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <label className={labelText}>
        Duração do turno
        <select
          className={field}
          value={turnSeconds}
          onChange={(e) => setTurnSeconds(Number(e.target.value))}
        >
          {[30, 60, 90].map((s) => (
            <option key={s} value={s}>{s}s</option>
          ))}
        </select>
      </label>

      <label className={labelText}>
        Limite de pulos
        <select
          className={field}
          value={skipLimit === null ? 'inf' : skipLimit}
          onChange={(e) => setSkipLimit(e.target.value === 'inf' ? null : Number(e.target.value))}
        >
          {[1, 3, 5].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="inf">Ilimitado</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-ink">
        <input
          type="checkbox"
          checked={skipCostsPoint}
          onChange={(e) => setSkipCostsPoint(e.target.checked)}
          className="accent-accent"
        />
        Pular tira 1 ponto
      </label>

      <label className={labelText}>
        Fim de jogo
        <select
          className={field}
          value={endMode}
          onChange={(e) => setEndMode(e.target.value as EndMode)}
        >
          <option value="rounds">Por rodadas</option>
          <option value="points">Por pontos</option>
        </select>
      </label>

      <label className={labelText}>
        {endMode === 'rounds' ? 'Rodadas por time' : 'Meta de pontos'}
        <input
          className={field}
          type="number"
          min={1}
          value={endValue}
          onChange={(e) => setEndValue(Math.max(1, Number(e.target.value)))}
        />
      </label>

      <div className="flex gap-2">
        <input className={`${field} flex-1`} value={teamA} onChange={(e) => setTeamA(e.target.value)} />
        <input className={`${field} flex-1`} value={teamB} onChange={(e) => setTeamB(e.target.value)} />
      </div>

      <button
        className="mt-2 rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90"
        onClick={start}
      >
        Começar
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/games/taboo/screens/ConfigScreen.tsx
git commit -m "feat(visual): ConfigScreen no estilo Fusão"
```

---

## Task 7: PreTurnScreen

**Files:**
- Modify: `src/games/taboo/screens/PreTurnScreen.tsx`

- [ ] **Step 1: Reescrever `src/games/taboo/screens/PreTurnScreen.tsx`**

Substituir todo o conteúdo por:

```tsx
// src/games/taboo/screens/PreTurnScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import type { GameState } from '../types';

export function PreTurnScreen({ state, onStart }: { state: GameState; onStart: () => void }) {
  const team = state.teams[state.currentTeam];
  const judge = state.teams[state.currentTeam === 0 ? 1 : 0];
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <Scoreboard teams={state.teams} currentTeam={state.currentTeam} />
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-muted">Vez de</p>
        <p className="text-3xl font-extrabold text-accent">{team.name}</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4 text-center text-sm text-muted">
        Juiz: alguém do <span className="font-semibold text-ink">{judge.name}</span> olha a tela e
        aperta <span className="font-semibold text-bad-text">Proibida</span> se ouvir uma palavra proibida.
      </div>
      <button
        className="rounded-2xl bg-good py-6 text-2xl font-bold text-ink transition active:brightness-90"
        onClick={onStart}
      >
        Começar turno
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/games/taboo/screens/PreTurnScreen.tsx
git commit -m "feat(visual): PreTurnScreen no estilo Fusão"
```

---

## Task 8: InTurnScreen — flash de feedback, entrada de card e timer urgente

Esta é a única task com lógica de UI nova, então segue TDD.

**Files:**
- Modify: `src/games/taboo/screens/InTurnScreen.tsx`
- Test: `src/games/taboo/screens/InTurnScreen.test.tsx` (criar)

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/games/taboo/screens/InTurnScreen.test.tsx`:

```tsx
// src/games/taboo/screens/InTurnScreen.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { InTurnScreen } from './InTurnScreen';
import { createGame, startTurn } from '../logic';
import { DECKS } from '../../../data/decks';
import type { GameState, MatchConfig } from '../types';

function makeState(turnSeconds: number): GameState {
  const config: MatchConfig = {
    deckId: DECKS[0].id,
    turnSeconds,
    skipLimit: 3,
    skipCostsPoint: false,
    endMode: 'rounds',
    endValue: 5,
    teamNames: ['Time A', 'Time B'],
  };
  const fixedRng = () => 0.42;
  const game = createGame(config, DECKS[0], fixedRng);
  return startTurn(game, Date.now(), fixedRng);
}

describe('InTurnScreen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mostra o container do card sem flash inicialmente', () => {
    const state = makeState(60);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    const container = screen.getByTestId('card-container');
    expect(container.className).toContain('bg-surface');
    expect(container.className).not.toContain('bg-good-soft');
  });

  it('pisca verde ao acertar e limpa após 300ms', () => {
    const state = makeState(60);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    act(() => {
      screen.getByText('Acertou (+1)').click();
    });
    expect(screen.getByTestId('card-container').className).toContain('bg-good-soft');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('card-container').className).toContain('bg-surface');
    expect(screen.getByTestId('card-container').className).not.toContain('bg-good-soft');
  });

  it('aplica classe de urgência quando faltam 10s ou menos', () => {
    const state = makeState(8);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    expect(screen.getByTestId('timer').className).toContain('animate-urgent');
  });

  it('não aplica urgência com tempo confortável', () => {
    const state = makeState(60);
    render(<InTurnScreen state={state} onAction={() => {}} onExpire={() => {}} />);
    expect(screen.getByTestId('timer').className).not.toContain('animate-urgent');
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npx vitest run src/games/taboo/screens/InTurnScreen.test.tsx`
Expected: FAIL (o componente atual não tem `data-testid` nem flash/urgência).

- [ ] **Step 3: Reescrever `src/games/taboo/screens/InTurnScreen.tsx`**

Substituir todo o conteúdo por:

```tsx
// src/games/taboo/screens/InTurnScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../../shell/ActionButton';
import { useCountdown } from '../../../shell/useCountdown';
import { canSkip } from '../logic';
import { getDeck } from '../../../data/decks';
import type { GameState, Outcome } from '../types';

export function InTurnScreen({
  state,
  onAction,
  onExpire,
}: {
  state: GameState;
  onAction: (outcome: Outcome) => void;
  onExpire: () => void;
}) {
  const turn = state.turn!;
  const stableExpire = useCallback(onExpire, [onExpire]);
  const remaining = useCountdown(turn.endsAt, stableExpire);

  const [flash, setFlash] = useState<'correct' | 'taboo' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const handleAction = (outcome: Outcome) => {
    if (outcome === 'correct') setFlash('correct');
    else if (outcome === 'taboo') setFlash('taboo');
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 300);
    onAction(outcome);
  };

  const deck = getDeck(state.config.deckId)!;
  const card = deck.cards.find((c) => c.id === turn.currentCardId) ?? null;
  const skipsLeft =
    state.config.skipLimit === null ? '∞' : state.config.skipLimit - turn.skipsUsed;

  const urgent = remaining <= 10;
  const flashBg =
    flash === 'correct' ? 'bg-good-soft' : flash === 'taboo' ? 'bg-bad-soft' : 'bg-surface';

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-lg text-muted">{state.teams[state.currentTeam].name}</span>
        <span
          data-testid="timer"
          className={`text-3xl font-bold tabular-nums ${
            urgent ? 'text-bad-text animate-urgent' : 'text-accent'
          }`}
        >
          {remaining}s
        </span>
        <span className="text-sm text-muted">Pulos: {skipsLeft}</span>
      </div>

      <div
        data-testid="card-container"
        className={`flex flex-1 flex-col items-center justify-center rounded-3xl border border-line p-6 text-center transition-colors duration-200 ${flashBg}`}
      >
        {card ? (
          <div key={turn.currentCardId} className="animate-card-in">
            <p className="text-5xl font-extrabold text-ink">{card.target}</p>
            <div className="my-5 h-px bg-line" />
            <ul className="flex flex-col gap-1">
              {card.taboo.map((w) => (
                <li key={w} className="text-lg font-medium text-bad-text">{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xl text-muted">Sem cartas — encerre o turno.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <ActionButton variant="positive" onClick={() => handleAction('correct')} disabled={!card}>
          Acertou (+1)
        </ActionButton>
        <div className="flex gap-3">
          <ActionButton
            variant="neutral"
            onClick={() => handleAction('skip')}
            disabled={!card || !canSkip(state)}
          >
            Pular
          </ActionButton>
          <ActionButton variant="negative" onClick={() => handleAction('taboo')} disabled={!card}>
            Proibida (-1)
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `npx vitest run src/games/taboo/screens/InTurnScreen.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Rodar a suíte completa e o build**

Run: `npm run test:run && npm run build`
Expected: todos os testes passam (37 = 33 + 4), build ok.

- [ ] **Step 6: Commit**

```bash
git add src/games/taboo/screens/InTurnScreen.tsx src/games/taboo/screens/InTurnScreen.test.tsx
git commit -m "feat(visual): InTurnScreen com flash de feedback, entrada de card e timer urgente"
```

---

## Task 9: TurnSummaryScreen

**Files:**
- Modify: `src/games/taboo/screens/TurnSummaryScreen.tsx`

- [ ] **Step 1: Reescrever `src/games/taboo/screens/TurnSummaryScreen.tsx`**

Substituir todo o conteúdo por (lógica `count`/`willEnd` idêntica; só muda o visual):

```tsx
// src/games/taboo/screens/TurnSummaryScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import { isGameOver } from '../logic';
import type { GameState, Outcome } from '../types';

export function TurnSummaryScreen({ state, onNext }: { state: GameState; onNext: () => void }) {
  const results = state.turn?.results ?? [];
  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const willEnd = isGameOver({ ...state, turnsTaken: state.turnsTaken + 1 });

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <Scoreboard teams={state.teams} />
      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <p className="text-lg font-semibold text-ink">Fim do turno</p>
        <div className="mt-4 flex justify-around">
          <div className="text-muted">
            <div className="text-3xl font-bold text-good-text">{count('correct')}</div>acertos
          </div>
          <div className="text-muted">
            <div className="text-3xl font-bold text-bad-text">{count('taboo')}</div>proibidas
          </div>
          <div className="text-muted">
            <div className="text-3xl font-bold text-ink">{count('skip')}</div>pulos
          </div>
        </div>
      </div>
      <button
        className="rounded-2xl bg-accent py-5 text-xl font-bold text-bg transition active:brightness-90"
        onClick={onNext}
      >
        {willEnd ? 'Ver resultado' : 'Próximo time'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/games/taboo/screens/TurnSummaryScreen.tsx
git commit -m "feat(visual): TurnSummaryScreen no estilo Fusão"
```

---

## Task 10: GameOverScreen

**Files:**
- Modify: `src/games/taboo/screens/GameOverScreen.tsx`

- [ ] **Step 1: Reescrever `src/games/taboo/screens/GameOverScreen.tsx`**

Substituir todo o conteúdo por:

```tsx
// src/games/taboo/screens/GameOverScreen.tsx
import { Scoreboard } from '../../../shell/Scoreboard';
import { getWinner } from '../logic';
import type { GameState } from '../types';

export function GameOverScreen({
  state,
  onPlayAgain,
  onHome,
}: {
  state: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const winner = getWinner(state);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <h1 className="text-center text-3xl font-extrabold text-accent">
        {winner === 'tie' ? 'Empate!' : `${state.teams[winner].name} venceu! 🏆`}
      </h1>
      <Scoreboard teams={state.teams} />
      <button
        className="rounded-2xl bg-good py-5 text-xl font-bold text-ink transition active:brightness-90"
        onClick={onPlayAgain}
      >
        Jogar de novo
      </button>
      <button
        className="rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95"
        onClick={onHome}
      >
        Início
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/games/taboo/screens/GameOverScreen.tsx
git commit -m "feat(visual): GameOverScreen no estilo Fusão"
```

---

## Task 11: TabooApp — botões de retomar partida

**Files:**
- Modify: `src/games/taboo/TabooApp.tsx`

- [ ] **Step 1: Reescrever `src/games/taboo/TabooApp.tsx`**

Substituir todo o conteúdo por (lógica idêntica; só muda o visual dos botões de retomar):

```tsx
// src/games/taboo/TabooApp.tsx
import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { TabooSession } from './TabooSession';
import { loadGame, clearGame } from './persistence';
import type { GameState } from './types';

export function TabooApp({ onHome }: { onHome: () => void }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [resumable, setResumable] = useState<GameState | null>(() => loadGame());

  if (game) {
    return (
      <TabooSession
        key={game.turnsTaken === 0 && game.phase === 'pre-turn' ? 'new' : 'run'}
        initial={game}
        onPlayAgain={() => setGame(null)}
        onHome={onHome}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {resumable && resumable.phase !== 'game-over' && (
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 px-4">
          <button
            className="rounded-2xl bg-accent py-4 text-lg font-bold text-bg transition active:brightness-90"
            onClick={() => setGame(resumable)}
          >
            Continuar partida
          </button>
          <button
            className="text-sm text-muted underline"
            onClick={() => {
              clearGame();
              setResumable(null);
            }}
          >
            Descartar e começar nova
          </button>
        </div>
      )}
      <ConfigScreen onStart={(g) => setGame(g)} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/games/taboo/TabooApp.tsx
git commit -m "feat(visual): botões de retomar partida no estilo Fusão"
```

---

## Task 12: Transição de tela (TabooSession)

**Files:**
- Modify: `src/games/taboo/TabooSession.tsx`

- [ ] **Step 1: Envolver o render num wrapper com fade por fase**

Em `src/games/taboo/TabooSession.tsx`, substituir o bloco `switch (state.phase) { ... }` (linhas atuais ~30-41) por uma função interna `renderScreen` e um wrapper keyed. O conteúdo final do componente fica:

```tsx
// src/games/taboo/TabooSession.tsx
import { useCallback, useEffect, useReducer } from 'react';
import { gameReducer } from './reducer';
import { saveGame, clearGame } from './persistence';
import { PreTurnScreen } from './screens/PreTurnScreen';
import { InTurnScreen } from './screens/InTurnScreen';
import { TurnSummaryScreen } from './screens/TurnSummaryScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import type { GameState, Outcome } from './types';

export function TabooSession({
  initial,
  onPlayAgain,
  onHome,
}: {
  initial: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const [state, dispatch] = useReducer(gameReducer, initial);

  useEffect(() => {
    if (state.phase === 'game-over') clearGame();
    else saveGame(state);
  }, [state]);

  const onExpire = useCallback(() => dispatch({ type: 'END_TURN' }), []);
  const onAction = useCallback((outcome: Outcome) => dispatch({ type: 'ACTION', outcome }), []);

  function renderScreen() {
    switch (state.phase) {
      case 'pre-turn':
        return <PreTurnScreen state={state} onStart={() => dispatch({ type: 'START_TURN', now: Date.now() })} />;
      case 'in-turn':
        return <InTurnScreen state={state} onAction={onAction} onExpire={onExpire} />;
      case 'turn-summary':
        return <TurnSummaryScreen state={state} onNext={() => dispatch({ type: 'NEXT_TURN' })} />;
      case 'game-over':
        return <GameOverScreen state={state} onPlayAgain={onPlayAgain} onHome={onHome} />;
      default:
        return null;
    }
  }

  return (
    <div key={state.phase} className="min-h-dvh bg-bg text-ink animate-screen-in">
      {renderScreen()}
    </div>
  );
}
```

Nota: a `InTurnScreen` já controla a própria altura (`h-dvh`) e suas animações internas de card; o wrapper só faz o fade na troca de fase, então a animação de card não conflita (a fase `in-turn` não re-monta a cada carta).

- [ ] **Step 2: Verificar testes e build**

Run: `npm run test:run && npm run build`
Expected: testes passam, build ok.

- [ ] **Step 3: Commit**

```bash
git add src/games/taboo/TabooSession.tsx
git commit -m "feat(visual): transição de fade entre fases do Taboo"
```

---

## Task 13: Ícones PWA reais

**Files:**
- Create: `scripts/generate-icons.mjs`
- Modify: `package.json` (devDependency `sharp` + script)
- Modify: `vite.config.ts` (cores do manifest)
- Replace: `public/pwa-192.png`, `public/pwa-512.png`

- [ ] **Step 1: Instalar o `sharp` como devDependency**

Run: `npm install -D sharp`
Expected: `sharp` aparece em `devDependencies` do `package.json`.

- [ ] **Step 2: Criar o script `scripts/generate-icons.mjs`**

Criar `scripts/generate-icons.mjs`:

```js
// scripts/generate-icons.mjs
// Gera os ícones PWA a partir de um SVG vetorial (sem dependência de fontes).
// Identidade Fusão: fundo azul-meia-noite + dois balões de fala (dar pista).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0c1220"/>
  <rect x="96" y="120" width="240" height="160" rx="36" fill="#7dd3fc"/>
  <path d="M150 280 L150 340 L210 280 Z" fill="#7dd3fc"/>
  <rect x="210" y="232" width="200" height="140" rx="32" fill="#fca5a5"/>
  <path d="M360 372 L360 424 L308 372 Z" fill="#fca5a5"/>
</svg>
`;

async function build() {
  const buffer = Buffer.from(svg);
  await sharp(buffer).resize(512, 512).png().toFile(resolve(publicDir, 'pwa-512.png'));
  await sharp(buffer).resize(192, 192).png().toFile(resolve(publicDir, 'pwa-192.png'));
  console.log('Ícones gerados: pwa-192.png, pwa-512.png');
}

build();
```

- [ ] **Step 3: Adicionar o script ao `package.json`**

Em `package.json`, adicionar dentro de `"scripts"` a entrada:

```json
"icons": "node scripts/generate-icons.mjs"
```

- [ ] **Step 4: Gerar os ícones**

Run: `npm run icons`
Expected: imprime "Ícones gerados: pwa-192.png, pwa-512.png"; os arquivos `public/pwa-192.png` e `public/pwa-512.png` passam a ter o conteúdo real (não mais 1×1 px).

- [ ] **Step 5: Atualizar as cores do manifest no `vite.config.ts`**

Em `vite.config.ts`, no objeto `manifest`, trocar as duas linhas de cor:

```ts
        theme_color: '#0c1220',
        background_color: '#0c1220',
```

(substituindo os `#111827` atuais).

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: build conclui; os ícones reais entram no `dist/`.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-icons.mjs package.json package-lock.json vite.config.ts public/pwa-192.png public/pwa-512.png
git commit -m "feat(visual): ícones PWA reais + cores do manifest Fusão"
```

---

## Task 14: Verificação final e deploy

**Files:** nenhum (verificação + push)

- [ ] **Step 1: Rodar a suíte completa e o build de produção**

Run: `npm run test:run && npm run build`
Expected: todos os testes passam (37), build de produção ok.

- [ ] **Step 2: Verificação visual local**

Run: `npm run preview`
Abrir a URL local no browser e confirmar (checklist da spec):
- Fonte Inter carregando (texto com a cara da Inter, não a serif/sans padrão do SO).
- Fundo azul-meia-noite `#0c1220` em todas as telas.
- Fluxo completo: home → config → pre-turn → in-turn → summary → game-over.
- Animações: card entra com fade+slide a cada palavra; flash verde ao acertar / vermelho na proibida; timer pulsa e fica vermelho nos últimos 10s; fade ao trocar de tela.

Parar o preview com Ctrl+C ao terminar.

- [ ] **Step 3: Push para produção (Vercel)**

> Push dispara redeploy automático no Vercel. Confirmar com o Gabs antes de executar este passo.

Run: `git push`
Expected: Vercel rebuilda e publica em `games-app-bice.vercel.app`.

- [ ] **Step 4: Verificar em produção no celular**

Abrir `https://games-app-bice.vercel.app` no celular, confirmar o visual novo e o ícone PWA real ao "Adicionar à tela inicial".

---

## Self-Review

**1. Spec coverage:**
- Tokens de cor/tipografia → Task 1 ✅
- Animações (4) + reduced-motion → Task 2 (infra) + Task 8 (flash, entrada, urgência) + Task 12 (transição de tela) ✅
- Redesign de cada tela → Tasks 5–11 ✅
- Componentes shell (ActionButton, Scoreboard) → Tasks 3–4 ✅
- Ícones PWA reais + cores do manifest → Task 13 ✅
- Testes (flash limpa, urgência aparece) → Task 8 ✅
- Não quebrar os 33 testes → verificado em toda task ✅

**2. Placeholder scan:** sem TBD/TODO; todo passo de código tem o código completo. ✅

**3. Type consistency:** nomes de token (`bg-bg`, `bg-surface`, `border-line`, `text-ink`, `text-muted`, `text-accent`, `bg-good`, `bg-good-soft`, `text-good-text`, `bg-bad`, `bg-bad-soft`, `text-bad-text`) e animações (`animate-card-in`, `animate-screen-in`, `animate-urgent`) usados de forma idêntica entre Task 1/2 e Tasks 3–12. `data-testid` (`card-container`, `timer`) batem entre o teste e o componente na Task 8. ✅
