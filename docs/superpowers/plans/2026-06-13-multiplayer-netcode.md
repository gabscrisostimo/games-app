# Multiplayer / Netcode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir jogar multi-device (cada jogador no seu celular) numa camada genérica `src/net/`, provada por um demo promptvote jogável em 2 celulares sobre PartyKit.

**Architecture:** A autoridade (sala = Durable Object PartyKit) roda o reducer do jogo e manda **projeção por-jogador**. A lógica da sala vive num **engine puro** (`roomEngine`: `(state, event) → {state, outbound}`); o `Party.Server` é só glue. Cada jogo implementa o contrato `NetGame` (createInitial/reducer/project/legalActions/deadline/onTimeout). O cliente é um hook fino (`useRoom`) que renderiza projeções.

**Tech Stack:** TypeScript, React 18, Vite 5, Vitest 2, Tailwind v4 (tokens de `docs/visual-tokens.md`), PartyKit (`partykit` + `partysocket`), Cloudflare (deploy).

**Convenções:** TDD (teste antes do código). DRY/YAGNI. Commits frequentes. **Todo commit termina com o trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`** (não repetido em cada passo abaixo). Todos os comandos rodam **dentro do worktree** `/home/gabs/personal/games-app/.claude/worktrees/feat+multiplayer`.

**Fronteiras (NÃO violar):** dono de `src/net/**`, `partykit.json`, `net-demo.html`, e as deps `partykit`/`partysocket` no `package.json`. **Não editar** `src/App.tsx`, `src/shell/**`, `src/index.css` (só **importar**), `index.html`, `vite.config.ts`, `public/**`, nem `src/games/**`.

---

## File Structure

| Arquivo | Responsabilidade | Testado por |
|---|---|---|
| `partykit.json` | Config PartyKit (aponta `main` pro server) | — |
| `net-demo.html` | Entry HTML da PoC (Vite serve em dev) | — |
| `src/net/contract.ts` | Tipos do contrato `NetGame`, `InitCtx`, `ActionCtx`, `PlayerId` | tsc |
| `src/net/protocol.ts` | Mensagens `ClientMsg`/`ServerMsg`, `RoomView`, `PlayerView` | tsc |
| `src/net/rng.ts` | PRNG semeado `mulberry32` + `shuffle` (puros) | `rng.test.ts` |
| `src/net/roomCode.ts` | `generateRoomCode` / `isValidRoomCode` (puros) | `roomCode.test.ts` |
| `src/net/__demo__/prompts.ts` | Banco de prompts do demo | — |
| `src/net/__demo__/promptvoteDemo.ts` | `NetGame` do demo (lógica + tipos + projeção) | `promptvoteDemo.test.ts` |
| `src/net/server/roomEngine.ts` | Engine puro da sala (lobby/presença/reconexão/roteamento) | `roomEngine.test.ts` |
| `src/net/server/index.ts` | `Party.Server` (glue fino runtime) | manual (`partykit dev`) |
| `src/net/client/identity.ts` | `playerId` em localStorage | `identity.test.ts` |
| `src/net/client/useRoom.ts` | Hook `usePartySocket` + `reduceClientState` puro | `useRoom.test.ts` |
| `src/net/ui/LobbyScreens.tsx` | Telas genéricas (Criar/Entrar, Lobby) | `LobbyScreens.test.tsx` |
| `src/net/__demo__/DemoGameView.tsx` | Render das projeções do demo | `DemoGameView.test.tsx` |
| `src/net/NetDemoApp.tsx` | Compõe identidade + useRoom + telas | manual |
| `src/net/demo-entry.tsx` | `createRoot().render(<NetDemoApp/>)` | manual |

---

## Task 0: Setup — deps, config, baseline

**Files:**
- Modify: `package.json` (deps)
- Create: `partykit.json`
- Create: `net-demo.html`

- [ ] **Step 1: Install deps**

Run (no worktree):
```bash
npm install partysocket && npm install -D partykit
```
Expected: `package.json` ganha `partysocket` em `dependencies` e `partykit` em `devDependencies`.

- [ ] **Step 2: Create `partykit.json`**

```json
{
  "$schema": "https://www.partykit.io/schema.json",
  "name": "games-app-net",
  "main": "src/net/server/index.ts",
  "compatibilityDate": "2025-06-01"
}
```

- [ ] **Step 3: Create `net-demo.html` (stub que vamos preencher no fim)**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>games-app — net demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/net/demo-entry.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify baseline still green**

Run: `npm run test:run`
Expected: PASS (84 testes, 16 arquivos — nenhum tocado ainda).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json partykit.json net-demo.html
git commit -m "chore(net): setup partykit/partysocket + entry stub"
```

---

## Task 1: Seeded RNG + shuffle (`rng.ts`)

A autoridade é dona da aleatoriedade. PRNG determinístico = reprodutível a partir de um seed.

**Files:**
- Create: `src/net/rng.ts`
- Test: `src/net/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from './rng';

describe('mulberry32', () => {
  it('é determinístico pro mesmo seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('difere entre seeds diferentes', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it('gera valores em [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('não muta o array original e mantém os mesmos elementos', () => {
    const orig = [1, 2, 3, 4, 5];
    const out = shuffle(orig, mulberry32(7));
    expect(orig).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('é determinístico pro mesmo seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(9))).toEqual(
      shuffle([1, 2, 3, 4, 5], mulberry32(9)),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/rng.test.ts`
Expected: FAIL ("Failed to resolve import './rng'").

- [ ] **Step 3: Write minimal implementation**

```ts
// src/net/rng.ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/rng.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/rng.ts src/net/rng.test.ts
git commit -m "feat(net): seeded PRNG + shuffle"
```

---

## Task 2: Room code (`roomCode.ts`)

Código de 4 letras maiúsculas, sem `I`/`O` (ambíguas ao ditar). Cliente gera; server usa como room id.

**Files:**
- Create: `src/net/roomCode.ts`
- Test: `src/net/roomCode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { generateRoomCode, isValidRoomCode } from './roomCode';

describe('roomCode', () => {
  it('gera 4 letras maiúsculas válidas', () => {
    const code = generateRoomCode(mulberry32(1));
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });

  it('nunca inclui I ou O', () => {
    for (let s = 0; s < 200; s++) {
      const code = generateRoomCode(mulberry32(s));
      expect(code.includes('I')).toBe(false);
      expect(code.includes('O')).toBe(false);
    }
  });

  it('valida formato', () => {
    expect(isValidRoomCode('WXYZ')).toBe(true);
    expect(isValidRoomCode('wxyz')).toBe(false); // minúsculas
    expect(isValidRoomCode('ABC')).toBe(false); // curto
    expect(isValidRoomCode('ABIO')).toBe(false); // contém I/O
    expect(isValidRoomCode('A1B2')).toBe(false); // dígitos
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/roomCode.test.ts`
Expected: FAIL (import não resolve).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/net/roomCode.ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 letras, sem I e O

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-HJ-NP-Z]{4}$/.test(code);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/roomCode.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/roomCode.ts src/net/roomCode.test.ts
git commit -m "feat(net): room code generation + validation"
```

---

## Task 3: Contract + protocol types (`contract.ts`, `protocol.ts`)

Tipos só (sem runtime). O check é o `tsc`.

**Files:**
- Create: `src/net/contract.ts`
- Create: `src/net/protocol.ts`

- [ ] **Step 1: Create `src/net/contract.ts`**

```ts
// src/net/contract.ts
export type PlayerId = string;

export interface InitCtx<Config> {
  config: Config;
  players: { id: PlayerId; nickname: string }[];
  now: number; // relógio da autoridade no início da partida
  rng: () => number; // PRNG semeado pela autoridade
}

export interface ActionCtx {
  now: number;
  rng: () => number;
  actorId: PlayerId; // quem enviou a ação
}

export interface TimerCtx {
  now: number;
  rng: () => number;
}

/**
 * Contrato que todo jogo implementa pra rodar em rede. A autoridade roda estes
 * métodos; o cliente só renderiza Projection.
 */
