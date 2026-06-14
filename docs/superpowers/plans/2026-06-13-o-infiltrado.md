# O Infiltrado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "O Infiltrado" — a multi-device, same-room impostor party game where everyone answers a question except the impostor(s), who answer a similar-but-different one — running on the existing `src/net/` PartyKit layer.

**Architecture:** The game is a pure `NetGame<State, Action, Projection, Config>` (authority owns `now`/`rng`; clients render `project(state, playerId)`). All rules live in `logic.ts`; per-player secrecy (the impostor's different question) is the server-side projection. A small additive change to `src/net/` lets a room run this game (registry + `gameId` on connect) and lets the host pick 1–2 impostors (config on `start`). Phase advances are tap-to-advance by anyone (no host concept inside the game); only the lobby Start stays host-gated by the room engine.

**Tech Stack:** Vite + React + TypeScript + Tailwind v4 + Vitest; PartyKit (`partysocket`/`partykit`) already wired in `src/net/`.

---

## File Structure

**New (game — owned territory `src/games/impostor/infiltrado/**`):**
- `src/games/impostor/infiltrado/types.ts` — State, Action, Projection, Config, QuestionPair, Seat
- `src/games/impostor/infiltrado/data/decks/infiltrado-padrao.json` — question pairs
- `src/games/impostor/infiltrado/data/decks/index.ts` — deck loader + validation
- `src/games/impostor/infiltrado/logic.ts` — the `NetGame` impl (all rules)
- `src/games/impostor/infiltrado/logic.test.ts` — unit tests
- `src/games/impostor/infiltrado/screens/GameView.tsx` — phase dispatcher + the 6 phase screens
- `src/games/impostor/infiltrado/InfiltradoApp.tsx` — lobby + `useRoom` + GameView
- `infiltrado.html` — dev entry page (served by vite like `net-demo.html`)
- `src/net/infiltrado-entry.tsx` — entry mount

**Modified (net — coordinated territory `src/net/**`, register in status-chats):**
- `src/net/server/registry.ts` — **new** `gameId → { game, config, minPlayers }`
- `src/net/server/index.ts` — resolve game from `gameId` query; forward `start` config
- `src/net/server/index.test.ts` — **new** (registry resolution)
- `src/net/protocol.ts` — `start` carries optional `config`
- `src/net/server/roomEngine.ts` — `start` event carries optional `config`, merged into `createInitial`
- `src/net/client/useRoom.ts` — accept `gameId`, include in connect query
- `src/net/ui/LobbyScreens.tsx` — optional `extra` slot for host-only config controls
- `src/games/impostor/infiltrado/integration.test.ts` — **new** full room-loop secrecy test

---

## Conventions for all tasks

- Run tests from the worktree root: `npm run test:run -- <path>` (single file) or `npm run test:run` (all).
- Import paths from the game folder: contract = `../../../net/contract`, rng = `../../../net/rng`.
- Tests **derive the impostor from `state.currentImpostors`** — never hardcode which player is impostor (it's rng-assigned). This keeps tests robust.
- Tailwind: use only tokens from `docs/visual-tokens.md` (`bg-surface`, `text-ink`, `text-muted`, `bg-accent`, `text-bg`, `border-line`, `bg-good`, `bg-bad`, `bg-bad-soft`, `text-bad-text`, `text-good-text`).
- Commit after each task. `.claude/worktrees/**` is excluded from Vitest already (see `vite.config.ts`).

---

### Task 1: Types

**Files:**
- Create: `src/games/impostor/infiltrado/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// src/games/impostor/infiltrado/types.ts
import type { PlayerId } from '../../../net/contract';

export type Phase = 'answering' | 'reveal' | 'voting' | 'escape' | 'roundEnd' | 'matchEnd';

export interface QuestionPair { id: string; tema: string; normal: string; impostor: string; }

export interface InfiltradoConfig {
  impostorCount: 1 | 2; // 2 exige >= 6 jogadores (gate na UI do lobby)
  rounds: number;       // 0 = auto (= nº de jogadores)
  answerSeconds: number;
  voteSeconds: number;
}

export interface Seat { id: PlayerId; nickname: string; }

export interface InfiltradoState {
  phase: Phase;
  config: InfiltradoConfig;
  players: Seat[];
  totalRounds: number;
  roundIndex: number;                 // 0-based
  impostorSchedule: PlayerId[][];     // impostores de cada rodada (sorteado no init)
  currentImpostors: PlayerId[];
  pairs: QuestionPair[];              // baralho embaralhado no init
  pair: QuestionPair;                 // par da rodada atual
  endsAt: number | null;             // deadline autoritativo da fase (answering/voting)
  answers: Record<PlayerId, string>;
  revealOrder: PlayerId[];           // ordem embaralhada de exibição na revelação
  votes: Record<PlayerId, PlayerId>; // votante -> suspeito
  accusedId: PlayerId | null;        // mais votado (resolvido ao sair de voting)
  escapeGuess: string | null;
  escapeVotes: Record<PlayerId, boolean>; // não-acusados decidem sim/não
  roundOutcome: 'group' | 'impostor' | null;
  scores: Record<PlayerId, number>;
}

export type InfiltradoAction =
  | { type: 'SUBMIT_ANSWER'; text: string }
  | { type: 'ADVANCE' } // qualquer um: reveal -> voting, roundEnd -> próxima/matchEnd
  | { type: 'SUBMIT_VOTE'; suspectId: PlayerId }
  | { type: 'SUBMIT_ESCAPE_GUESS'; text: string }  // só o acusado
  | { type: 'SUBMIT_ESCAPE_VOTE'; ok: boolean };    // os demais

export type InfiltradoProjection =
  | { phase: 'answering'; tema: string; yourQuestion: string; yourAnswer: string | null;
      submitted: number; total: number; endsAt: number; round: number; totalRounds: number }
  | { phase: 'reveal'; answers: { id: PlayerId; nickname: string; answer: string }[] }
  | { phase: 'voting'; candidates: Seat[]; yourVote: PlayerId | null;
      voted: number; total: number; endsAt: number }
  | { phase: 'escape'; role: 'guessing'; accusedNickname: string }
  | { phase: 'escape'; role: 'judging'; accusedNickname: string; originalQuestion: string;
      guess: string | null; youVoted: boolean; votes: number; total: number }
  | { phase: 'roundEnd'; impostors: string[]; accusedNickname: string | null;
      escapeGuess: string | null; outcome: 'group' | 'impostor';
      scores: { nickname: string; score: number }[]; hasNextRound: boolean }
  | { phase: 'matchEnd'; finalScores: { nickname: string; score: number }[] };
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors (file is types-only; consumed later).

- [ ] **Step 3: Commit**

```bash
git add src/games/impostor/infiltrado/types.ts
git commit -m "feat(infiltrado): tipos do NetGame (state/action/projection)"
```

---

### Task 2: Question-pair deck + loader

**Files:**
- Create: `src/games/impostor/infiltrado/data/decks/infiltrado-padrao.json`
- Create: `src/games/impostor/infiltrado/data/decks/index.ts`
- Test: `src/games/impostor/infiltrado/data/decks/index.test.ts`

- [ ] **Step 1: Write the deck JSON**

```json
{
  "id": "infiltrado-padrao",
  "name": "Padrão",
  "pairs": [
    { "id": "p1", "tema": "Comida", "normal": "Qual comida você comeria todo dia?", "impostor": "Qual comida você acha mais cara?" },
    { "id": "p2", "tema": "Viagem", "normal": "Um lugar que você quer muito visitar?", "impostor": "Um lugar que você nunca visitaria?" },
    { "id": "p3", "tema": "Manhã", "normal": "Algo que você faz toda manhã?", "impostor": "Algo que você quase nunca faz de manhã?" },
    { "id": "p4", "tema": "Bicho", "normal": "Um animal que daria um bom animal de estimação?", "impostor": "Um animal que você tem medo?" },
    { "id": "p5", "tema": "Filme", "normal": "Um filme que você assistiria de novo?", "impostor": "Um filme que você dormiu no meio?" },
    { "id": "p6", "tema": "Festa", "normal": "O que não pode faltar numa festa boa?", "impostor": "O que estraga uma festa pra você?" },
    { "id": "p7", "tema": "Trabalho", "normal": "Um emprego dos sonhos?", "impostor": "Um emprego que você jamais faria?" },
    { "id": "p8", "tema": "Compras", "normal": "Algo que vale a pena gastar dinheiro?", "impostor": "Algo que você acha desperdício de dinheiro?" },
    { "id": "p9", "tema": "Música", "normal": "Uma música pra animar o dia?", "impostor": "Uma música que te dá vergonha alheia?" },
    { "id": "p10", "tema": "Final de semana", "normal": "Um programa perfeito de domingo?", "impostor": "Um programa de domingo que você odeia?" }
  ]
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/games/impostor/infiltrado/data/decks/index.test.ts
import { describe, expect, it } from 'vitest';
import { INFILTRADO_DECKS, getInfiltradoDeck, validateDeck } from './index';

describe('infiltrado decks', () => {
  it('o deck padrão carrega e tem pares bem-formados', () => {
    const deck = getInfiltradoDeck('infiltrado-padrao');
    expect(deck).toBeDefined();
    expect(deck!.pairs.length).toBeGreaterThanOrEqual(8);
    for (const p of deck!.pairs) {
      expect(p.id).toBeTruthy();
      expect(p.normal).toBeTruthy();
      expect(p.impostor).toBeTruthy();
      expect(p.normal).not.toBe(p.impostor);
    }
  });

  it('validateDeck rejeita estrutura inválida', () => {
    expect(() => validateDeck({ id: 'x', name: 'x', pairs: [{ id: '1' }] })).toThrow();
    expect(() => validateDeck(null)).toThrow();
  });

  it('expõe ao menos um deck', () => {
    expect(INFILTRADO_DECKS.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- src/games/impostor/infiltrado/data/decks/index.test.ts`
Expected: FAIL (cannot find `./index`).

- [ ] **Step 4: Write the loader**

```ts
// src/games/impostor/infiltrado/data/decks/index.ts
import padrao from './infiltrado-padrao.json';
import type { QuestionPair } from '../../types';

export interface InfiltradoDeck { id: string; name: string; pairs: QuestionPair[]; }

export function validateDeck(data: unknown): InfiltradoDeck {
  if (typeof data !== 'object' || data === null) throw new Error('deck inválido');
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.pairs)) {
    throw new Error('deck: campos id/name/pairs ausentes');
  }
  d.pairs.forEach((p, i) => {
    const pair = p as Record<string, unknown>;
    if (typeof pair.id !== 'string' || typeof pair.tema !== 'string' ||
        typeof pair.normal !== 'string' || typeof pair.impostor !== 'string') {
      throw new Error(`par ${i} inválido`);
    }
  });
  return data as InfiltradoDeck;
}

export const INFILTRADO_DECKS: InfiltradoDeck[] = [validateDeck(padrao)];

export function getInfiltradoDeck(id: string): InfiltradoDeck | undefined {
  return INFILTRADO_DECKS.find((d) => d.id === id);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- src/games/impostor/infiltrado/data/decks/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/games/impostor/infiltrado/data/decks/
git commit -m "feat(infiltrado): baralho de pares de perguntas + loader"
```

---

### Task 3: `logic.ts` — `createInitial` (setup + hidden roles)

**Files:**
- Create: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/impostor/infiltrado/logic.test.ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../net/rng';
import { infiltrado as G } from './logic';
import type { InfiltradoConfig, InfiltradoState } from './types';

const players = [
  { id: 'a', nickname: 'Ana' }, { id: 'b', nickname: 'Bia' }, { id: 'c', nickname: 'Cau' },
  { id: 'd', nickname: 'Dan' },
];

const cfg = (over: Partial<InfiltradoConfig> = {}): InfiltradoConfig =>
  ({ impostorCount: 1, rounds: 0, answerSeconds: 90, voteSeconds: 60, ...over });

function init(over: Partial<InfiltradoConfig> = {}, now = 1000, seed = 1): InfiltradoState {
  return G.createInitial({ config: cfg(over), players, now, rng: mulberry32(seed) });
}
const ctx = (actorId: string, now = 2000, seed = 7) => ({ now, rng: mulberry32(seed), actorId });

describe('createInitial', () => {
  it('começa em answering, scores zerados, endsAt carimbado', () => {
    const s = init({}, 1000);
    expect(s.phase).toBe('answering');
    expect(s.endsAt).toBe(1000 + 90 * 1000);
    expect(s.scores).toEqual({ a: 0, b: 0, c: 0, d: 0 });
    expect(s.roundIndex).toBe(0);
  });

  it('totalRounds = nº de jogadores quando rounds=0', () => {
    expect(init({ rounds: 0 }).totalRounds).toBe(4);
    expect(init({ rounds: 2 }).totalRounds).toBe(2);
  });

  it('escolhe 1 impostor por padrão, dentro dos jogadores', () => {
    const s = init();
    expect(s.currentImpostors).toHaveLength(1);
    expect(players.map((p) => p.id)).toContain(s.currentImpostors[0]);
  });

  it('impostorSchedule tem totalRounds entradas', () => {
    const s = init({ rounds: 0 });
    expect(s.impostorSchedule).toHaveLength(4);
    s.impostorSchedule.forEach((r) => expect(r).toHaveLength(1));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL (cannot find `./logic`).

- [ ] **Step 3: Write `logic.ts` with `createInitial` (+ helpers, stubs for the rest)**

```ts
// src/games/impostor/infiltrado/logic.ts
import type { ActionCtx, InitCtx, NetGame, PlayerId, TimerCtx } from '../../../net/contract';
import { shuffle } from '../../../net/rng';
import { INFILTRADO_DECKS } from './data/decks';
import type { InfiltradoAction, InfiltradoConfig, InfiltradoProjection, InfiltradoState, Seat } from './types';

function buildSchedule(ids: PlayerId[], rounds: number, impostorCount: number, rng: () => number): PlayerId[][] {
  const order = shuffle(ids, rng);
  const schedule: PlayerId[][] = [];
  let idx = 0;
  for (let r = 0; r < rounds; r++) {
    const picks: PlayerId[] = [];
    while (picks.length < impostorCount && picks.length < ids.length) {
      const cand = order[idx % order.length];
      idx++;
      if (!picks.includes(cand)) picks.push(cand);
    }
    schedule.push(picks);
  }
  return schedule;
}

function startRound(base: InfiltradoState, roundIndex: number, now: number, rng: () => number): InfiltradoState {
  return {
    ...base,
    phase: 'answering',
    roundIndex,
    currentImpostors: base.impostorSchedule[roundIndex],
    pair: base.pairs[roundIndex % base.pairs.length],
    endsAt: now + base.config.answerSeconds * 1000,
    answers: {},
    revealOrder: [],
    votes: {},
    accusedId: null,
    escapeGuess: null,
    escapeVotes: {},
    roundOutcome: null,
  };
}

export const infiltrado: NetGame<InfiltradoState, InfiltradoAction, InfiltradoProjection, InfiltradoConfig> = {
  createInitial({ config, players, now, rng }: InitCtx<InfiltradoConfig>): InfiltradoState {
    const ids = players.map((p) => p.id);
    const totalRounds = config.rounds > 0 ? config.rounds : players.length;
    const impostorSchedule = buildSchedule(ids, totalRounds, config.impostorCount, rng);
    const pairs = shuffle(INFILTRADO_DECKS[0].pairs, rng);
    const base: InfiltradoState = {
      phase: 'answering', config, players: players as Seat[], totalRounds, roundIndex: 0,
      impostorSchedule, currentImpostors: [], pairs, pair: pairs[0], endsAt: null,
      answers: {}, revealOrder: [], votes: {}, accusedId: null, escapeGuess: null,
      escapeVotes: {}, roundOutcome: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
    };
    return startRound(base, 0, now, rng);
  },

  reducer(state: InfiltradoState, _action: InfiltradoAction, _ctx: ActionCtx): InfiltradoState {
    return state; // preenchido nas Tasks 4–8
  },

  project(state: InfiltradoState, _playerId: PlayerId): InfiltradoProjection {
    return { phase: 'matchEnd', finalScores: [] } as InfiltradoProjection; // Task 5+
  },

  legalActions(_state: InfiltradoState, _playerId: PlayerId): InfiltradoAction['type'][] {
    return []; // Task 10
  },

  deadline(state: InfiltradoState): number | null {
    return state.phase === 'answering' || state.phase === 'voting' ? state.endsAt : null;
  },

  onTimeout(state: InfiltradoState, _ctx: TimerCtx): InfiltradoState {
    return state; // Task 9
  },
};

// helpers exportados pra reuso interno nas próximas tasks
export { startRound };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/logic.ts src/games/impostor/infiltrado/logic.test.ts
git commit -m "feat(infiltrado): createInitial — setup, papéis ocultos, schedule"
```

---

### Task 4: `project` answering (secrecy) + `SUBMIT_ANSWER` → reveal

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add the failing tests**

```ts
describe('answering — projeção secreta + envio', () => {
  it('impostor vê a pergunta impostora; os outros, a normal; ninguém sabe o papel', () => {
    const s = init();
    const imp = s.currentImpostors[0];
    const other = players.find((p) => p.id !== imp)!.id;
    const pi = G.project(s, imp);
    const po = G.project(s, other);
    expect(pi.phase === 'answering' && pi.yourQuestion).toBe(s.pair.impostor);
    expect(po.phase === 'answering' && po.yourQuestion).toBe(s.pair.normal);
    // nenhuma projeção revela o papel
    expect(JSON.stringify(pi)).not.toMatch(/impostor.*true|isImpostor|role/i);
    expect(JSON.stringify(po)).not.toContain(s.pair.impostor);
  });

  it('SUBMIT_ANSWER grava resposta; projeção não vaza resposta alheia', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segredo da Ana' }, ctx('a'));
    expect(s.answers.a).toBe('segredo da Ana');
    const pb = G.project(s, 'b');
    expect(JSON.stringify(pb)).not.toContain('segredo da Ana');
    expect(pb).toMatchObject({ phase: 'answering', yourAnswer: null, submitted: 1, total: 4 });
  });

  it('quando todos respondem, vai pra reveal com revealOrder cobrindo todos', () => {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    expect(s.phase).toBe('reveal');
    expect([...s.revealOrder].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(s.endsAt).toBeNull();
  });

  it('ignora resposta vazia e duplicada', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: '   ' }, ctx('a'));
    expect(s.answers.a).toBeUndefined();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'primeira' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segunda' }, ctx('a'));
    expect(s.answers.a).toBe('primeira');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL (project returns matchEnd; reducer is a no-op).

- [ ] **Step 3: Implement answering in `reducer` + `project`**

In `logic.ts`, add a `toReveal` helper above the `infiltrado` object:

```ts
function allAnswered(s: InfiltradoState): boolean {
  return s.players.every((p) => s.answers[p.id] !== undefined);
}

function toReveal(s: InfiltradoState, rng: () => number): InfiltradoState {
  return { ...s, phase: 'reveal', endsAt: null, revealOrder: shuffle(s.players.map((p) => p.id), rng) };
}

function nick(s: InfiltradoState, id: PlayerId): string {
  return s.players.find((p) => p.id === id)?.nickname ?? '???';
}
```

Replace the `reducer` body with (answering branch only for now; keep returning `state` for unknown):

```ts
  reducer(state, action, ctx) {
    switch (action.type) {
      case 'SUBMIT_ANSWER': {
        if (state.phase !== 'answering') return state;
        if (state.answers[ctx.actorId] !== undefined) return state;
        const text = action.text.trim();
        if (!text) return state;
        const next = { ...state, answers: { ...state.answers, [ctx.actorId]: text } };
        return allAnswered(next) ? toReveal(next, ctx.rng) : next;
      }
      default:
        return state;
    }
  },
```

Replace `project` body with the answering branch (others fall through for now):

```ts
  project(state, playerId) {
    if (state.phase === 'answering') {
      const isImp = state.currentImpostors.includes(playerId);
      return {
        phase: 'answering',
        tema: state.pair.tema,
        yourQuestion: isImp ? state.pair.impostor : state.pair.normal,
        yourAnswer: state.answers[playerId] ?? null,
        submitted: Object.keys(state.answers).length,
        total: state.players.length,
        endsAt: state.endsAt ?? 0,
        round: state.roundIndex + 1,
        totalRounds: state.totalRounds,
      };
    }
    return { phase: 'matchEnd', finalScores: [] };
  },
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): answering — projeção secreta + transição pra reveal"
```

---

### Task 5: `project` reveal + `ADVANCE` reveal→voting + `project` voting

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('reveal -> voting', () => {
  function reachReveal() {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `resp-${p.id}` }, ctx(p.id));
    return s;
  }

  it('reveal mostra todas as respostas com nome, na revealOrder', () => {
    const s = reachReveal();
    const p = G.project(s, 'a');
    expect(p.phase).toBe('reveal');
    if (p.phase !== 'reveal') return;
    expect(p.answers).toHaveLength(4);
    expect(p.answers.map((a) => a.id)).toEqual(s.revealOrder);
    expect(p.answers.find((a) => a.id === 'b')).toMatchObject({ nickname: 'Bia', answer: 'resp-b' });
  });

  it('ADVANCE (qualquer um) leva reveal -> voting e carimba endsAt', () => {
    const s = reachReveal();
    const v = G.reducer(s, { type: 'ADVANCE' }, ctx('c', 5000));
    expect(v.phase).toBe('voting');
    expect(v.endsAt).toBe(5000 + 60 * 1000);
  });

  it('voting projeta candidatos sem o próprio jogador', () => {
    let s = reachReveal();
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 5000));
    const p = G.project(s, 'a');
    expect(p.phase).toBe('voting');
    if (p.phase !== 'voting') return;
    expect(p.candidates.map((c) => c.id)).toEqual(['b', 'c', 'd']);
    expect(p.yourVote).toBeNull();
    expect(p.total).toBe(4);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add a `toVoting` helper:

```ts
function toVoting(s: InfiltradoState, now: number): InfiltradoState {
  return { ...s, phase: 'voting', endsAt: now + s.config.voteSeconds * 1000, votes: {} };
}
```

Add an `ADVANCE` case to the reducer switch (reveal branch; roundEnd added in Task 8):

```ts
      case 'ADVANCE': {
        if (state.phase === 'reveal') return toVoting(state, ctx.now);
        return state;
      }
```

Extend `project` — add reveal and voting branches before the final `return`:

```ts
    if (state.phase === 'reveal') {
      return {
        phase: 'reveal',
        answers: state.revealOrder.map((id) => ({ id, nickname: nick(state, id), answer: state.answers[id] ?? '—' })),
      };
    }
    if (state.phase === 'voting') {
      return {
        phase: 'voting',
        candidates: state.players.filter((p) => p.id !== playerId),
        yourVote: state.votes[playerId] ?? null,
        voted: Object.keys(state.votes).length,
        total: state.players.length,
        endsAt: state.endsAt ?? 0,
      };
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): reveal + ADVANCE pra voting + projeção de voto"
```

---

### Task 6: `SUBMIT_VOTE` + tally → escape (caught) / roundEnd (escaped)

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('votação -> apuração', () => {
  function reachVoting() {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    return G.reducer(s, { type: 'ADVANCE' }, ctx('a', 5000));
  }

  it('pegar o impostor (maioria) leva à fase escape', () => {
    let s = reachVoting();
    const imp = s.currentImpostors[0];
    for (const p of players) {
      const target = p.id === imp ? players.find((x) => x.id !== imp)!.id : imp;
      s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: target }, ctx(p.id));
    }
    expect(s.phase).toBe('escape');
    expect(s.accusedId).toBe(imp);
  });

  it('votar num inocente leva a roundEnd com vitória do impostor', () => {
    let s = reachVoting();
    const imp = s.currentImpostors[0];
    const innocent = players.find((p) => p.id !== imp)!.id;
    for (const p of players) {
      const target = p.id === innocent ? imp : innocent; // todos miram o inocente
      s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: target }, ctx(p.id));
    }
    expect(s.phase).toBe('roundEnd');
    expect(s.roundOutcome).toBe('impostor');
  });

  it('não dá pra votar em si mesmo; voto duplicado é ignorado', () => {
    let s = reachVoting();
    s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: 'a' }, ctx('a'));
    expect(s.votes.a).toBeUndefined();
    s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: 'b' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: 'c' }, ctx('a'));
    expect(s.votes.a).toBe('b');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add helpers (tally + resolution). Note `applyScores`/`toRoundEnd` finalize a round:

```ts
function allVoted(s: InfiltradoState): boolean {
  return s.players.every((p) => s.votes[p.id] !== undefined);
}

function topVoted(s: InfiltradoState): PlayerId | null {
  const counts: Record<PlayerId, number> = {};
  for (const target of Object.values(s.votes)) counts[target] = (counts[target] ?? 0) + 1;
  let best: PlayerId | null = null, bestN = 0, tie = false;
  for (const [id, n] of Object.entries(counts)) {
    if (n > bestN) { best = id; bestN = n; tie = false; }
    else if (n === bestN) tie = true;
  }
  return tie ? null : best; // empate => ninguém pego
}

function applyScores(s: InfiltradoState, outcome: 'group' | 'impostor'): Record<PlayerId, number> {
  const scores = { ...s.scores };
  if (outcome === 'impostor') {
    for (const id of s.currentImpostors) scores[id] = (scores[id] ?? 0) + 2;
  } else {
    for (const p of s.players) if (!s.currentImpostors.includes(p.id)) scores[p.id] = (scores[p.id] ?? 0) + 1;
  }
  return scores;
}

function toRoundEnd(s: InfiltradoState, outcome: 'group' | 'impostor'): InfiltradoState {
  return { ...s, phase: 'roundEnd', roundOutcome: outcome, scores: applyScores(s, outcome), endsAt: null };
}

function resolveVotes(s: InfiltradoState): InfiltradoState {
  const accused = topVoted(s);
  if (accused !== null && s.currentImpostors.includes(accused)) {
    return { ...s, phase: 'escape', accusedId: accused, escapeGuess: null, escapeVotes: {}, endsAt: null };
  }
  return toRoundEnd({ ...s, accusedId: accused }, 'impostor');
}
```

Add the `SUBMIT_VOTE` case to the reducer switch:

```ts
      case 'SUBMIT_VOTE': {
        if (state.phase !== 'voting') return state;
        if (state.votes[ctx.actorId] !== undefined) return state;
        if (action.suspectId === ctx.actorId) return state;
        if (!state.players.some((p) => p.id === action.suspectId)) return state;
        const next = { ...state, votes: { ...state.votes, [ctx.actorId]: action.suspectId } };
        return allVoted(next) ? resolveVotes(next) : next;
      }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): votação, apuração do mais votado, escape vs roundEnd"
```

---

### Task 7: Escape (guess + group decides) + scoring; `project` escape

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('escape', () => {
  function reachEscape() {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 5000));
    const imp = s.currentImpostors[0];
    for (const p of players) {
      const target = p.id === imp ? players.find((x) => x.id !== imp)!.id : imp;
      s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: target }, ctx(p.id));
    }
    return s; // phase 'escape', accusedId = imp
  }

  it('só o acusado registra o palpite; projeção judging mostra a pergunta original', () => {
    let s = reachEscape();
    const imp = s.accusedId!;
    const other = players.find((p) => p.id !== imp)!.id;
    // judging vê a pergunta normal pra avaliar
    const pj = G.project(s, other);
    expect(pj.phase === 'escape' && pj.role).toBe('judging');
    if (pj.phase === 'escape' && pj.role === 'judging') expect(pj.originalQuestion).toBe(s.pair.normal);
    // o acusado é guessing
    const pg = G.project(s, imp);
    expect(pg.phase === 'escape' && pg.role).toBe('guessing');
    // palpite só do acusado
    s = G.reducer(s, { type: 'SUBMIT_ESCAPE_GUESS', text: 'chute do outro' }, ctx(other));
    expect(s.escapeGuess).toBeNull();
    s = G.reducer(s, { type: 'SUBMIT_ESCAPE_GUESS', text: 'minha pergunta era X' }, ctx(imp));
    expect(s.escapeGuess).toBe('minha pergunta era X');
  });

  it('maioria SIM => impostor escapa (vitória do impostor) e pontua +2', () => {
    let s = reachEscape();
    const imp = s.accusedId!;
    const others = players.filter((p) => p.id !== imp).map((p) => p.id);
    s = G.reducer(s, { type: 'SUBMIT_ESCAPE_GUESS', text: 'palpite' }, ctx(imp));
    for (const id of others) s = G.reducer(s, { type: 'SUBMIT_ESCAPE_VOTE', ok: true }, ctx(id));
    expect(s.phase).toBe('roundEnd');
    expect(s.roundOutcome).toBe('impostor');
    expect(s.scores[imp]).toBe(2);
  });

  it('maioria NÃO (e empate) => grupo vence e pontua inocentes +1', () => {
    let s = reachEscape();
    const imp = s.accusedId!;
    const others = players.filter((p) => p.id !== imp).map((p) => p.id);
    s = G.reducer(s, { type: 'SUBMIT_ESCAPE_GUESS', text: 'palpite' }, ctx(imp));
    for (const id of others) s = G.reducer(s, { type: 'SUBMIT_ESCAPE_VOTE', ok: false }, ctx(id));
    expect(s.phase).toBe('roundEnd');
    expect(s.roundOutcome).toBe('group');
    for (const id of others) expect(s.scores[id]).toBe(1);
    expect(s.scores[imp]).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add escape helpers:

```ts
function escapeVoters(s: InfiltradoState): PlayerId[] {
  return s.players.filter((p) => p.id !== s.accusedId).map((p) => p.id);
}

function allEscapeVoted(s: InfiltradoState): boolean {
  return escapeVoters(s).every((id) => s.escapeVotes[id] !== undefined);
}

function resolveEscape(s: InfiltradoState): InfiltradoState {
  const vals = Object.values(s.escapeVotes);
  const yes = vals.filter((v) => v).length;
  const no = vals.length - yes;
  const escaped = yes > no; // empate = falhou
  return toRoundEnd(s, escaped ? 'impostor' : 'group');
}
```

Add the two escape cases to the reducer switch:

```ts
      case 'SUBMIT_ESCAPE_GUESS': {
        if (state.phase !== 'escape' || ctx.actorId !== state.accusedId) return state;
        if (state.escapeGuess !== null) return state;
        const text = action.text.trim();
        if (!text) return state;
        return { ...state, escapeGuess: text };
      }
      case 'SUBMIT_ESCAPE_VOTE': {
        if (state.phase !== 'escape' || state.escapeGuess === null) return state;
        if (ctx.actorId === state.accusedId) return state;
        if (state.escapeVotes[ctx.actorId] !== undefined) return state;
        const next = { ...state, escapeVotes: { ...state.escapeVotes, [ctx.actorId]: action.ok } };
        return allEscapeVoted(next) ? resolveEscape(next) : next;
      }
```

Add the escape branch to `project`:

```ts
    if (state.phase === 'escape') {
      const accusedNickname = nick(state, state.accusedId!);
      if (playerId === state.accusedId) return { phase: 'escape', role: 'guessing', accusedNickname };
      return {
        phase: 'escape', role: 'judging', accusedNickname,
        originalQuestion: state.pair.normal,
        guess: state.escapeGuess,
        youVoted: state.escapeVotes[playerId] !== undefined,
        votes: Object.keys(state.escapeVotes).length,
        total: escapeVoters(state).length,
      };
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): escape (palpite + grupo decide) + pontuação"
```

---

### Task 8: `roundEnd` projection + `ADVANCE` → next round / matchEnd

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('roundEnd -> próxima rodada / matchEnd', () => {
  function playRoundToEnd(s: InfiltradoState, now = 5000): InfiltradoState {
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r${s.roundIndex}-${p.id}` }, ctx(p.id, now));
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', now));
    const innocent = players.find((p) => !s.currentImpostors.includes(p.id))!.id;
    for (const p of players) {
      const target = p.id === innocent ? s.currentImpostors[0] : innocent;
      s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: target }, ctx(p.id, now));
    }
    return s; // impostor venceu -> roundEnd direto
  }

  it('roundEnd revela impostores e diz se há próxima rodada', () => {
    const s = playRoundToEnd(init({ rounds: 2 }));
    const p = G.project(s, 'a');
    expect(p.phase).toBe('roundEnd');
    if (p.phase !== 'roundEnd') return;
    expect(p.impostors).toContain(nickById(s, s.currentImpostors[0]));
    expect(p.outcome).toBe('impostor');
    expect(p.hasNextRound).toBe(true);
  });

  it('ADVANCE inicia a rodada seguinte (novo índice, papéis do schedule)', () => {
    let s = playRoundToEnd(init({ rounds: 2 }));
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 9000));
    expect(s.phase).toBe('answering');
    expect(s.roundIndex).toBe(1);
    expect(s.currentImpostors).toEqual(s.impostorSchedule[1]);
    expect(s.answers).toEqual({});
    expect(s.endsAt).toBe(9000 + 90 * 1000);
  });

  it('ADVANCE após a última rodada vai pra matchEnd com placar final', () => {
    let s = playRoundToEnd(init({ rounds: 1 }));
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 9000));
    expect(s.phase).toBe('matchEnd');
    const p = G.project(s, 'a');
    expect(p.phase).toBe('matchEnd');
    if (p.phase === 'matchEnd') expect(p.finalScores).toHaveLength(4);
  });
});

function nickById(s: InfiltradoState, id: string) {
  return players.find((p) => p.id === id)!.nickname;
}
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Extend the `ADVANCE` case in the reducer to handle `roundEnd`:

```ts
      case 'ADVANCE': {
        if (state.phase === 'reveal') return toVoting(state, ctx.now);
        if (state.phase === 'roundEnd') {
          const nextIdx = state.roundIndex + 1;
          if (nextIdx >= state.totalRounds) return { ...state, phase: 'matchEnd', endsAt: null };
          return startRound(state, nextIdx, ctx.now, ctx.rng);
        }
        return state;
      }
```

Add `roundEnd` + `matchEnd` branches to `project` (replace the final fallback `return`):

```ts
    if (state.phase === 'roundEnd') {
      return {
        phase: 'roundEnd',
        impostors: state.currentImpostors.map((id) => nick(state, id)),
        accusedNickname: state.accusedId ? nick(state, state.accusedId) : null,
        escapeGuess: state.escapeGuess,
        outcome: state.roundOutcome ?? 'impostor',
        scores: scoreboard(state),
        hasNextRound: state.roundIndex + 1 < state.totalRounds,
      };
    }
    return { phase: 'matchEnd', finalScores: scoreboard(state) };
```

Add the `scoreboard` helper near the other helpers:

```ts
function scoreboard(s: InfiltradoState): { nickname: string; score: number }[] {
  return s.players
    .map((p) => ({ nickname: p.nickname, score: s.scores[p.id] ?? 0 }))
    .sort((x, y) => y.score - x.score);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (20 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): roundEnd, rotação de rodadas e matchEnd"
```

---

### Task 9: `onTimeout` (soft timers for answering/voting)

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('onTimeout', () => {
  it('answering com timeout vai pra reveal mesmo com respostas faltando', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'só a Ana' }, ctx('a'));
    s = G.onTimeout!(s, { now: 99999, rng: mulberry32(2) });
    expect(s.phase).toBe('reveal');
    expect(s.revealOrder).toHaveLength(4);
  });

  it('voting com timeout apura quem votou', () => {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 5000));
    const imp = s.currentImpostors[0];
    // só 3 votam no impostor; o impostor não vota
    for (const p of players.filter((x) => x.id !== imp)) {
      s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: imp }, ctx(p.id));
    }
    s = G.onTimeout!(s, { now: 99999, rng: mulberry32(2) });
    expect(['escape', 'roundEnd']).toContain(s.phase); // apurou (impostor pego => escape)
    expect(s.phase).toBe('escape');
  });

  it('deadline reflete a fase', () => {
    const s = init({}, 1000);
    expect(G.deadline!(s)).toBe(1000 + 90 * 1000);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL (onTimeout is a no-op).

- [ ] **Step 3: Implement `onTimeout`**

```ts
  onTimeout(state, ctx) {
    if (state.phase === 'answering') return toReveal(state, ctx.rng);
    if (state.phase === 'voting') return resolveVotes(state);
    return state;
  },
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (23 tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): timers de folga (onTimeout) pra answering/voting"
```

---

### Task 10: `legalActions` (server-side gating)

**Files:**
- Modify: `src/games/impostor/infiltrado/logic.ts`
- Test: `src/games/impostor/infiltrado/logic.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('legalActions', () => {
  it('answering: pode responder até enviar', () => {
    let s = init();
    expect(G.legalActions(s, 'a')).toEqual(['SUBMIT_ANSWER']);
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'oi' }, ctx('a'));
    expect(G.legalActions(s, 'a')).toEqual([]);
  });

  it('reveal: qualquer um pode ADVANCE', () => {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    expect(G.legalActions(s, 'b')).toEqual(['ADVANCE']);
  });

  it('escape: só o acusado dá o palpite; depois só os outros votam', () => {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 5000));
    const imp = s.currentImpostors[0];
    for (const p of players) {
      const target = p.id === imp ? players.find((x) => x.id !== imp)!.id : imp;
      s = G.reducer(s, { type: 'SUBMIT_VOTE', suspectId: target }, ctx(p.id));
    }
    const other = players.find((p) => p.id !== imp)!.id;
    expect(G.legalActions(s, imp)).toEqual(['SUBMIT_ESCAPE_GUESS']);
    expect(G.legalActions(s, other)).toEqual([]);
    s = G.reducer(s, { type: 'SUBMIT_ESCAPE_GUESS', text: 'palpite' }, ctx(imp));
    expect(G.legalActions(s, imp)).toEqual([]);
    expect(G.legalActions(s, other)).toEqual(['SUBMIT_ESCAPE_VOTE']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `legalActions`**

```ts
  legalActions(state, playerId) {
    switch (state.phase) {
      case 'answering':
        return state.answers[playerId] === undefined ? ['SUBMIT_ANSWER'] : [];
      case 'reveal':
        return ['ADVANCE'];
      case 'voting':
        return state.votes[playerId] === undefined ? ['SUBMIT_VOTE'] : [];
      case 'escape':
        if (state.escapeGuess === null) return playerId === state.accusedId ? ['SUBMIT_ESCAPE_GUESS'] : [];
        return playerId !== state.accusedId && state.escapeVotes[playerId] === undefined ? ['SUBMIT_ESCAPE_VOTE'] : [];
      case 'roundEnd':
        return ['ADVANCE'];
      default:
        return [];
    }
  },
```

- [ ] **Step 4: Run to verify pass + full logic suite green**

Run: `npm run test:run -- src/games/impostor/infiltrado/logic.test.ts`
Expected: PASS (26 tests). Also run `npx tsc -b` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/impostor/infiltrado/
git commit -m "feat(infiltrado): legalActions — gating por fase/ator"
```

---

### Task 11: Server registry + `gameId` resolution + `start` config pass-through

**Files:**
- Create: `src/net/server/registry.ts`
- Modify: `src/net/protocol.ts`, `src/net/server/roomEngine.ts`, `src/net/server/index.ts`
- Test: `src/net/server/index.test.ts` (registry), and a new case in `src/net/server/roomEngine.test.ts`

- [ ] **Step 1: Write the registry test (failing)**

```ts
// src/net/server/index.test.ts
import { describe, expect, it } from 'vitest';
import { resolveGame, DEFAULT_GAME_ID, GAME_REGISTRY } from './registry';

describe('game registry', () => {
  it('resolve infiltrado por id', () => {
    const e = resolveGame('infiltrado');
    expect(e.minPlayers).toBe(3);
    expect(typeof e.game.createInitial).toBe('function');
  });
  it('id desconhecido cai no default (demo)', () => {
    expect(resolveGame('xpto')).toBe(GAME_REGISTRY[DEFAULT_GAME_ID]);
    expect(resolveGame(null)).toBe(GAME_REGISTRY[DEFAULT_GAME_ID]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/net/server/index.test.ts`
Expected: FAIL (no `./registry`).

- [ ] **Step 3: Write the registry**

```ts
// src/net/server/registry.ts
import type { NetGame } from '../contract';
import { promptvoteDemo } from '../__demo__/promptvoteDemo';
import { infiltrado } from '../../games/impostor/infiltrado/logic';

export interface GameEntry {
  game: NetGame<any, any, any, any>;
  config: unknown;
  minPlayers: number;
}

export const GAME_REGISTRY: Record<string, GameEntry> = {
  'promptvote-demo': { game: promptvoteDemo, config: { promptSeconds: 75, voteSeconds: 60 }, minPlayers: 3 },
  infiltrado: { game: infiltrado, config: { impostorCount: 1, rounds: 0, answerSeconds: 90, voteSeconds: 60 }, minPlayers: 3 },
};

export const DEFAULT_GAME_ID = 'promptvote-demo';

export function resolveGame(gameId: string | null | undefined): GameEntry {
  return (gameId && GAME_REGISTRY[gameId]) || GAME_REGISTRY[DEFAULT_GAME_ID];
}
```

- [ ] **Step 4: Add the roomEngine config-merge test (failing)**

Append to `src/net/server/roomEngine.test.ts` inside a new `describe`:

```ts
describe('roomEngine — start carrega config do host', () => {
  it('merge da config do start sobre a config default', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = join(r.state, 'c', 'Cau');
    const captured: any[] = [];
    const game = {
      createInitial: (ctx: any) => { captured.push(ctx.config); return { x: 1 }; },
      reducer: (s: any) => s, project: () => ({}), legalActions: () => [],
    };
    const d: EngineDeps<any, any, any, any> = { game: game as any, config: { impostorCount: 1, rounds: 0 }, minPlayers: 3, now: 1, rng: mulberry32(1) };
    reduceRoom(r.state, { kind: 'start', playerId: 'a', config: { impostorCount: 2 } } as any, d);
    expect(captured[0]).toMatchObject({ impostorCount: 2, rounds: 0 });
  });
});
```

- [ ] **Step 5: Run to verify both fail**

Run: `npm run test:run -- src/net/server/roomEngine.test.ts`
Expected: FAIL (start event ignores `config`).

- [ ] **Step 6: Implement protocol + roomEngine changes**

In `src/net/protocol.ts`, change the `start` client message:

```ts
export type ClientMsg =
  | { t: 'start'; config?: Record<string, unknown> }
  | { t: 'action'; action: unknown };
```

In `src/net/server/roomEngine.ts`, extend the `RoomEvent` start variant:

```ts
  | { kind: 'start'; playerId: PlayerId; config?: Record<string, unknown> }
```

In the `start` case of `reduceRoom`, merge config into `createInitial`:

```ts
      const game = deps.game.createInitial({
        config: { ...(deps.config as object), ...(event.config ?? {}) } as any,
        players: present.map((p) => ({ id: p.id, nickname: p.nickname })),
        now: deps.now,
        rng: deps.rng,
      });
```

- [ ] **Step 7: Wire `index.ts` to the registry + gameId + start config**

In `src/net/server/index.ts`: replace the hard-coded demo with registry resolution. Read `gameId` from the connect query, store it, and resolve deps from the registry; forward `msg.config` on start.

```ts
// src/net/server/index.ts
import type * as Party from 'partykit/server';
import { mulberry32 } from '../rng';
import type { ClientMsg } from '../protocol';
import { createRoom, reduceRoom } from './roomEngine';
import type { EngineDeps, RoomState } from './roomEngine';
import { resolveGame } from './registry';

type ConnState = { playerId: string; nickname: string };

export default class NetRoom implements Party.Server {
  state: RoomState<any>;
  rng: () => number;
  gameId: string | null = null;

  constructor(readonly room: Party.Room) {
    this.state = createRoom(room.id);
    this.rng = mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  }

  private deps(now: number): EngineDeps<any, any, any, any> {
    const entry = resolveGame(this.gameId);
    return { game: entry.game, config: entry.config, minPlayers: entry.minPlayers, now, rng: this.rng };
  }

  private async apply(event: Parameters<typeof reduceRoom>[1], now = Date.now()) {
    const result = reduceRoom(this.state, event as any, this.deps(now));
    this.state = result.state;
    for (const o of result.outbound) {
      const data = JSON.stringify(o.msg);
      if (o.to === 'all') this.room.broadcast(data);
      else for (const conn of this.room.getConnections<ConnState>()) if (conn.state?.playerId === o.to) conn.send(data);
    }
    if (result.deadline) await this.room.storage.setAlarm(result.deadline);
  }

  onConnect(conn: Party.Connection<ConnState>, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    if (this.gameId === null) this.gameId = url.searchParams.get('gameId');
    const playerId = url.searchParams.get('playerId') ?? conn.id;
    const nickname = (url.searchParams.get('nickname') ?? 'Anônimo').slice(0, 20);
    conn.setState({ playerId, nickname });
    return this.apply({ kind: 'join', playerId, nickname });
  }

  onMessage(raw: string, sender: Party.Connection<ConnState>) {
    const playerId = sender.state?.playerId;
    if (!playerId) return;
    let msg: ClientMsg;
    try { msg = JSON.parse(raw) as ClientMsg; } catch { return; }
    if (msg.t === 'start') return this.apply({ kind: 'start', playerId, config: msg.config });
    if (msg.t === 'action') return this.apply({ kind: 'action', playerId, action: msg.action });
  }

  onClose(conn: Party.Connection<ConnState>) {
    const playerId = conn.state?.playerId;
    if (playerId) return this.apply({ kind: 'disconnect', playerId });
  }

  onAlarm() { return this.apply({ kind: 'timeout' }); }
}

NetRoom satisfies Party.Worker;
```

- [ ] **Step 8: Run tests to verify pass**

Run: `npm run test:run -- src/net/server/`
Expected: PASS (existing roomEngine tests + new config-merge + registry).

- [ ] **Step 9: Commit**

```bash
git add src/net/server/registry.ts src/net/server/index.ts src/net/server/index.test.ts src/net/server/roomEngine.ts src/net/server/roomEngine.test.ts src/net/protocol.ts
git commit -m "feat(net): registry de jogo + gameId no connect + config no start"
```

---

### Task 12: `useRoom` carries `gameId`; `Lobby` gains an `extra` slot

**Files:**
- Modify: `src/net/client/useRoom.ts`, `src/net/ui/LobbyScreens.tsx`
- Test: `src/net/client/useRoom.test.ts` (extend)

- [ ] **Step 1: Add a failing test for the query shape**

Open `src/net/client/useRoom.test.ts`. It already tests `reduceClientState`. Add a unit test that the hook composes the query with gameId by extracting the param builder. Since `usePartySocket` is mocked-heavy, test the small pure helper instead. Add to `useRoom.ts` an exported helper and test it:

```ts
// in useRoom.test.ts
import { buildQuery } from './useRoom';
it('buildQuery inclui gameId quando presente', () => {
  expect(buildQuery('p1', 'Ana', 'infiltrado')).toEqual({ playerId: 'p1', nickname: 'Ana', gameId: 'infiltrado' });
  expect(buildQuery('p1', 'Ana')).toEqual({ playerId: 'p1', nickname: 'Ana' });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- src/net/client/useRoom.test.ts`
Expected: FAIL (no `buildQuery`).

- [ ] **Step 3: Implement in `useRoom.ts`**

Add the helper and use it; widen the signature with an optional `gameId`:

```ts
export function buildQuery(playerId: string, nickname: string, gameId?: string): Record<string, string> {
  return gameId ? { playerId, nickname, gameId } : { playerId, nickname };
}

export function useRoom(code: string, playerId: string, nickname: string, gameId?: string) {
  // ...unchanged useReducer...
  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    query: buildQuery(playerId, nickname, gameId),
    // ...unchanged onOpen/onMessage/onClose...
  });
  // ...unchanged return...
}
```

- [ ] **Step 4: Add the optional `extra` slot to `Lobby`**

In `src/net/ui/LobbyScreens.tsx`, widen `Lobby`'s props and render the slot (host-only) just above the Start button:

```ts
export function Lobby({
  room, me, onStart, extra,
}: {
  room: RoomView; me: string; onStart: () => void; extra?: React.ReactNode;
}) {
  // ...unchanged isHost/presentCount/canStart...
  // before the isHost ? (...) Start block, render:
  //   {isHost && extra ? <div className="rounded-2xl border border-line bg-surface p-4">{extra}</div> : null}
}
```

Add `import type { ReactNode } from 'react';` if needed (or use `React.ReactNode` via the existing React import). Place the `{isHost && extra ...}` block immediately before the Start/`isHost ?` button block.

- [ ] **Step 5: Run tests + typecheck**

Run: `npm run test:run -- src/net/client/useRoom.test.ts && npx tsc -b`
Expected: PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/net/client/useRoom.ts src/net/client/useRoom.test.ts src/net/ui/LobbyScreens.tsx
git commit -m "feat(net): useRoom envia gameId + slot extra de config no Lobby"
```

---

### Task 13: Game screens (`GameView.tsx`)

**Files:**
- Create: `src/games/impostor/infiltrado/screens/GameView.tsx`

This is presentational only (no logic). One dispatcher + six phase components, driven by `InfiltradoProjection`. Use only tokens from `docs/visual-tokens.md`.

- [ ] **Step 1: Write `GameView.tsx`**

```tsx
// src/games/impostor/infiltrado/screens/GameView.tsx
import { useState } from 'react';
import type { InfiltradoAction, InfiltradoProjection } from '../types';

const screen = 'mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in';
const card = 'rounded-2xl border border-line bg-surface p-4 text-center';
const cta = 'rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40';
const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-ink';
const pick = 'rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95';

export function GameView({ p, onAction }: { p: InfiltradoProjection; onAction: (a: InfiltradoAction) => void }) {
  switch (p.phase) {
    case 'answering': return <Answering p={p} onAction={onAction} />;
    case 'reveal': return <Reveal p={p} onAction={onAction} />;
    case 'voting': return <Voting p={p} onAction={onAction} />;
    case 'escape': return <Escape p={p} onAction={onAction} />;
    case 'roundEnd': return <RoundEnd p={p} onAction={onAction} />;
    case 'matchEnd': return <MatchEnd p={p} />;
  }
}

function Answering({ p, onAction }: { p: Extract<InfiltradoProjection, { phase: 'answering' }>; onAction: (a: InfiltradoAction) => void }) {
  const [text, setText] = useState('');
  return (
    <div className={screen}>
      <p className="text-center text-sm text-muted">Rodada {p.round}/{p.totalRounds} · {p.tema}</p>
      <div className={card}><p className="text-xl font-bold text-ink">{p.yourQuestion}</p></div>
      {p.yourAnswer === null ? (
        <>
          <textarea className={field} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          <button className={cta} disabled={!text.trim()} onClick={() => onAction({ type: 'SUBMIT_ANSWER', text: text.trim() })}>Enviar resposta</button>
        </>
      ) : (
        <p className="text-center text-muted">Resposta enviada. Esperando… {p.submitted}/{p.total}</p>
      )}
    </div>
  );
}

function Reveal({ p, onAction }: { p: Extract<InfiltradoProjection, { phase: 'reveal' }>; onAction: (a: InfiltradoAction) => void }) {
  return (
    <div className={screen}>
      <h2 className="text-2xl font-extrabold text-ink">Respostas</h2>
      <ul className="flex flex-col gap-2">
        {p.answers.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-ink">{a.answer}</span><span className="text-muted">{a.nickname}</span>
          </li>
        ))}
      </ul>
      <p className="text-center text-sm text-muted">Defendam suas respostas e quando estiverem prontos…</p>
      <button className={cta} onClick={() => onAction({ type: 'ADVANCE' })}>Ir pra votação</button>
    </div>
  );
}

function Voting({ p, onAction }: { p: Extract<InfiltradoProjection, { phase: 'voting' }>; onAction: (a: InfiltradoAction) => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 animate-screen-in">
      <p className="text-center text-lg font-semibold text-muted">Quem é o infiltrado?</p>
      {p.yourVote === null ? (
        p.candidates.map((c) => (
          <button key={c.id} className={pick} onClick={() => onAction({ type: 'SUBMIT_VOTE', suspectId: c.id })}>{c.nickname}</button>
        ))
      ) : (
        <p className="text-center text-muted">Voto registrado. {p.voted}/{p.total}</p>
      )}
    </div>
  );
}

function Escape({ p, onAction }: { p: Extract<InfiltradoProjection, { phase: 'escape' }>; onAction: (a: InfiltradoAction) => void }) {
  const [text, setText] = useState('');
  if (p.role === 'guessing') {
    return (
      <div className={screen}>
        <div className={card}><p className="text-xl font-bold text-bad-text">Você era o infiltrado!</p></div>
        <p className="text-center text-muted">Última chance: qual era a pergunta original?</p>
        <textarea className={field} rows={2} value={text} onChange={(e) => setText(e.target.value)} />
        <button className={cta} disabled={!text.trim()} onClick={() => onAction({ type: 'SUBMIT_ESCAPE_GUESS', text: text.trim() })}>Chutar</button>
      </div>
    );
  }
  return (
    <div className={screen}>
      <div className={card}>
        <p className="text-sm text-muted">A pergunta de vocês era</p>
        <p className="text-lg font-bold text-ink">{p.originalQuestion}</p>
      </div>
      {p.guess === null ? (
        <p className="text-center text-muted">{p.accusedNickname} está chutando a pergunta…</p>
      ) : p.youVoted ? (
        <p className="text-center text-muted">Voto registrado. {p.votes}/{p.total}</p>
      ) : (
        <>
          <p className="text-center text-ink">Palpite de {p.accusedNickname}:</p>
          <div className={card}><p className="text-lg text-ink">"{p.guess}"</p></div>
          <p className="text-center text-muted">Valeu? Acertou a ideia da pergunta?</p>
          <div className="flex gap-3">
            <button className="flex-1 rounded-2xl bg-good py-4 text-xl font-bold text-ink active:brightness-90" onClick={() => onAction({ type: 'SUBMIT_ESCAPE_VOTE', ok: true })}>Acertou</button>
            <button className="flex-1 rounded-2xl bg-bad py-4 text-xl font-bold text-ink active:brightness-90" onClick={() => onAction({ type: 'SUBMIT_ESCAPE_VOTE', ok: false })}>Errou</button>
          </div>
        </>
      )}
    </div>
  );
}

function RoundEnd({ p, onAction }: { p: Extract<InfiltradoProjection, { phase: 'roundEnd' }>; onAction: (a: InfiltradoAction) => void }) {
  return (
    <div className={screen}>
      <div className={card}>
        <p className="text-sm text-muted">Infiltrado{p.impostors.length > 1 ? 's' : ''}</p>
        <p className="text-2xl font-extrabold text-bad-text">{p.impostors.join(', ')}</p>
        <p className="mt-2 text-lg font-bold text-ink">{p.outcome === 'group' ? 'O grupo pegou! 🎉' : 'O infiltrado venceu 😈'}</p>
        {p.escapeGuess ? <p className="mt-1 text-sm text-muted">Chute: "{p.escapeGuess}"</p> : null}
      </div>
      <ul className="flex flex-col gap-1">
        {p.scores.map((s, i) => (
          <li key={i} className="flex justify-between text-ink"><span>{s.nickname}</span><span className="font-bold text-accent">{s.score}</span></li>
        ))}
      </ul>
      <button className={cta} onClick={() => onAction({ type: 'ADVANCE' })}>{p.hasNextRound ? 'Próxima rodada' : 'Ver resultado final'}</button>
    </div>
  );
}

function MatchEnd({ p }: { p: Extract<InfiltradoProjection, { phase: 'matchEnd' }> }) {
  return (
    <div className={screen}>
      <h2 className="text-center text-3xl font-extrabold text-ink">Fim de jogo</h2>
      <ul className="flex flex-col gap-2">
        {p.finalScores.map((s, i) => (
          <li key={i} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-ink">{i === 0 ? '👑 ' : ''}{s.nickname}</span><span className="font-bold text-accent">{s.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/games/impostor/infiltrado/screens/
git commit -m "feat(infiltrado): telas por fase (GameView)"
```

---

### Task 14: `InfiltradoApp` (lobby + config + useRoom + GameView) + dev entry

**Files:**
- Create: `src/games/impostor/infiltrado/InfiltradoApp.tsx`
- Create: `src/net/infiltrado-entry.tsx`
- Create: `infiltrado.html`

- [ ] **Step 1: Write `InfiltradoApp.tsx`**

```tsx
// src/games/impostor/infiltrado/InfiltradoApp.tsx
import { useState } from 'react';
import { getPlayerId } from '../../../net/client/identity';
import { useRoom } from '../../../net/client/useRoom';
import { CreateOrJoin, Lobby } from '../../../net/ui/LobbyScreens';
import { GameView } from './screens/GameView';
import type { InfiltradoAction, InfiltradoProjection } from './types';

export function InfiltradoApp() {
  const [session, setSession] = useState<{ code: string; nickname: string } | null>(null);
  if (!session) return <CreateOrJoin onEnter={(code, nickname) => setSession({ code, nickname })} />;
  return <Connected code={session.code} nickname={session.nickname} />;
}

function Connected({ code, nickname }: { code: string; nickname: string }) {
  const playerId = getPlayerId();
  const { state, send } = useRoom(code, playerId, nickname, 'infiltrado');
  const [impostorCount, setImpostorCount] = useState<1 | 2>(1);

  if (!state.room) return <p className="p-6 text-center text-muted">Conectando à sala {code}…</p>;

  const banner = !state.connected ? (
    <p className="bg-bad-soft p-2 text-center text-bad-text">Reconectando…</p>
  ) : state.error ? (
    <p className="bg-bad-soft p-2 text-center text-bad-text">{state.error}</p>
  ) : null;

  if (state.room.phase === 'lobby') {
    const present = state.room.players.filter((pl) => pl.present).length;
    const canTwo = present >= 6;
    const extra = (
      <div className="flex flex-col gap-2 text-ink">
        <p className="text-sm text-muted">Infiltrados por rodada</p>
        <div className="flex gap-2">
          {[1, 2].map((n) => (
            <button
              key={n}
              disabled={n === 2 && !canTwo}
              className={`flex-1 rounded-xl border border-line py-2 ${impostorCount === n ? 'bg-accent text-bg' : 'bg-surface text-ink'} disabled:opacity-40`}
              onClick={() => setImpostorCount(n as 1 | 2)}
            >
              {n}{n === 2 && !canTwo ? ' (6+)' : ''}
            </button>
          ))}
        </div>
      </div>
    );
    return (
      <>
        {banner}
        <Lobby room={state.room} me={playerId} extra={extra} onStart={() => send({ t: 'start', config: { impostorCount } })} />
      </>
    );
  }

  return (
    <>
      {banner}
      {state.projection ? (
        <GameView p={state.projection as InfiltradoProjection} onAction={(a: InfiltradoAction) => send({ t: 'action', action: a })} />
      ) : (
        <p className="p-6 text-center text-muted">Carregando…</p>
      )}
    </>
  );
}
```

- [ ] **Step 2: Write the entry + html (mirror `net-demo.html`)**

```tsx
// src/net/infiltrado-entry.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { InfiltradoApp } from '../games/impostor/infiltrado/InfiltradoApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-dvh bg-bg text-ink">
      <InfiltradoApp />
    </div>
  </StrictMode>,
);
```

```html
<!-- infiltrado.html -->
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>O Infiltrado</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/net/infiltrado-entry.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Typecheck + build smoke**

Run: `npx tsc -b && npm run test:run`
Expected: no type errors; full suite green.

- [ ] **Step 4: Commit**

```bash
git add src/games/impostor/infiltrado/InfiltradoApp.tsx src/net/infiltrado-entry.tsx infiltrado.html
git commit -m "feat(infiltrado): app (lobby+config+gameview) e entry de dev"
```

---

### Task 15: Integration test — full room loop + secrecy on the wire

**Files:**
- Create: `src/games/impostor/infiltrado/integration.test.ts`

- [ ] **Step 1: Write the integration test (failing if anything regressed)**

```ts
// src/games/impostor/infiltrado/integration.test.ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../net/rng';
import { createRoom, reduceRoom } from '../../../net/server/roomEngine';
import type { EngineDeps, RoomState } from '../../../net/server/roomEngine';
import { infiltrado } from './logic';
import type { InfiltradoState } from './types';

type RS = RoomState<InfiltradoState>;
const deps = (now = 1000): EngineDeps<any, any, any, any> => ({
  game: infiltrado, config: { impostorCount: 1, rounds: 1, answerSeconds: 90, voteSeconds: 60 },
  minPlayers: 3, now, rng: mulberry32(1),
});
const j = (s: RS, id: string, nick: string) => reduceRoom(s, { kind: 'join', playerId: id, nickname: nick }, deps()).state;

function projectionFor(out: ReturnType<typeof reduceRoom>['outbound'], id: string) {
  const m = out.find((o) => o.to === id && o.msg.t === 'projection');
  return m ? (m.msg as any).projection : null;
}

describe('infiltrado — loop completo na sala (multi-cliente)', () => {
  it('a pergunta do impostor nunca vaza pros outros no fio', () => {
    let s = createRoom('ABCD');
    s = j(s, 'a', 'Ana'); s = j(s, 'b', 'Bia'); s = j(s, 'c', 'Cau');
    const started = reduceRoom(s, { kind: 'start', playerId: 'a' }, deps(2000));
    s = started.state;
    const imp: string = s.game!.currentImpostors[0];
    const impPrompt = s.game!.pair.impostor;
    // a projeção de cada não-impostor não contém a pergunta impostora
    for (const id of ['a', 'b', 'c'].filter((x) => x !== imp)) {
      const proj = projectionFor(started.outbound, id);
      expect(JSON.stringify(proj)).not.toContain(impPrompt);
    }
    // a do impostor contém
    expect(JSON.stringify(projectionFor(started.outbound, imp))).toContain(impPrompt);
  });

  it('roda answer -> reveal -> vote -> (escape) -> roundEnd sem erro', () => {
    let s = createRoom('ABCD');
    s = j(s, 'a', 'Ana'); s = j(s, 'b', 'Bia'); s = j(s, 'c', 'Cau');
    s = reduceRoom(s, { kind: 'start', playerId: 'a' }, deps(2000)).state;
    const act = (id: string, action: unknown, now = 3000) =>
      (s = reduceRoom(s, { kind: 'action', playerId: id, action }, deps(now)).state);
    for (const id of ['a', 'b', 'c']) act(id, { type: 'SUBMIT_ANSWER', text: `resp-${id}` });
    expect(s.game!.phase).toBe('reveal');
    act('a', { type: 'ADVANCE' }, 4000);
    expect(s.game!.phase).toBe('voting');
    const imp = s.game!.currentImpostors[0];
    for (const id of ['a', 'b', 'c']) {
      const target = id === imp ? ['a', 'b', 'c'].find((x) => x !== imp)! : imp;
      act(id, { type: 'SUBMIT_VOTE', suspectId: target });
    }
    expect(s.game!.phase).toBe('escape');
    act(imp, { type: 'SUBMIT_ESCAPE_GUESS', text: 'palpite' });
    for (const id of ['a', 'b', 'c'].filter((x) => x !== imp)) act(id, { type: 'SUBMIT_ESCAPE_VOTE', ok: false });
    expect(s.game!.phase).toBe('roundEnd');
    expect(s.game!.roundOutcome).toBe('group');
  });
});
```

- [ ] **Step 2: Run to verify pass**

Run: `npm run test:run -- src/games/impostor/infiltrado/integration.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add src/games/impostor/infiltrado/integration.test.ts
git commit -m "test(infiltrado): integração do loop na sala + segredo no fio"
```

---

### Task 16: Full verification + status-chats update

**Files:**
- Modify: `docs/status-chats.md` (Chat Backend section — note the registry/gameId/config extension and the new game)

- [ ] **Step 1: Run the whole suite + typecheck + build**

Run: `npm run test:run && npx tsc -b && npm run build`
Expected: all tests green (existing 129 + new ~31), no type errors, production build succeeds.

- [ ] **Step 2: Update `docs/status-chats.md`**

In the **Chat Backend** section, add a short note (own section only): the server now resolves the game via `src/net/server/registry.ts` from a `gameId` query param (default stays the demo); `start` carries an optional `config` (host picks 1–2 impostors); `Lobby` gained an optional `extra` slot; `useRoom` accepts `gameId`. Add that **O Infiltrado** (`src/games/impostor/infiltrado/**`, entry `infiltrado.html`) is the first real multi-device game and the "uso #2" validating the projection seam.

- [ ] **Step 3: Manual test instructions (record in the commit body, run when convenient)**

Same wifi, no Cloudflare needed:
```bash
# terminal 1 (room server)
npx partykit dev
# terminal 2 (app on LAN)
npm run dev -- --host
# Each phone opens http://<LAN-IP>:5173/infiltrado.html ; create/join with the 4-letter code.
# Set VITE_PARTYKIT_HOST if partykit dev prints a non-default host.
```

- [ ] **Step 4: Commit**

```bash
git add docs/status-chats.md
git commit -m "docs(status): registry de jogo + O Infiltrado (1º multi-device real)"
```

---

## Self-Review

**Spec coverage** (each spec section → task):
- §1/§2 game + decisions → Tasks 1–10 (logic), 13–14 (UI/config).
- §5 NetGame contract impl → Tasks 3–10 (createInitial/reducer/project/legalActions/deadline/onTimeout).
- §6 flow + determinism → Tasks 4–9 (rng/now on authority; tap-to-advance).
- §7 rules/edges (1–2 impostors, tie, escape majority incl. tie→fail) → Tasks 6, 7 (`topVoted` tie, `resolveEscape` `yes>no`), 14 (impostorCount gate ≥6).
- §8 deck of pairs → Task 2.
- §9 lobby/config/identity → Tasks 12 (extra slot), 14 (impostorCount; rounds auto in Task 3).
- §10 presence/reconnect → inherited from room engine (no new code); exercised in Task 15.
- §11 server registry → Task 11.
- §12 tests → Tasks 2–10 (unit), 15 (integration); manual in Task 16.
- §13 boundaries → Task 16 (status-chats), entry avoids App.tsx (Task 14).
- §14 run instructions → Task 16 Step 3.

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `InfiltradoState`/`InfiltradoAction`/`InfiltradoProjection` (Task 1) are used verbatim in 3–10, 13, 14, 15. Helper names stable: `startRound`, `toReveal`, `toVoting`, `topVoted`, `resolveVotes`, `applyScores`, `toRoundEnd`, `escapeVoters`, `resolveEscape`, `scoreboard`, `nick`. `infiltrado` is the exported `NetGame`; registry (Task 11) imports `{ infiltrado }` from `./logic`; integration + app import the same names from `types`/`logic`. `buildQuery` (Task 12) matches its test. Registry config shape (`impostorCount/rounds/answerSeconds/voteSeconds`) matches `InfiltradoConfig`.

**Note on `rounds` config:** the host UI sets only `impostorCount`; `rounds` stays `0` → `createInitial` computes `totalRounds = players.length` (Task 3). Honors spec §9 ("opcionalmente rounds") without extra UI.