export interface NetGame<State, Action extends { type: string }, Projection, Config> {
  createInitial(ctx: InitCtx<Config>): State;
  reducer(state: State, action: Action, ctx: ActionCtx): State;
  project(state: State, playerId: PlayerId): Projection;
  legalActions(state: State, playerId: PlayerId): Action['type'][];
  /** Próximo deadline autoritativo (ms epoch), ou null se a fase não tem timer. */
  deadline?(state: State): number | null;
  /** Chamado pela autoridade quando o deadline expira. */
  onTimeout?(state: State, ctx: TimerCtx): State;
}
```

- [ ] **Step 2: Create `src/net/protocol.ts`**

```ts
// src/net/protocol.ts
import type { PlayerId } from './contract';

export type RoomPhase = 'lobby' | 'playing';

export interface PlayerView {
  id: PlayerId;
  nickname: string;
  present: boolean;
}

export interface RoomView {
  code: string;
  phase: RoomPhase;
  players: PlayerView[];
  hostId: PlayerId | null;
  minPlayers: number;
}

// cliente -> servidor (join é implícito na conexão, via query string)
export type ClientMsg =
  | { t: 'start' }
  | { t: 'action'; action: unknown }; // ação específica do jogo, validada no server

// servidor -> cliente
export type ServerMsg =
  | { t: 'room'; room: RoomView }
  | { t: 'projection'; projection: unknown }
  | { t: 'error'; message: string };
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: PASS (sem erros). Se `partykit` ainda não estiver instalado, rode o Task 0 antes.

- [ ] **Step 4: Commit**

```bash
git add src/net/contract.ts src/net/protocol.ts
git commit -m "feat(net): NetGame contract + wire protocol types"
```

---

## Task 4: Demo promptvote — fase de resposta (`promptvoteDemo.ts`)

Demo descartável (namespaced `__demo__`). Todos respondem **o mesmo** prompt em privado. Prova: projeção secreta + assignment/timer autoritativos.

**Files:**
- Create: `src/net/__demo__/prompts.ts`
- Create: `src/net/__demo__/promptvoteDemo.ts`
- Test: `src/net/__demo__/promptvoteDemo.test.ts`

- [ ] **Step 1: Create `src/net/__demo__/prompts.ts`**

```ts
// src/net/__demo__/prompts.ts
export const PROMPTS: string[] = [
  'Um nome ruim pra uma banda de forró',
  'O pior conselho pra dar num primeiro encontro',
  'Uma feature inútil pra um carro do futuro',
  'O título de um filme de terror sobre segunda-feira',
  'Uma desculpa esfarrapada pra chegar atrasado',
  'O nome de um perfume com cheiro de derrota',
];
```

- [ ] **Step 2: Write the failing test (createInitial + SUBMIT_ANSWER + projeção secreta)**

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { promptvoteDemo as G } from './promptvoteDemo';
import type { DemoState } from './promptvoteDemo';

const players = [
  { id: 'a', nickname: 'Ana' },
  { id: 'b', nickname: 'Bia' },
  { id: 'c', nickname: 'Cau' },
];

function init(now = 1000): DemoState {
  return G.createInitial({
    config: { promptSeconds: 75, voteSeconds: 60 },
    players,
    now,
    rng: mulberry32(1),
  });
}

describe('promptvoteDemo — answering', () => {
  it('começa em answering com prompt, endsAt e scores zerados', () => {
    const s = init(1000);
    expect(s.phase).toBe('answering');
    expect(typeof s.prompt).toBe('string');
    expect(s.endsAt).toBe(1000 + 75 * 1000);
    expect(s.scores).toEqual({ a: 0, b: 0, c: 0 });
  });

  it('SUBMIT_ANSWER grava a resposta do ator', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'minha resposta' }, ctx('a'));
    expect(s.answers.a).toBe('minha resposta');
    expect(s.phase).toBe('answering');
  });

  it('ignora resposta vazia e resposta duplicada', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: '   ' }, ctx('a'));
    expect(s.answers.a).toBeUndefined();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'primeira' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segunda' }, ctx('a'));
    expect(s.answers.a).toBe('primeira');
  });

  it('projeção em answering NÃO vaza resposta de outro jogador', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segredo da Ana' }, ctx('a'));
    const pbView = G.project(s, 'b');
    expect(JSON.stringify(pbView)).not.toContain('segredo da Ana');
    expect(pbView).toMatchObject({ phase: 'answering', yourAnswer: null, submitted: 1, total: 3 });
    const paView = G.project(s, 'a');
    expect(paView).toMatchObject({ yourAnswer: 'segredo da Ana' });
  });

  it('legalActions: pode responder até enviar, depois não', () => {
    let s = init();
    expect(G.legalActions(s, 'a')).toEqual(['SUBMIT_ANSWER']);
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'oi' }, ctx('a'));
    expect(G.legalActions(s, 'a')).toEqual([]);
  });

  it('quando todos respondem, avança pra voting', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'ra' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'rb' }, ctx('b'));
    expect(s.phase).toBe('answering');
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'rc' }, ctx('c'));
    expect(s.phase).toBe('voting');
  });
});

function ctx(actorId: string) {
  return { now: 2000, rng: mulberry32(1), actorId };
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- src/net/__demo__/promptvoteDemo.test.ts`
Expected: FAIL (import não resolve).

- [ ] **Step 4: Write minimal implementation (cobre answering; voting/reveal entram no Task 5)**

```ts
// src/net/__demo__/promptvoteDemo.ts
import type { ActionCtx, InitCtx, NetGame, PlayerId, TimerCtx } from '../contract';
import { shuffle } from '../rng';
import { PROMPTS } from './prompts';

export type DemoPhase = 'answering' | 'voting' | 'reveal';
export interface DemoConfig {
  promptSeconds: number;
  voteSeconds: number;
}

export interface DemoState {
  phase: DemoPhase;
  config: DemoConfig;
  prompt: string;
  endsAt: number;
  players: { id: PlayerId; nickname: string }[];
  answers: Record<PlayerId, string>;
  options: { optionId: string; authorId: PlayerId; text: string }[];
  votes: Record<PlayerId, string>; // voterId -> optionId
  scores: Record<PlayerId, number>;
}

export type DemoAction =
  | { type: 'SUBMIT_ANSWER'; text: string }
  | { type: 'SUBMIT_VOTE'; optionId: string };

export type DemoProjection =
  | {
      phase: 'answering';
      prompt: string;
      yourAnswer: string | null;
      submitted: number;
      total: number;
      endsAt: number;
    }
  | {
      phase: 'voting';
      prompt: string;
      options: { optionId: string; text: string }[];
      yourVote: string | null;
      voted: number;
      total: number;
      endsAt: number;
    }
  | {
      phase: 'reveal';
      prompt: string;
      results: { nickname: string; text: string; votes: number }[];
      scores: { nickname: string; score: number }[];
    };

function allAnswered(s: DemoState): boolean {
  return s.players.every((p) => s.answers[p.id] !== undefined);
}

function eligibleVoters(s: DemoState): { id: PlayerId }[] {
  return s.players.filter((p) => s.options.some((o) => o.authorId !== p.id));
}

function allVoted(s: DemoState): boolean {
  return eligibleVoters(s).every((p) => s.votes[p.id] !== undefined);
}

function toVoting(s: DemoState, now: number, rng: () => number): DemoState {
  const entries = s.players
    .filter((p) => s.answers[p.id] !== undefined)
    .map((p) => ({ authorId: p.id, text: s.answers[p.id] }));
  const options = shuffle(entries, rng).map((e, i) => ({
    optionId: `o${i}`,
    authorId: e.authorId,
    text: e.text,
  }));
  return { ...s, phase: 'voting', options, endsAt: now + s.config.voteSeconds * 1000 };
}

function toReveal(s: DemoState): DemoState {
  const votesByOption: Record<string, number> = {};
  for (const optId of Object.values(s.votes)) {
    votesByOption[optId] = (votesByOption[optId] ?? 0) + 1;
  }
  const scores = { ...s.scores };
  for (const o of s.options) {
    scores[o.authorId] = (scores[o.authorId] ?? 0) + (votesByOption[o.optionId] ?? 0);
  }
  return { ...s, phase: 'reveal', scores };
}

export const promptvoteDemo: NetGame<DemoState, DemoAction, DemoProjection, DemoConfig> = {
  createInitial({ config, players, now, rng }: InitCtx<DemoConfig>): DemoState {
    const prompt = PROMPTS[Math.floor(rng() * PROMPTS.length)];
    return {
      phase: 'answering',
      config,
      prompt,
      endsAt: now + config.promptSeconds * 1000,
      players,
      answers: {},
      options: [],
      votes: {},
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    };
  },

  reducer(state: DemoState, action: DemoAction, ctx: ActionCtx): DemoState {
    switch (action.type) {
      case 'SUBMIT_ANSWER': {
        if (state.phase !== 'answering') return state;
        if (state.answers[ctx.actorId] !== undefined) return state;
        const text = action.text.trim();
        if (!text) return state;
        const next: DemoState = { ...state, answers: { ...state.answers, [ctx.actorId]: text } };
        return allAnswered(next) ? toVoting(next, ctx.now, ctx.rng) : next;
      }
      case 'SUBMIT_VOTE': {
        if (state.phase !== 'voting') return state;
        if (state.votes[ctx.actorId] !== undefined) return state;
        const opt = state.options.find((o) => o.optionId === action.optionId);
        if (!opt || opt.authorId === ctx.actorId) return state;
        const next: DemoState = { ...state, votes: { ...state.votes, [ctx.actorId]: action.optionId } };
        return allVoted(next) ? toReveal(next) : next;
      }
      default:
        return state;
    }
  },

  project(state: DemoState, playerId: PlayerId): DemoProjection {
    if (state.phase === 'answering') {
      return {
        phase: 'answering',
        prompt: state.prompt,
        yourAnswer: state.answers[playerId] ?? null,
        submitted: Object.keys(state.answers).length,
        total: state.players.length,
        endsAt: state.endsAt,
      };
    }
    if (state.phase === 'voting') {
      return {
        phase: 'voting',
        prompt: state.prompt,
        options: state.options
          .filter((o) => o.authorId !== playerId)
          .map((o) => ({ optionId: o.optionId, text: o.text })),
        yourVote: state.votes[playerId] ?? null,
        voted: Object.keys(state.votes).length,
        total: eligibleVoters(state).length,
        endsAt: state.endsAt,
      };
    }
    const nick = (id: PlayerId) => state.players.find((p) => p.id === id)?.nickname ?? '???';
    const votesByOption: Record<string, number> = {};
    for (const optId of Object.values(state.votes)) {
      votesByOption[optId] = (votesByOption[optId] ?? 0) + 1;
    }
    return {
      phase: 'reveal',
      prompt: state.prompt,
      results: state.options
        .map((o) => ({ nickname: nick(o.authorId), text: o.text, votes: votesByOption[o.optionId] ?? 0 }))
        .sort((x, y) => y.votes - x.votes),
      scores: state.players
        .map((p) => ({ nickname: p.nickname, score: state.scores[p.id] ?? 0 }))
        .sort((x, y) => y.score - x.score),
    };
  },

  legalActions(state: DemoState, playerId: PlayerId): DemoAction['type'][] {
    if (state.phase === 'answering') {
      return state.answers[playerId] === undefined ? ['SUBMIT_ANSWER'] : [];
    }
    if (state.phase === 'voting') {
      const canVote =
        state.votes[playerId] === undefined && state.options.some((o) => o.authorId !== playerId);
      return canVote ? ['SUBMIT_VOTE'] : [];
    }
    return [];
  },

  deadline(state: DemoState): number | null {
    return state.phase === 'answering' || state.phase === 'voting' ? state.endsAt : null;
  },

  onTimeout(state: DemoState, ctx: TimerCtx): DemoState {
    if (state.phase === 'answering') return toVoting(state, ctx.now, ctx.rng);
    if (state.phase === 'voting') return toReveal(state);
    return state;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/net/__demo__/promptvoteDemo.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/net/__demo__/prompts.ts src/net/__demo__/promptvoteDemo.ts src/net/__demo__/promptvoteDemo.test.ts
git commit -m "feat(net): promptvote demo — answering phase + secret projection"
```

---

## Task 5: Demo promptvote — voting, reveal, timeout

Adiciona testes pra voting (anti-self-vote, anonimato), reveal (tally/score) e onTimeout. A implementação do Task 4 já cobre — estes testes **travam** o comportamento.

**Files:**
- Test: `src/net/__demo__/promptvoteDemo.test.ts` (adicionar)

- [ ] **Step 1: Write the failing tests (adicionar ao arquivo de teste)**

```ts
import { promptvoteDemo as G2 } from './promptvoteDemo';
import type { DemoState as DS } from './promptvoteDemo';

function reachVoting(): DS {
  let s = G2.createInitial({
    config: { promptSeconds: 75, voteSeconds: 60 },
    players: [
      { id: 'a', nickname: 'Ana' },
      { id: 'b', nickname: 'Bia' },
      { id: 'c', nickname: 'Cau' },
    ],
    now: 1000,
    rng: mulberry32(3),
  });
  s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'AAA' }, { now: 1100, rng: mulberry32(3), actorId: 'a' });
  s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'BBB' }, { now: 1200, rng: mulberry32(3), actorId: 'b' });
  s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'CCC' }, { now: 1300, rng: mulberry32(3), actorId: 'c' });
  return s; // agora em voting
}

describe('promptvoteDemo — voting', () => {
  it('cria uma option por resposta com endsAt de voto', () => {
    const s = reachVoting();
    expect(s.phase).toBe('voting');
    expect(s.options).toHaveLength(3);
    expect(s.endsAt).toBe(1300 + 60 * 1000);
  });

  it('projeção de voto exclui a própria resposta e NÃO vaza autoria', () => {
    const s = reachVoting();
    const view = G2.project(s, 'a') as Extract<ReturnType<typeof G2.project>, { phase: 'voting' }>;
    expect(view.phase).toBe('voting');
    expect(view.options).toHaveLength(2); // sem a própria
    expect(view.options.some((o) => o.text === 'AAA')).toBe(false);
    expect(JSON.stringify(view.options)).not.toContain('authorId');
  });

  it('barra voto na própria resposta', () => {
    const s = reachVoting();
    const ownOpt = s.options.find((o) => o.authorId === 'a')!;
    const after = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: ownOpt.optionId }, { now: 1400, rng: mulberry32(3), actorId: 'a' });
    expect(after.votes.a).toBeUndefined();
  });

  it('quando todos votam, vai pra reveal e pontua os autores', () => {
    let s = reachVoting();
    const optOf = (author: string) => s.options.find((o) => o.authorId === author)!.optionId;
    // a e c votam na B; b vota na A
    s = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: optOf('b') }, { now: 1400, rng: mulberry32(3), actorId: 'a' });
    s = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: optOf('b') }, { now: 1500, rng: mulberry32(3), actorId: 'c' });
    s = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: optOf('a') }, { now: 1600, rng: mulberry32(3), actorId: 'b' });
    expect(s.phase).toBe('reveal');
    expect(s.scores.b).toBe(2);
    expect(s.scores.a).toBe(1);
    expect(s.scores.c).toBe(0);
  });
});

describe('promptvoteDemo — deadline/onTimeout', () => {
  it('deadline reflete a fase', () => {
    const s = reachVoting();
    expect(G2.deadline!(s)).toBe(s.endsAt);
  });

  it('onTimeout em answering força voting mesmo sem todos responderem', () => {
    let s = G2.createInitial({
      config: { promptSeconds: 75, voteSeconds: 60 },
      players: [
        { id: 'a', nickname: 'Ana' },
        { id: 'b', nickname: 'Bia' },
        { id: 'c', nickname: 'Cau' },
      ],
      now: 1000,
      rng: mulberry32(5),
    });
    s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'só a Ana' }, { now: 1100, rng: mulberry32(5), actorId: 'a' });
    expect(s.phase).toBe('answering');
    s = G2.onTimeout!(s, { now: 99999, rng: mulberry32(5) });
    expect(s.phase).toBe('voting');
    expect(s.options).toHaveLength(1); // só quem respondeu vira option
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (impl já existe do Task 4)**

Run: `npm run test:run -- src/net/__demo__/promptvoteDemo.test.ts`
Expected: PASS (todos, incluindo os do Task 4). Se algum falhar, é bug na impl do Task 4 — corrija lá.

- [ ] **Step 3: Commit**

```bash
git add src/net/__demo__/promptvoteDemo.test.ts
git commit -m "test(net): lock voting/reveal/timeout behavior of promptvote demo"
```

---

## Task 6: Room engine (`server/roomEngine.ts`)

O coração genérico: lobby, presença, reconexão, host, roteamento de ação pro `NetGame`, e cálculo das mensagens de saída (`outbound`) por-jogador. **Puro** → testável sem PartyKit (é aqui que os "2 clientes simulados" vivem).

**Files:**
- Create: `src/net/server/roomEngine.ts`
- Test: `src/net/server/roomEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { promptvoteDemo } from '../__demo__/promptvoteDemo';
import type { DemoState } from '../__demo__/promptvoteDemo';
import { createRoom, reduceRoom } from './roomEngine';
import type { EngineDeps, RoomState } from './roomEngine';

type RS = RoomState<DemoState>;

const deps = (now = 1000): EngineDeps<DemoState, any, any, any> => ({
  game: promptvoteDemo,
  config: { promptSeconds: 75, voteSeconds: 60 },
  minPlayers: 3,
  now,
  rng: mulberry32(1),
});

function join(state: RS, playerId: string, nickname: string, now = 1000) {
  return reduceRoom(state, { kind: 'join', playerId, nickname }, deps(now));
}

describe('roomEngine — lobby/presença', () => {
  it('primeiro a entrar vira host; manda room snapshot pra todos', () => {
    const r = join(createRoom('WXYZ'), 'a', 'Ana');
    expect(r.state.hostId).toBe('a');
    expect(r.state.players).toEqual([{ id: 'a', nickname: 'Ana', present: true }]);
    expect(r.outbound).toContainEqual({
      to: 'all',
      msg: { t: 'room', room: { code: 'WXYZ', phase: 'lobby', hostId: 'a', minPlayers: 3, players: [{ id: 'a', nickname: 'Ana', present: true }] } },
    });
  });

  it('reconexão (mesmo playerId) re-marca presente sem duplicar', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = reduceRoom(r.state, { kind: 'disconnect', playerId: 'a' }, deps());
    expect(r.state.players[0].present).toBe(false);
    r = join(r.state, 'a', 'Ana');
    expect(r.state.players).toHaveLength(1);
    expect(r.state.players[0].present).toBe(true);
  });

  it('disconnect mantém a cadeira (não remove o jogador)', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = reduceRoom(r.state, { kind: 'disconnect', playerId: 'b' }, deps());
    expect(r.state.players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(r.state.players.find((p) => p.id === 'b')!.present).toBe(false);
  });
});

describe('roomEngine — start', () => {
  it('só o host inicia, e só com jogadores suficientes', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    // não-host tenta começar → erro só pra ele
    let bad = reduceRoom(r.state, { kind: 'start', playerId: 'b' }, deps());
    expect(bad.state.phase).toBe('lobby');
    expect(bad.outbound).toContainEqual({ to: 'b', msg: { t: 'error', message: expect.any(String) } });
    // host tenta com 2 < min 3 → erro
    bad = reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps());
    expect(bad.state.phase).toBe('lobby');
  });

  it('com host + min jogadores, começa e manda projeção por-jogador', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = join(r.state, 'c', 'Cau');
    const started = reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps(2000));
    expect(started.state.phase).toBe('playing');
    // cada jogador recebe SUA projeção
    for (const id of ['a', 'b', 'c']) {
      expect(started.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
    // e há um deadline a agendar
    expect(started.deadline).toBe(2000 + 75 * 1000);
  });
});

describe('roomEngine — action routing + secrecy', () => {
  function startGame() {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = join(r.state, 'c', 'Cau');
    return reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps(2000)).state;
  }

  it('ação ilegal (fase errada / não-ator) é barrada com erro só pro autor', () => {
    const s = startGame();
    const r = reduceRoom(s, { kind: 'action', playerId: 'a', action: { type: 'SUBMIT_VOTE', optionId: 'o0' } }, deps(2100));
    expect(r.outbound).toContainEqual({ to: 'a', msg: { t: 'error', message: expect.any(String) } });
  });

  it('SUBMIT_ANSWER de A não aparece na projeção mandada pra B', () => {
    let s = startGame();
    const r = reduceRoom(s, { kind: 'action', playerId: 'a', action: { type: 'SUBMIT_ANSWER', text: 'resposta-secreta-da-ana' } }, deps(2100));
    const toB = r.outbound.find((o) => o.to === 'b' && o.msg.t === 'projection')!;
    expect(JSON.stringify(toB.msg)).not.toContain('resposta-secreta-da-ana');
  });

  it('timeout avança a fase e re-projeta pra todos', () => {
    let s = startGame();
    const r = reduceRoom(s, { kind: 'timeout' }, deps(999999));
    // demo: answering -> voting
    expect((r.state.game as DemoState).phase).toBe('voting');
    for (const id of ['a', 'b', 'c']) {
      expect(r.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/server/roomEngine.test.ts`
Expected: FAIL (import não resolve).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/net/server/roomEngine.ts
import type { NetGame, PlayerId } from '../contract';
import type { RoomPhase, RoomView, ServerMsg } from '../protocol';

export interface RoomPlayer {
  id: PlayerId;
  nickname: string;
  present: boolean;
}

export interface RoomState<GS> {
  code: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: RoomPlayer[];
  game: GS | null;
}

export type RoomEvent =
  | { kind: 'join'; playerId: PlayerId; nickname: string }
  | { kind: 'disconnect'; playerId: PlayerId }
  | { kind: 'start'; playerId: PlayerId }
  | { kind: 'action'; playerId: PlayerId; action: unknown }
  | { kind: 'timeout' };

export interface EngineDeps<GS, A extends { type: string }, P, C> {
  game: NetGame<GS, A, P, C>;
  config: C;
  minPlayers: number;
  now: number;
  rng: () => number;
}

export interface Outbound {
  to: 'all' | PlayerId;
  msg: ServerMsg;
}

export interface EngineResult<GS> {
  state: RoomState<GS>;
  outbound: Outbound[];
  deadline: number | null;
}

export function createRoom(code: string): RoomState<never> {
  return { code, phase: 'lobby', hostId: null, players: [], game: null };
}

function roomView<GS>(state: RoomState<GS>, minPlayers: number): RoomView {
  return {
    code: state.code,
    phase: state.phase,
    hostId: state.hostId,
    minPlayers,
    players: state.players.map((p) => ({ id: p.id, nickname: p.nickname, present: p.present })),
  };
}

function projections<GS, A extends { type: string }, P, C>(
  state: RoomState<GS>,
  deps: EngineDeps<GS, A, P, C>,
): Outbound[] {
  if (state.phase !== 'playing' || state.game === null) return [];
  return state.players.map((p) => ({
    to: p.id,
    msg: { t: 'projection', projection: deps.game.project(state.game as GS, p.id) },
  }));
}

function deadlineOf<GS, A extends { type: string }, P, C>(
  state: RoomState<GS>,
  deps: EngineDeps<GS, A, P, C>,
): number | null {
  if (state.phase !== 'playing' || state.game === null || !deps.game.deadline) return null;
  return deps.game.deadline(state.game as GS);
}

export function reduceRoom<GS, A extends { type: string }, P, C>(
  state: RoomState<GS>,
  event: RoomEvent,
  deps: EngineDeps<GS, A, P, C>,
): EngineResult<GS> {
  switch (event.kind) {
    case 'join': {
      const existing = state.players.find((p) => p.id === event.playerId);
      let players: RoomPlayer[];
      if (existing) {
        players = state.players.map((p) =>
          p.id === event.playerId ? { ...p, present: true, nickname: event.nickname } : p,
        );
      } else if (state.phase !== 'lobby') {
        // entrar tarde = rejeitado
        return { state, outbound: [{ to: event.playerId, msg: { t: 'error', message: 'Partida em andamento.' } }], deadline: deadlineOf(state, deps) };
      } else {
        players = [...state.players, { id: event.playerId, nickname: event.nickname, present: true }];
      }
      const hostId = state.hostId ?? event.playerId;
      const next: RoomState<GS> = { ...state, players, hostId };
      const out: Outbound[] = [{ to: 'all', msg: { t: 'room', room: roomView(next, deps.minPlayers) } }];
      // reconectado durante a partida recebe sua projeção atual
      if (next.phase === 'playing' && next.game !== null) {
        out.push({ to: event.playerId, msg: { t: 'projection', projection: deps.game.project(next.game, event.playerId) } });
      }
      return { state: next, outbound: out, deadline: deadlineOf(next, deps) };
    }

    case 'disconnect': {
      const players = state.players.map((p) =>
        p.id === event.playerId ? { ...p, present: false } : p,
      );
      const next: RoomState<GS> = { ...state, players };
      return {
        state: next,
        outbound: [{ to: 'all', msg: { t: 'room', room: roomView(next, deps.minPlayers) } }],
        deadline: deadlineOf(next, deps),
      };
    }

    case 'start': {
      const err = (message: string): EngineResult<GS> => ({
        state,
        outbound: [{ to: event.playerId, msg: { t: 'error', message } }],
        deadline: deadlineOf(state, deps),
      });
      if (state.phase !== 'lobby') return err('Já começou.');
      if (event.playerId !== state.hostId) return err('Só o host pode começar.');
      const present = state.players.filter((p) => p.present);
      if (present.length < deps.minPlayers) return err(`Precisa de ${deps.minPlayers} jogadores.`);
      const game = deps.game.createInitial({
        config: deps.config,
        players: present.map((p) => ({ id: p.id, nickname: p.nickname })),
        now: deps.now,
        rng: deps.rng,
      });
      const next: RoomState<GS> = { ...state, phase: 'playing', game };
      const out: Outbound[] = [
        { to: 'all', msg: { t: 'room', room: roomView(next, deps.minPlayers) } },
        ...projections(next, deps),
      ];
      return { state: next, outbound: out, deadline: deadlineOf(next, deps) };
    }

    case 'action': {
      if (state.phase !== 'playing' || state.game === null) {
        return { state, outbound: [{ to: event.playerId, msg: { t: 'error', message: 'Sem partida em curso.' } }], deadline: null };
      }
      const action = event.action as A;
      const legal = deps.game.legalActions(state.game, event.playerId);
      if (!action || typeof action.type !== 'string' || !legal.includes(action.type)) {
        return { state, outbound: [{ to: event.playerId, msg: { t: 'error', message: 'Ação inválida.' } }], deadline: deadlineOf(state, deps) };
      }
      const game = deps.game.reducer(state.game, action, { now: deps.now, rng: deps.rng, actorId: event.playerId });
      const next: RoomState<GS> = { ...state, game };
      return { state: next, outbound: projections(next, deps), deadline: deadlineOf(next, deps) };
    }

    case 'timeout': {
      if (state.phase !== 'playing' || state.game === null || !deps.game.onTimeout) {
        return { state, outbound: [], deadline: deadlineOf(state, deps) };
      }
      const game = deps.game.onTimeout(state.game, { now: deps.now, rng: deps.rng });
      const next: RoomState<GS> = { ...state, game };
      return { state: next, outbound: projections(next, deps), deadline: deadlineOf(next, deps) };
    }

    default:
      return { state, outbound: [], deadline: deadlineOf(state, deps) };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/server/roomEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/server/roomEngine.ts src/net/server/roomEngine.test.ts
git commit -m "feat(net): pure room engine (lobby, presence, reconnect, action routing, projections)"
```

---

## Task 7: PartyKit server glue (`server/index.ts`)

Glue fino: traduz lifecycle do PartyKit em `RoomEvent`, chama `reduceRoom`, entrega `outbound`, agenda alarm. **Sem unit test** (precisa do runtime); validado por `partykit dev` + Task 13.

**Files:**
- Create: `src/net/server/index.ts`

- [ ] **Step 1: Write the implementation**

```ts
// src/net/server/index.ts
import type * as Party from 'partykit/server';
import { mulberry32 } from '../rng';
import { promptvoteDemo } from '../__demo__/promptvoteDemo';
import type { DemoState } from '../__demo__/promptvoteDemo';
import type { ClientMsg } from '../protocol';
import { createRoom, reduceRoom } from './roomEngine';
import type { EngineDeps, RoomState } from './roomEngine';

type ConnState = { playerId: string; nickname: string };

const CONFIG = { promptSeconds: 75, voteSeconds: 60 };
const MIN_PLAYERS = 3;

export default class NetRoom implements Party.Server {
  state: RoomState<DemoState>;
  rng: () => number;

  constructor(readonly room: Party.Room) {
    this.state = createRoom(room.id);
    this.rng = mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  }

  private deps(now: number): EngineDeps<DemoState, any, any, any> {
    return { game: promptvoteDemo, config: CONFIG, minPlayers: MIN_PLAYERS, now, rng: this.rng };
  }

  private async apply(event: Parameters<typeof reduceRoom>[1], now = Date.now()) {
    const result = reduceRoom(this.state, event as any, this.deps(now));
    this.state = result.state as RoomState<DemoState>;
    for (const o of result.outbound) {
      const data = JSON.stringify(o.msg);
      if (o.to === 'all') {
        this.room.broadcast(data);
      } else {
        for (const conn of this.room.getConnections<ConnState>()) {
          if (conn.state?.playerId === o.to) conn.send(data);
        }
      }
    }
    if (result.deadline) await this.room.storage.setAlarm(result.deadline);
  }

  onConnect(conn: Party.Connection<ConnState>, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const playerId = url.searchParams.get('playerId') ?? conn.id;
    const nickname = (url.searchParams.get('nickname') ?? 'Anônimo').slice(0, 20);
    conn.setState({ playerId, nickname });
    return this.apply({ kind: 'join', playerId, nickname });
  }

  onMessage(raw: string, sender: Party.Connection<ConnState>) {
    const playerId = sender.state?.playerId;
    if (!playerId) return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw) as ClientMsg;
    } catch {
      return;
    }
    if (msg.t === 'start') return this.apply({ kind: 'start', playerId });
    if (msg.t === 'action') return this.apply({ kind: 'action', playerId, action: msg.action });
  }

  onClose(conn: Party.Connection<ConnState>) {
    const playerId = conn.state?.playerId;
    if (playerId) return this.apply({ kind: 'disconnect', playerId });
  }

  onAlarm() {
    return this.apply({ kind: 'timeout' });
  }
}

NetRoom satisfies Party.Worker;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS. Se `tsc` reclamar de tipos de runtime do Worker no `index.ts`, ver "Known gotchas" no fim do plano (mitigação: tsconfig do party).

- [ ] **Step 3: Smoke test local**

Run: `npx partykit dev` (deixe rodando noutro terminal)
Expected: sobe em `http://localhost:1999` sem erro. `Ctrl-C` pra parar. (Validação funcional completa = Task 12/13.)

- [ ] **Step 4: Commit**

```bash
git add src/net/server/index.ts
git commit -m "feat(net): PartyKit server glue (lifecycle -> roomEngine -> send + alarm)"
```

---

## Task 8: Client identity (`client/identity.ts`)

`playerId` estável por dispositivo (sobrevive reconexão e reload).

**Files:**
- Create: `src/net/client/identity.ts`
- Test: `src/net/client/identity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { getPlayerId } from './identity';

describe('identity', () => {
  beforeEach(() => localStorage.clear());

  it('gera e persiste um playerId estável', () => {
    const first = getPlayerId();
    const second = getPlayerId();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(8);
  });

  it('reusa o valor já salvo no localStorage', () => {
    localStorage.setItem('net.playerId', 'fixo-123');
    expect(getPlayerId()).toBe('fixo-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/client/identity.test.ts`
Expected: FAIL (import não resolve).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/net/client/identity.ts
const KEY = 'net.playerId';

export function getPlayerId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/client/identity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/client/identity.ts src/net/client/identity.test.ts
git commit -m "feat(net): stable client playerId in localStorage"
```

---

## Task 9: useRoom hook (`client/useRoom.ts`)

Hook fino. A lógica de reduzir mensagens do server pra estado do cliente é uma função **pura** (`reduceClientState`) testável; o hook só conecta `usePartySocket` a ela.

**Files:**
- Create: `src/net/client/useRoom.ts`
- Test: `src/net/client/useRoom.test.ts`

- [ ] **Step 1: Write the failing test (a parte pura)**

```ts
import { describe, expect, it } from 'vitest';
import { initialClientState, reduceClientState } from './useRoom';
import type { RoomView } from '../protocol';

const room: RoomView = {
  code: 'WXYZ',
  phase: 'lobby',
  hostId: 'a',
  minPlayers: 3,
  players: [{ id: 'a', nickname: 'Ana', present: true }],
};

describe('reduceClientState', () => {
  it('aplica room snapshot', () => {
    const s = reduceClientState(initialClientState, { t: 'room', room });
    expect(s.room).toEqual(room);
  });

  it('aplica projeção e limpa erro', () => {
    let s = reduceClientState(initialClientState, { t: 'error', message: 'x' });
    expect(s.error).toBe('x');
    s = reduceClientState(s, { t: 'projection', projection: { phase: 'answering' } });
    expect(s.projection).toEqual({ phase: 'answering' });
    expect(s.error).toBeNull();
  });

  it('guarda mensagem de erro', () => {
    const s = reduceClientState(initialClientState, { t: 'error', message: 'Ação inválida.' });
    expect(s.error).toBe('Ação inválida.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/client/useRoom.test.ts`
Expected: FAIL (import não resolve).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/net/client/useRoom.ts
import { useCallback, useReducer } from 'react';
import usePartySocket from 'partysocket/react';
import type { ClientMsg, RoomView, ServerMsg } from '../protocol';

export interface ClientState {
  connected: boolean;
  room: RoomView | null;
  projection: unknown | null;
  error: string | null;
}

export const initialClientState: ClientState = {
  connected: false,
  room: null,
  projection: null,
  error: null,
};

export function reduceClientState(state: ClientState, msg: ServerMsg): ClientState {
  switch (msg.t) {
    case 'room':
      return { ...state, room: msg.room };
    case 'projection':
      return { ...state, projection: msg.projection, error: null };
    case 'error':
      return { ...state, error: msg.message };
    default:
      return state;
  }
}

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999';

export function useRoom(code: string, playerId: string, nickname: string) {
  const [state, dispatch] = useReducer(
    (s: ClientState, a: { type: 'msg'; msg: ServerMsg } | { type: 'open' } | { type: 'close' }) => {
      if (a.type === 'open') return { ...s, connected: true };
      if (a.type === 'close') return { ...s, connected: false };
      return reduceClientState(s, a.msg);
    },
    initialClientState,
  );

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    query: { playerId, nickname },
    onOpen() {
      dispatch({ type: 'open' });
    },
    onMessage(e: MessageEvent) {
      try {
        dispatch({ type: 'msg', msg: JSON.parse(e.data) as ServerMsg });
      } catch {
        /* ignora frame inválido */
      }
    },
    onClose() {
      dispatch({ type: 'close' });
    },
  });

  const send = useCallback(
    (msg: ClientMsg) => socket.send(JSON.stringify(msg)),
    [socket],
  );

  return { state, send };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/client/useRoom.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/client/useRoom.ts src/net/client/useRoom.test.ts
git commit -m "feat(net): useRoom hook + pure client-state reducer"
```

---

## Task 10: Lobby UI (`ui/LobbyScreens.tsx`)

Telas genéricas (não conhecem o jogo). Tokens de `docs/visual-tokens.md` — **nunca** cor crua.

**Files:**
- Create: `src/net/ui/LobbyScreens.tsx`
- Test: `src/net/ui/LobbyScreens.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrJoin, Lobby } from './LobbyScreens';
import type { RoomView } from '../protocol';

describe('CreateOrJoin', () => {
  it('cria sala com apelido e dispara onEnter com um código gerado', async () => {
    const onEnter = vi.fn();
    render(<CreateOrJoin onEnter={onEnter} />);
    await userEvent.type(screen.getByLabelText(/apelido/i), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: /criar sala/i }));
    expect(onEnter).toHaveBeenCalledTimes(1);
    const [code, nickname] = onEnter.mock.calls[0];
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(nickname).toBe('Ana');
  });

  it('entra em sala existente com código + apelido', async () => {
    const onEnter = vi.fn();
    render(<CreateOrJoin onEnter={onEnter} />);
    await userEvent.type(screen.getByLabelText(/apelido/i), 'Bia');
    await userEvent.type(screen.getByLabelText(/código/i), 'wxyz');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(onEnter).toHaveBeenCalledWith('WXYZ', 'Bia');
  });
});

describe('Lobby', () => {
  const base: RoomView = {
    code: 'WXYZ',
    phase: 'lobby',
    hostId: 'a',
    minPlayers: 3,
    players: [
      { id: 'a', nickname: 'Ana', present: true },
      { id: 'b', nickname: 'Bia', present: true },
    ],
  };

  it('lista jogadores e mostra o código', () => {
    render(<Lobby room={base} me="b" onStart={vi.fn()} />);
    expect(screen.getByText('WXYZ')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
  });

  it('host vê Começar desabilitado abaixo do mínimo', () => {
    render(<Lobby room={base} me="a" onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });

  it('host com jogadores suficientes consegue começar', async () => {
    const onStart = vi.fn();
    const room = { ...base, players: [...base.players, { id: 'c', nickname: 'Cau', present: true }] };
    render(<Lobby room={room} me="a" onStart={onStart} />);
    const btn = screen.getByRole('button', { name: /começar/i });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onStart).toHaveBeenCalled();
  });

  it('não-host não vê o botão Começar', () => {
    render(<Lobby room={base} me="b" onStart={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /começar/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/ui/LobbyScreens.test.tsx`
Expected: FAIL (import não resolve).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/net/ui/LobbyScreens.tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/ui/LobbyScreens.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/ui/LobbyScreens.tsx src/net/ui/LobbyScreens.test.tsx
git commit -m "feat(net): generic lobby UI (create/join + lobby)"
```

---

## Task 11: Demo game view (`__demo__/DemoGameView.tsx`)

Renderiza a `DemoProjection`. Consome a projeção via `import type` (não puxa a lógica pro bundle).

**Files:**
- Create: `src/net/__demo__/DemoGameView.tsx`
- Test: `src/net/__demo__/DemoGameView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoGameView } from './DemoGameView';
import type { DemoProjection } from './promptvoteDemo';

describe('DemoGameView', () => {
  it('answering: mostra prompt e envia resposta', async () => {
    const send = vi.fn();
    const proj: DemoProjection = {
      phase: 'answering',
      prompt: 'Um nome ruim pra banda',
      yourAnswer: null,
      submitted: 1,
      total: 3,
      endsAt: Date.now() + 60000,
    };
    render(<DemoGameView projection={proj} onAction={send} />);
    expect(screen.getByText(/nome ruim pra banda/i)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'Os Bug Sujos');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(send).toHaveBeenCalledWith({ type: 'SUBMIT_ANSWER', text: 'Os Bug Sujos' });
  });

  it('answering: depois de responder mostra estado de espera', () => {
    const proj: DemoProjection = {
      phase: 'answering',
      prompt: 'p',
      yourAnswer: 'já respondi',
      submitted: 2,
      total: 3,
      endsAt: Date.now() + 60000,
    };
    render(<DemoGameView projection={proj} onAction={vi.fn()} />);
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument();
  });

  it('voting: lista opções e vota', async () => {
    const send = vi.fn();
    const proj: DemoProjection = {
      phase: 'voting',
      prompt: 'p',
      options: [
        { optionId: 'o0', text: 'resposta um' },
        { optionId: 'o1', text: 'resposta dois' },
      ],
      yourVote: null,
      voted: 0,
      total: 3,
      endsAt: Date.now() + 60000,
    };
    render(<DemoGameView projection={proj} onAction={send} />);
    await userEvent.click(screen.getByRole('button', { name: /resposta dois/i }));
    expect(send).toHaveBeenCalledWith({ type: 'SUBMIT_VOTE', optionId: 'o1' });
  });

  it('reveal: mostra resultados e placar', () => {
    const proj: DemoProjection = {
      phase: 'reveal',
      prompt: 'p',
      results: [{ nickname: 'Ana', text: 'venceu', votes: 2 }],
      scores: [{ nickname: 'Ana', score: 2 }],
    };
    render(<DemoGameView projection={proj} onAction={vi.fn()} />);
    expect(screen.getByText('venceu')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/net/__demo__/DemoGameView.test.tsx`
Expected: FAIL (import não resolve).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/net/__demo__/DemoGameView.tsx
import { useState } from 'react';
import type { DemoAction, DemoProjection } from './promptvoteDemo';

export function DemoGameView({
  projection,
  onAction,
}: {
  projection: DemoProjection;
  onAction: (a: DemoAction) => void;
}) {
  if (projection.phase === 'answering') return <Answering p={projection} onAction={onAction} />;
  if (projection.phase === 'voting') return <Voting p={projection} onAction={onAction} />;
  return <Reveal p={projection} />;
}

function Answering({
  p,
  onAction,
}: {
  p: Extract<DemoProjection, { phase: 'answering' }>;
  onAction: (a: DemoAction) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <p className="text-xl font-bold text-ink">{p.prompt}</p>
      </div>
      {p.yourAnswer === null ? (
        <>
          <textarea
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40"
            disabled={!text.trim()}
            onClick={() => onAction({ type: 'SUBMIT_ANSWER', text: text.trim() })}
          >
            Enviar
          </button>
        </>
      ) : (
        <p className="text-center text-muted">
          Resposta enviada. Esperando os outros… {p.submitted}/{p.total}
        </p>
      )}
    </div>
  );
}

function Voting({
  p,
  onAction,
}: {
  p: Extract<DemoProjection, { phase: 'voting' }>;
  onAction: (a: DemoAction) => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 animate-screen-in">
      <p className="text-center text-lg font-semibold text-muted">{p.prompt}</p>
      {p.yourVote === null ? (
        p.options.map((o) => (
          <button
            key={o.optionId}
            className="rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95"
            onClick={() => onAction({ type: 'SUBMIT_VOTE', optionId: o.optionId })}
          >
            {o.text}
          </button>
        ))
      ) : (
        <p className="text-center text-muted">Voto registrado. {p.voted}/{p.total}</p>
      )}
    </div>
  );
}

function Reveal({ p }: { p: Extract<DemoProjection, { phase: 'reveal' }> }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <h2 className="text-2xl font-extrabold text-ink">Resultado</h2>
      <ul className="flex flex-col gap-2">
        {p.results.map((r, i) => (
          <li key={i} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-ink">{r.text}</span>
            <span className="text-muted">{r.nickname} · {r.votes} voto(s)</span>
          </li>
        ))}
      </ul>
      <div className="my-1 h-px bg-line" />
      <h3 className="text-lg font-bold text-muted">Placar</h3>
      <ul className="flex flex-col gap-1">
        {p.scores.map((s, i) => (
          <li key={i} className="flex justify-between text-ink">
            <span>{s.nickname}</span>
            <span className="font-bold text-accent">{s.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/net/__demo__/DemoGameView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/__demo__/DemoGameView.tsx src/net/__demo__/DemoGameView.test.tsx
git commit -m "feat(net): demo game view (answering/voting/reveal)"
```

---

## Task 12: Compose demo app + entry (`NetDemoApp.tsx`, `demo-entry.tsx`)

Junta tudo. Sem teste unitário (orquestração); validado por `vite dev` + Task 13.

**Files:**
- Create: `src/net/NetDemoApp.tsx`
- Create: `src/net/demo-entry.tsx`

- [ ] **Step 1: Write `src/net/NetDemoApp.tsx`**

```tsx
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
  if (state.error) {
    // erro não-bloqueante; aparece como faixa
  }
  if (state.room.phase === 'lobby') {
    return (
      <>
        {state.error && <p className="bg-bad-soft p-2 text-center text-bad-text">{state.error}</p>}
        <Lobby room={state.room} me={playerId} onStart={() => send({ t: 'start' })} />
      </>
    );
  }
  // playing
  return (
    <>
      {state.error && <p className="bg-bad-soft p-2 text-center text-bad-text">{state.error}</p>}
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
```

- [ ] **Step 2: Write `src/net/demo-entry.tsx`**

```tsx
// src/net/demo-entry.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css'; // tokens (somente importado, nunca editado)
import { NetDemoApp } from './NetDemoApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-dvh bg-bg text-ink">
      <NetDemoApp />
    </div>
  </StrictMode>,
);
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc -b && npm run test:run`
Expected: PASS (tsc sem erro; toda a suíte verde — baseline 84 + os novos testes de `src/net`).

- [ ] **Step 4: Manual smoke (local, 2 abas)**

Em terminais separados, dentro do worktree:
```bash
npx partykit dev
```
```bash
npx vite --host
```
Abra `http://localhost:5173/net-demo.html` em 2–3 abas. Crie sala numa, entre com o código nas outras, dê Start (host), responda, vote, veja o reveal.
Expected: cada aba vê só a própria resposta na fase de answering; voto na própria é impossível; reveal mostra placar.

- [ ] **Step 5: Commit**

```bash
git add src/net/NetDemoApp.tsx src/net/demo-entry.tsx
git commit -m "feat(net): compose playable demo (lobby + promptvote) on standalone entry"
```

---

## Task 13: Deploy + teste em 2 celulares (manual)

**Files:** nenhum (operacional). Cria `.env.local` (gitignored).

- [ ] **Step 1: Login no PartyKit (interativo — Gabs roda)**

Peça ao Gabs rodar na sessão dele (`!` prefix): `npx partykit login`
(login do Cloudflare é interativo; não dá pra automatizar daqui).

- [ ] **Step 2: Deploy**

Run: `npx partykit deploy`
Expected: imprime a URL `games-app-net.<usuario>.partykit.dev`.

- [ ] **Step 3: Apontar o cliente pro host deployado**

Crie `.env.local` no worktree (confirme que `.env.local` está no `.gitignore`; se não estiver, **não** edite o `.gitignore` — avise o Gabs):
```
VITE_PARTYKIT_HOST=games-app-net.<usuario>.partykit.dev
```

- [ ] **Step 4: Servir o app no wifi local**

Run: `npx vite --host`
Expected: imprime uma URL de rede (ex.: `http://192.168.x.x:5173/`). Abra `…:5173/net-demo.html` em 1 Android + 1 iPhone na mesma rede.

- [ ] **Step 5: Roteiro de validação**

- [ ] Android cria sala → vê código.
- [ ] iPhone entra com o código → ambos aparecem no lobby com presença.
- [ ] (precisa de 3) abra uma 3ª aba/dispositivo pra atingir o mínimo; host dá Start.
- [ ] Cada device vê só a própria resposta na fase answering.
- [ ] Ninguém consegue votar na própria resposta.
- [ ] **Reconexão:** no iPhone, bloqueie a tela ~30s durante a partida, desbloqueie → o app reconecta e mostra a projeção atual (não trava).
- [ ] Reveal aparece igual nos dois.

- [ ] **Step 6: Commit (sem `.env.local`)**

Nada a commitar de código aqui. Se ajustes forem necessários, voltar às tasks anteriores.

---

## Task 14: Publicar contrato + atualizar status-chats

**Files:**
- Modify: `docs/status-chats.md` (somente a seção "Chat Backend")

- [ ] **Step 1: Atualizar a seção "Chat Backend — Multiplayer / Netcode"**

Edite **apenas** essa seção, registrando:
- Transporte decidido: **PartyKit** (Durable Object por sala; `partykit.json` + deps `partysocket`/`partykit`).
- O que a PoC cobre: lobby genérico + presença + reconexão + sincronização com projeção secreta, provada pelo demo promptvote jogável em 2 celulares.
- **Contrato de integração `NetGame`** que as engines vão implementar pra rodar em rede (copie a interface de `src/net/contract.ts`), e a nota: a Engine 3 (promptvote/Quiplash) será embrulhada por um adaptador em `src/net/adapters/quiplash.ts` — o Chat Backend **não** edita `src/games/promptvote/**`.
- Ponto de integração na home (`App.tsx`): hoje o demo roda em entry próprio (`net-demo.html`); wiring na home é trabalho futuro do Chat A.
- Nota de deps: adicionei `partysocket` (dep) e `partykit` (devDep) ao `package.json` — heads-up de merge.

- [ ] **Step 2: Verificar suíte + build**

Run: `npx tsc -b && npm run test:run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/status-chats.md
git commit -m "docs(net): publish NetGame contract + multiplayer status for coordination"
```

---

## Self-Review (preenchido pelo autor do plano)

**1. Spec coverage:**
- §2 Transporte PartyKit → Tasks 0, 7, 13. ✅
- §4 Componentes (server/useRoom/identity/lobby/contract/demo/entry) → Tasks 3–12. ✅
- §5 Contrato `NetGame` → Task 3 (refinado: `rng` em vez de `seed` cru; `now` em InitCtx; `deadline`/`onTimeout` adicionados pro timer genérico). ✅
- §6 Determinismo `rng`/`now` → Tasks 1, 7 (server dono do rng/now), exercitado no demo. ✅
- §7 Sala/lobby/identidade (código 4 letras, host=flag, anônimo) → Tasks 2, 8, 10, roomEngine. ✅
- §8 Presença/reconexão/host sai/entrar tarde/ação inválida → Task 6 (roomEngine) + Task 7. ✅
- §9 Demo promptvote (3–8, timer folga 75s autoritativo, projeção secreta) → Tasks 4, 5. ✅
- §10 Cross-platform (Android/iOS) → Task 13 roteiro (inclui reconexão iOS). ✅
- §11 Testes (unit puro + 2 clientes simulados + manual) → Tasks 1–11 (unit), Task 6 (simulados via roomEngine), Task 13 (manual). ✅
- §12 Fronteiras/coordenação → Task 14 + nota de fronteiras no header. ✅
- §13 Rodar 2 celulares → Task 13. ✅
- §14 Generalização (Quiplash adapter, Spyfall) → Task 14 publica contrato; Spyfall fora de escopo (próximo ciclo). ✅

**2. Placeholder scan:** sem TBD/TODO; todo passo de código tem código real; comandos com expected output. ✅

**3. Type consistency:** `NetGame`/`InitCtx`/`ActionCtx`/`TimerCtx` (contract.ts) usados igual em promptvoteDemo e roomEngine; `RoomView`/`ServerMsg`/`ClientMsg` (protocol.ts) consistentes em roomEngine, useRoom, server/index, LobbyScreens; `DemoProjection`/`DemoAction` consistentes em DemoGameView e NetDemoApp. `reduceRoom`/`createRoom`/`EngineDeps`/`Outbound`/`RoomState` batem entre roomEngine e index/testes. ✅

---

## Known gotchas (ler antes de executar)

- **`tsc -b` e o server do Worker:** `src/net/server/index.ts` importa `partykit/server` e roda no runtime do Cloudflare (sem DOM). O código foi escrito DOM-lib-compatível (só `JSON`, `Date.now`, `URL`, `crypto.randomUUID`, `Response`-free). Se o `tsc -b` do app reclamar de tipos de runtime, a mitigação correta é dar ao party um tsconfig próprio (ou excluir `src/net/server/index.ts` do `tsconfig.app.json`). **`tsconfig*` não é território do Chat A** (eles têm `vite.config.ts`), mas confirme no `status-chats.md` antes de editar tsconfig compartilhado; se preferir não mexer, o `npx partykit dev/deploy` faz o próprio typecheck/bundle do server independente do `tsc -b`.
- **`vite build` e o `net-demo.html`:** a PoC roda via `vite dev --host` (não precisa entrar no build de produção). **Não** adicione `net-demo.html` ao `rollupOptions.input` (isso é `vite.config.ts` = Chat A). Hospedar de verdade = integração futura.
- **Colisão de código de sala:** 24⁴ ≈ 331k combinações, sem coordenação central. Aceitável pra PoC; se virar produto, o server pode rejeitar entrar numa sala cujo host ainda não conectou.
- **`crypto.randomUUID` em http origin:** disponível em `localhost` e em https. No teste de celular via IP `http://192.168.x.x`, alguns browsers restringem `crypto` a secure contexts — o `getPlayerId()` já tem fallback não-cripto, então funciona.
- **Estado em memória:** se a sala hibernar/reiniciar no meio da partida, o `rng`/estado se perdem (sem persistência). Aceitável pra PoC (conexões ativas mantêm a sala viva); persistência via `room.storage` é trabalho futuro.
