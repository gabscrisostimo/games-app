# One Night Werewolf — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "hidden-roles" engine via its first game, One Night Ultimate Werewolf — a pass-and-play party game on a single shared device, where a player's final role can differ from their starting role and the app is the secret source of truth.

**Architecture:** Pure `logic.ts` (no React, injectable `rng`) collects every player's night choice during a seating-order pass, then a pure `resolveNight(deal, actions)` replays swaps in canonical role order. A `useReducer` state machine drives thin screens. Roles live in a data-driven registry so later games (Secret Hitler, Mascarade) add entries, not engine rewrites. Mirrors the existing Insider engine (`src/games/impostor/insider/`) exactly.

**Tech Stack:** React + TypeScript + Vite + Vitest + Testing Library + Tailwind (design tokens via `@theme`). Tests: `npm run test:run`.

**Reference spec:** `docs/superpowers/specs/2026-06-13-onenight-game-design.md` (read it before starting).

**Pattern source (read-only mirror):** `src/games/impostor/insider/` — copy its file layout, test style, `ui.ts` token usage, pass-the-phone screen pattern, persistence/playerStore, reducer, Session/App split.

**Hard constraints (from CLAUDE.md + spec):**
- Work ONLY inside this worktree. Everything under `src/games/hiddenroles/onenight/`; recommended-bag data under `src/data/hiddenroles/onenight/`.
- Expose `<OneNightApp onHome={() => void} />`. **NEVER** edit `src/App.tsx` or `src/shell/**` (Chat A wires the home).
- Reuse shell **read-only**: `ActionButton` (`src/shell/ActionButton.tsx`), `useCountdown` (`src/shell/useCountdown.ts`).
- Style **only** via design tokens through a local `ui.ts` (see `docs/visual-tokens.md`). Never raw colors (`bg-slate-800`, `text-white`, …).
- TDD: failing test → run it red → minimal impl → run green → commit. Frequent commits. DRY, YAGNI.

---

## File Structure

All paths relative to repo root (this worktree).

**Domain + logic (`src/games/hiddenroles/onenight/`):**
- `types.ts` — all domain types (no logic).
- `roles.ts` — role registry `ROLES: Record<RoleId, RoleDef>` + helpers (`roleDef`, `teamOf`, `nightOrderOf`).
- `logic.ts` — pure functions: `dealRoles`, `resolveNight`, `computeNightView`, `resolveDeaths`, `resolveWinners`, `awardScores`, `createSession`, and phase-transition functions (`submitPass`, `submitDawn`, `startDiscussion`, `beginVote`, `submitVote`, `playAgain`).
- `reducer.ts` — `oneNightReducer` + `OneNightAction` union; thin wrapper over logic.
- `persistence.ts` — `saveSession`/`loadSession`/`clearSession` (key `games-app:onenight:current`).
- `playerStore.ts` — `loadPlayers`/`savePlayers` (key `games-app:onenight:players`).
- `ui.ts` — centralized token-based class strings.
- `OneNightSession.tsx` — `useReducer` + phase switch + autosave (mirror `InsiderSession.tsx`).
- `OneNightApp.tsx` — resume banner + ConfigScreen → Session (mirror `InsiderApp.tsx`). Root export.

**Screens (`src/games/hiddenroles/onenight/screens/`):**
- `ConfigScreen.tsx` — players + bag builder (live counter) + discussion duration.
- `NightPassScreen.tsx` — seating-order pass: reveal role, action UI per `ActionKind`, show view.
- `DawnPassScreen.tsx` — uniform pass; insomniac sees final role, others "sleep".
- `DiscussionScreen.tsx` — `useCountdown` + presets + "votar agora".
- `VotePassScreen.tsx` — secret vote pass (cannot vote self).
- `ResultScreen.tsx` — final roles + night trail + deaths + winners + standings.

**Data (`src/data/hiddenroles/onenight/`):**
- `bags.ts` — `recommendedBag(playerCount)` + `BOX_LIMITS` (max of each role).

**Tests:** one `*.test.ts(x)` beside each unit (mirror Insider).

---

## Domain reference (locked across all tasks — keep names identical)

These signatures are referenced by many tasks. If a later task seems to use a different name, this section wins.

```ts
// types.ts
export type RoleId =
  | 'werewolf' | 'minion' | 'mason' | 'seer' | 'robber' | 'troublemaker'
  | 'drunk' | 'insomniac' | 'hunter' | 'tanner' | 'villager';
export type Team = 'village' | 'werewolf' | 'tanner';
export type ActionKind =
  | 'none' | 'see-team' | 'minion-see-wolves' | 'lone-wolf-peek'
  | 'seer-peek' | 'rob' | 'swap-others' | 'drunk-swap-center' | 'insomniac-check';

// indices: deal[0..N-1] = players, deal[N..N+2] = center. actor/target/a/b/center are indices into deal.
export type NightAction =
  | { kind: 'robber'; actor: number; target: number }
  | { kind: 'troublemaker'; actor: number; a: number; b: number }
  | { kind: 'seer'; actor: number; peek: { kind: 'player'; target: number } | { kind: 'center'; cards: [number, number] } }
  | { kind: 'drunk'; actor: number; center: number }
  | { kind: 'lone-wolf'; actor: number; center: number };

export type NightView =
  | null
  | { kind: 'wolves'; partners: number[] }          // partners=[] means lone wolf who didn't peek
  | { kind: 'lone-wolf'; center: number; role: RoleId }
  | { kind: 'minion'; wolves: number[] }
  | { kind: 'masons'; partners: number[] }
  | { kind: 'seer-player'; target: number; role: RoleId }
  | { kind: 'seer-center'; cards: [number, number]; roles: [RoleId, RoleId] }
  | { kind: 'robber'; target: number; role: RoleId }
  | { kind: 'troublemaker' }
  | { kind: 'drunk' }
  | { kind: 'insomniac'; role: RoleId };            // filled at dawn

export type WinResult = { village: boolean; werewolf: boolean; tanner: boolean };

export type Player = { id: string; name: string };
export type Config = { players: Player[]; bag: RoleId[]; discussSeconds: number }; // bag.length === players.length + 3
export type Phase = 'night' | 'dawn' | 'discussion' | 'vote' | 'result';

export type RoundState = {
  deal: RoleId[];            // length N+3
  actions: NightAction[];    // collected in seating order
  views: (NightView)[];      // length N, indexed by player
  passIndex: number;         // current player in night/dawn/vote pass
  finalRoles: RoleId[];      // length N; '' -> computed at end of night
  endsAt: number | null;     // discussion timer end
  votes: number[];           // length N; votes[i] = target index, -1 until cast
  deaths: number[];
  winners: WinResult | null;
  phase: Phase;
};
export type SessionState = {
  config: Config;
  scores: Record<string, number>; // playerId -> wins tally
  round: RoundState;
};
```

**Canonical `nightOrder`:** werewolf 10 · minion 20 · mason 30 · seer 40 · robber 50 · troublemaker 60 · drunk 70 · insomniac 80 · villager/hunter/tanner `null`.

**Box limits:** werewolf ×2, mason ×2, villager ×3, every other role ×1.

---

### Task 1: Domain types

Pure type declarations, no runtime code. Nothing to test directly; it is exercised by every later task. Create the file, then confirm it compiles via the first role test in Task 2.

**Files:**
- Create: `src/games/hiddenroles/onenight/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// src/games/hiddenroles/onenight/types.ts
export type RoleId =
  | 'werewolf' | 'minion' | 'mason' | 'seer' | 'robber' | 'troublemaker'
  | 'drunk' | 'insomniac' | 'hunter' | 'tanner' | 'villager';

export type Team = 'village' | 'werewolf' | 'tanner';

export type ActionKind =
  | 'none' | 'see-team' | 'minion-see-wolves' | 'lone-wolf-peek'
  | 'seer-peek' | 'rob' | 'swap-others' | 'drunk-swap-center' | 'insomniac-check';

export type RoleDef = {
  id: RoleId;
  name: string;              // pt-BR display name
  team: Team;
  nightOrder: number | null; // canonical resolution order; null = no night action
  action: ActionKind;
  blurb: string;             // one-line explanation shown on reveal
  max: number;               // how many of this card fit in the box
};

export type Player = { id: string; name: string };

// All indices below point into `deal`: 0..N-1 are players, N..N+2 are center cards.
export type NightAction =
  | { kind: 'robber'; actor: number; target: number }
  | { kind: 'troublemaker'; actor: number; a: number; b: number }
  | {
      kind: 'seer';
      actor: number;
      peek: { kind: 'player'; target: number } | { kind: 'center'; cards: [number, number] };
    }
  | { kind: 'drunk'; actor: number; center: number }
  | { kind: 'lone-wolf'; actor: number; center: number };

export type NightView =
  | null
  | { kind: 'wolves'; partners: number[] }      // partners=[] => lone wolf who did not peek
  | { kind: 'lone-wolf'; center: number; role: RoleId }
  | { kind: 'minion'; wolves: number[] }
  | { kind: 'masons'; partners: number[] }
  | { kind: 'seer-player'; target: number; role: RoleId }
  | { kind: 'seer-center'; cards: [number, number]; roles: [RoleId, RoleId] }
  | { kind: 'robber'; target: number; role: RoleId }
  | { kind: 'troublemaker' }
  | { kind: 'drunk' }
  | { kind: 'insomniac'; role: RoleId };          // filled at dawn

export type WinResult = { village: boolean; werewolf: boolean; tanner: boolean };

export type Config = {
  players: Player[];
  bag: RoleId[];            // length === players.length + 3
  discussSeconds: number;
};

export type Phase = 'night' | 'dawn' | 'discussion' | 'vote' | 'result';

export type RoundState = {
  deal: RoleId[];           // length N+3
  actions: NightAction[];   // collected in seating order
  views: NightView[];       // length N, indexed by player
  passIndex: number;        // current player in night/dawn/vote pass
  finalRoles: RoleId[];     // length N; computed at end of night ([] before that)
  endsAt: number | null;    // discussion timer end
  votes: number[];          // length N; votes[i] = target index, -1 until cast
  deaths: number[];
  winners: WinResult | null;
  phase: Phase;
};

export type SessionState = {
  config: Config;
  scores: Record<string, number>; // playerId -> cumulative wins
  round: RoundState;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/games/hiddenroles/onenight/types.ts
git commit -m "feat(onenight): domain types"
```

---

### Task 2: Role registry

The data-driven registry that encodes team, canonical night order, action kind, blurb and box count per role. Helpers `teamOf`/`nightOrderOf`/`roleDef` are used pervasively by logic.

**Files:**
- Create: `src/games/hiddenroles/onenight/roles.ts`
- Test: `src/games/hiddenroles/onenight/roles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/hiddenroles/onenight/roles.test.ts
import { describe, it, expect } from 'vitest';
import { ROLES, roleDef, teamOf, nightOrderOf } from './roles';
import type { RoleId } from './types';

const ALL: RoleId[] = [
  'werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker',
  'drunk', 'insomniac', 'hunter', 'tanner', 'villager',
];

describe('ROLES registry', () => {
  it('has an entry for every RoleId, keyed by its own id', () => {
    for (const id of ALL) {
      expect(ROLES[id]).toBeDefined();
      expect(ROLES[id].id).toBe(id);
      expect(ROLES[id].name.length).toBeGreaterThan(0);
      expect(ROLES[id].blurb.length).toBeGreaterThan(0);
    }
  });

  it('teamOf maps roles to the correct team', () => {
    expect(teamOf('werewolf')).toBe('werewolf');
    expect(teamOf('minion')).toBe('werewolf');
    expect(teamOf('tanner')).toBe('tanner');
    expect(teamOf('seer')).toBe('village');
    expect(teamOf('villager')).toBe('village');
    expect(teamOf('hunter')).toBe('village');
  });

  it('encodes the canonical night order werewolf<minion<mason<seer<robber<troublemaker<drunk<insomniac', () => {
    const order = ['werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac'] as const;
    const values = order.map((id) => nightOrderOf(id)!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('roles with no night action have null nightOrder', () => {
    expect(nightOrderOf('villager')).toBeNull();
    expect(nightOrderOf('hunter')).toBeNull();
    expect(nightOrderOf('tanner')).toBeNull();
  });

  it('encodes box limits: werewolf x2, mason x2, villager x3, rest x1', () => {
    expect(ROLES.werewolf.max).toBe(2);
    expect(ROLES.mason.max).toBe(2);
    expect(ROLES.villager.max).toBe(3);
    expect(ROLES.seer.max).toBe(1);
    expect(ROLES.minion.max).toBe(1);
  });

  it('roleDef returns the full definition', () => {
    expect(roleDef('robber').action).toBe('rob');
    expect(roleDef('seer').action).toBe('seer-peek');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/roles.test.ts`
Expected: FAIL — cannot find module `./roles`.

- [ ] **Step 3: Write the registry**

```ts
// src/games/hiddenroles/onenight/roles.ts
import type { RoleDef, RoleId, Team } from './types';

export const ROLES: Record<RoleId, RoleDef> = {
  werewolf: {
    id: 'werewolf', name: 'Lobisomem', team: 'werewolf', nightOrder: 10, action: 'see-team', max: 2,
    blurb: 'Você é um Lobisomem. Veja os outros lobos. Se for o único, espie 1 carta do centro.',
  },
  minion: {
    id: 'minion', name: 'Capanga', team: 'werewolf', nightOrder: 20, action: 'minion-see-wolves', max: 1,
    blurb: 'Você é o Capanga. Veja quem são os lobos. Eles não sabem quem você é.',
  },
  mason: {
    id: 'mason', name: 'Maçom', team: 'village', nightOrder: 30, action: 'see-team', max: 2,
    blurb: 'Você é um Maçom. Veja o outro Maçom (ou descubra que está sozinho).',
  },
  seer: {
    id: 'seer', name: 'Vidente', team: 'village', nightOrder: 40, action: 'seer-peek', max: 1,
    blurb: 'Você é a Vidente. Veja a carta de 1 jogador OU 2 cartas do centro.',
  },
  robber: {
    id: 'robber', name: 'Ladrão', team: 'village', nightOrder: 50, action: 'rob', max: 1,
    blurb: 'Você é o Ladrão. Troque sua carta com a de outro jogador e veja seu novo papel.',
  },
  troublemaker: {
    id: 'troublemaker', name: 'Encrenqueiro', team: 'village', nightOrder: 60, action: 'swap-others', max: 1,
    blurb: 'Você é o Encrenqueiro. Troque as cartas de dois outros jogadores (sem olhar).',
  },
  drunk: {
    id: 'drunk', name: 'Bêbado', team: 'village', nightOrder: 70, action: 'drunk-swap-center', max: 1,
    blurb: 'Você é o Bêbado. Troque sua carta com uma do centro, sem olhar qual.',
  },
  insomniac: {
    id: 'insomniac', name: 'Insônia', team: 'village', nightOrder: 80, action: 'insomniac-check', max: 1,
    blurb: 'Você é a Insônia. No amanhecer você verá em quem se tornou.',
  },
  hunter: {
    id: 'hunter', name: 'Caçador', team: 'village', nightOrder: null, action: 'none', max: 1,
    blurb: 'Você é o Caçador. Se morrer, quem você votou morre junto.',
  },
  tanner: {
    id: 'tanner', name: 'Tanner', team: 'tanner', nightOrder: null, action: 'none', max: 1,
    blurb: 'Você é o Tanner. Você só vence se morrer.',
  },
  villager: {
    id: 'villager', name: 'Aldeão', team: 'village', nightOrder: null, action: 'none', max: 3,
    blurb: 'Você é um Aldeão. Sem ação noturna — use a lógica na discussão.',
  },
};

export function roleDef(id: RoleId): RoleDef {
  return ROLES[id];
}

export function teamOf(id: RoleId): Team {
  return ROLES[id].team;
}

export function nightOrderOf(id: RoleId): number | null {
  return ROLES[id].nightOrder;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/roles.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/roles.ts src/games/hiddenroles/onenight/roles.test.ts
git commit -m "feat(onenight): data-driven role registry"
```

---

### Task 3: Recommended bags data

`recommendedBag(n)` returns a valid default bag of length `n+3` for `n` in 3..10, plus `BOX_LIMITS` for the bag builder. Uses a single progression sliced to length, so it always respects box limits.

**Files:**
- Create: `src/data/hiddenroles/onenight/bags.ts`
- Test: `src/data/hiddenroles/onenight/bags.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/data/hiddenroles/onenight/bags.test.ts
import { describe, it, expect } from 'vitest';
import { recommendedBag, BOX_LIMITS } from './bags';
import { ROLES } from '../../../games/hiddenroles/onenight/roles';
import type { RoleId } from '../../../games/hiddenroles/onenight/types';

function counts(bag: RoleId[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const r of bag) c[r] = (c[r] ?? 0) + 1;
  return c;
}

describe('recommendedBag', () => {
  it('returns exactly n+3 cards for every player count 3..10', () => {
    for (let n = 3; n <= 10; n++) {
      expect(recommendedBag(n)).toHaveLength(n + 3);
    }
  });

  it('always includes the canonical core (2 wolves + seer + robber + troublemaker)', () => {
    for (let n = 3; n <= 10; n++) {
      const c = counts(recommendedBag(n));
      expect(c.werewolf).toBe(2);
      expect(c.seer).toBe(1);
      expect(c.robber).toBe(1);
      expect(c.troublemaker).toBe(1);
    }
  });

  it('never exceeds box limits for any player count', () => {
    for (let n = 3; n <= 10; n++) {
      const c = counts(recommendedBag(n));
      for (const [role, count] of Object.entries(c)) {
        expect(count).toBeLessThanOrEqual(ROLES[role as RoleId].max);
      }
    }
  });
});

describe('BOX_LIMITS', () => {
  it('mirrors each role max from the registry', () => {
    for (const id of Object.keys(ROLES) as RoleId[]) {
      expect(BOX_LIMITS[id]).toBe(ROLES[id].max);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/data/hiddenroles/onenight/bags.test.ts`
Expected: FAIL — cannot find module `./bags`.

- [ ] **Step 3: Write the bags data**

```ts
// src/data/hiddenroles/onenight/bags.ts
import { ROLES } from '../../../games/hiddenroles/onenight/roles';
import type { RoleId } from '../../../games/hiddenroles/onenight/types';

// Progression sliced to n+3. Order chosen so every prefix is a sensible, box-legal bag.
// n=3 -> first 6 cards; n=10 -> all 13 cards.
const PROGRESSION: RoleId[] = [
  'werewolf', 'werewolf', 'seer', 'robber', 'troublemaker',
  'villager', 'villager', 'villager',
  'minion', 'drunk', 'insomniac', 'tanner', 'hunter',
];

export function recommendedBag(playerCount: number): RoleId[] {
  return PROGRESSION.slice(0, playerCount + 3);
}

export const BOX_LIMITS: Record<RoleId, number> = Object.fromEntries(
  (Object.keys(ROLES) as RoleId[]).map((id) => [id, ROLES[id].max]),
) as Record<RoleId, number>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/data/hiddenroles/onenight/bags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/hiddenroles/onenight/bags.ts src/data/hiddenroles/onenight/bags.test.ts
git commit -m "feat(onenight): recommended bags + box limits"
```

---

### Task 4: `dealRoles` — shuffle the bag into a deal

Pure Fisher–Yates shuffle with injectable `rng`. Produces `deal` of length `bag.length` (= N+3): indices `0..N-1` are players, `N..N+2` are center.

**Files:**
- Create: `src/games/hiddenroles/onenight/logic.ts`
- Test: `src/games/hiddenroles/onenight/logic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/hiddenroles/onenight/logic.test.ts
import { describe, it, expect } from 'vitest';
import { dealRoles } from './logic';
import type { RoleId } from './types';

const bag: RoleId[] = ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'];

describe('dealRoles', () => {
  it('returns a deal the same length as the bag', () => {
    const deal = dealRoles(bag, () => 0);
    expect(deal).toHaveLength(bag.length);
  });

  it('is a permutation of the bag (same multiset of cards)', () => {
    const deal = dealRoles(bag, () => 0.42);
    expect([...deal].sort()).toEqual([...bag].sort());
  });

  it('is deterministic given a fixed rng', () => {
    const a = dealRoles(bag, makeRng([0.1, 0.9, 0.3, 0.7, 0.5]));
    const b = dealRoles(bag, makeRng([0.1, 0.9, 0.3, 0.7, 0.5]));
    expect(a).toEqual(b);
  });

  it('does not mutate the input bag', () => {
    const copy = [...bag];
    dealRoles(bag, () => 0.5);
    expect(bag).toEqual(copy);
  });
});

// rng that yields a fixed sequence then 0
function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: FAIL — cannot find module `./logic`.

- [ ] **Step 3: Write `dealRoles`**

```ts
// src/games/hiddenroles/onenight/logic.ts
import { nightOrderOf } from './roles';
import type { NightAction, RoleId } from './types';

export function dealRoles(bag: RoleId[], rng: () => number = Math.random): RoleId[] {
  const deal = [...bag];
  for (let i = deal.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deal[i], deal[j]] = [deal[j], deal[i]];
  }
  return deal;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/logic.ts src/games/hiddenroles/onenight/logic.test.ts
git commit -m "feat(onenight): dealRoles shuffle"
```

---

### Task 5: `resolveNight` — replay swaps in canonical order

The engine's heart. Given the original `deal` and the collected `actions`, apply only the swap actions (robber, troublemaker, drunk) in canonical `nightOrder`, then return the players' final roles (`finalRoles`, length N — center excluded). Seer and lone-wolf actions never swap.

**Files:**
- Modify: `src/games/hiddenroles/onenight/logic.ts`
- Test: `src/games/hiddenroles/onenight/logic.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `logic.test.ts`:

```ts
import { resolveNight } from './logic';

describe('resolveNight', () => {
  // deal indices: 0..N-1 players, N..N+2 center.
  // N=4: players 0..3, center 4,5,6.
  it('with no actions, final roles equal the players slice of the deal', () => {
    const deal: RoleId[] = ['werewolf', 'seer', 'robber', 'villager', 'troublemaker', 'villager', 'werewolf'];
    expect(resolveNight(deal, [], 4)).toEqual(['werewolf', 'seer', 'robber', 'villager']);
  });

  it('robber swaps actor with target (robber takes the target role)', () => {
    // player2 = robber robs player3 (villager)
    const deal: RoleId[] = ['werewolf', 'seer', 'robber', 'villager', 'troublemaker', 'villager', 'werewolf'];
    const final = resolveNight(deal, [{ kind: 'robber', actor: 2, target: 3 }], 4);
    expect(final[2]).toBe('villager'); // robber now holds villager
    expect(final[3]).toBe('robber');   // target now holds robber
  });

  it('robber then troublemaker: robber ends DIFFERENT from what it saw (order matters)', () => {
    // N=5 (length 8): players 0..4, center 5,6,7.
    // p2 robber robs p0 (werewolf) -> p2 becomes werewolf; then p4 troublemaker swaps p2 <-> p3
    const deal: RoleId[] = ['werewolf', 'seer', 'robber', 'villager', 'troublemaker', 'villager', 'minion', 'tanner'];
    const final = resolveNight(
      deal,
      [
        { kind: 'troublemaker', actor: 4, a: 2, b: 3 },     // collected out of canonical order on purpose
        { kind: 'robber', actor: 2, target: 0 },
      ],
      5,
    );
    // robber (order 50) runs first: p2<-werewolf, p0<-robber
    // troublemaker (order 60) runs second: swaps p2<->p3 => p2<-villager, p3<-werewolf
    expect(final[2]).toBe('villager'); // robber SAW werewolf but ENDS villager
    expect(final[3]).toBe('werewolf');
    expect(final[0]).toBe('robber');
  });

  it('drunk swaps actor with a center card (blind)', () => {
    // N=3, players 0..2, center 3,4,5. p0 drunk swaps with center index 4 (=minion)
    const deal: RoleId[] = ['drunk', 'seer', 'villager', 'werewolf', 'minion', 'werewolf'];
    const final = resolveNight(deal, [{ kind: 'drunk', actor: 0, center: 4 }], 3);
    expect(final[0]).toBe('minion');
  });

  it('lone-wolf and seer actions cause no swaps', () => {
    // N=4 (length 7): players 0..3, center 4,5,6.
    const deal: RoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'minion', 'tanner', 'robber'];
    const final = resolveNight(
      deal,
      [
        { kind: 'lone-wolf', actor: 0, center: 5 },
        { kind: 'seer', actor: 1, peek: { kind: 'player', target: 2 } },
      ],
      4,
    );
    expect(final).toEqual(['werewolf', 'seer', 'villager', 'villager']);
  });

  it('chained swaps resolve in canonical order regardless of array order', () => {
    // N=5 (length 8): players 0..4, center 5,6,7.
    // robber p0 robs p1, troublemaker p2 swaps p0<->p3, drunk p4 swaps with center 6.
    const deal: RoleId[] = ['robber', 'villager', 'troublemaker', 'seer', 'drunk', 'werewolf', 'minion', 'villager'];
    const final = resolveNight(
      deal,
      [
        { kind: 'drunk', actor: 4, center: 6 },          // listed out of canonical order on purpose
        { kind: 'troublemaker', actor: 2, a: 0, b: 3 },
        { kind: 'robber', actor: 0, target: 1 },
      ],
      5,
    );
    // canonical: robber(50): p0<-villager, p1<-robber
    // troublemaker(60): swap p0<->p3 => p0<-seer, p3<-villager
    // drunk(70): p4<-deal[6]=minion
    expect(final[0]).toBe('seer');
    expect(final[1]).toBe('robber');
    expect(final[3]).toBe('villager');
    expect(final[4]).toBe('minion');
    expect(final).toHaveLength(5);
  });

  it('does not mutate the input deal', () => {
    const deal: RoleId[] = ['robber', 'villager', 'seer', 'werewolf'];
    const copy = [...deal];
    resolveNight(deal, [{ kind: 'robber', actor: 0, target: 1 }], 1);
    expect(deal).toEqual(copy);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts -t resolveNight`
Expected: FAIL — `resolveNight is not a function`.

- [ ] **Step 3: Write `resolveNight`**

Append to `logic.ts`:

```ts
function swap(arr: RoleId[], i: number, j: number): void {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

export function resolveNight(
  deal: RoleId[],
  actions: NightAction[],
  playerCount: number,
): RoleId[] {
  const working = [...deal];
  // Order by the canonical nightOrder of the actor's ORIGINAL role.
  const ordered = [...actions].sort(
    (x, y) => (nightOrderOf(deal[x.actor]) ?? 0) - (nightOrderOf(deal[y.actor]) ?? 0),
  );
  for (const a of ordered) {
    if (a.kind === 'robber') swap(working, a.actor, a.target);
    else if (a.kind === 'troublemaker') swap(working, a.a, a.b);
    else if (a.kind === 'drunk') swap(working, a.actor, a.center);
    // 'seer' and 'lone-wolf' gather info only — no swap.
  }
  return working.slice(0, playerCount);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/logic.ts src/games/hiddenroles/onenight/logic.test.ts
git commit -m "feat(onenight): resolveNight canonical-order replay"
```

---

### Task 6: `computeNightView` — what a player learned

Computes the `NightView` for one player from the **original deal** plus that player's own chosen `action` (or `null`). Insomniac returns `null` here (filled at dawn). This is the info shown to the acting player during the night pass.

**Files:**
- Modify: `src/games/hiddenroles/onenight/logic.ts`
- Test: `src/games/hiddenroles/onenight/logic.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `logic.test.ts`:

```ts
import { computeNightView } from './logic';

describe('computeNightView', () => {
  it('werewolf sees the other werewolves (player indices only)', () => {
    // N=4: players 0..3 (0 and 2 are wolves), center 4,5,6
    const deal: RoleId[] = ['werewolf', 'seer', 'werewolf', 'villager', 'minion', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'wolves', partners: [2] });
  });

  it('lone werewolf with no peek sees empty partners', () => {
    const deal: RoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'werewolf', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'wolves', partners: [] });
  });

  it('lone werewolf who peeks a center card sees that card', () => {
    const deal: RoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    const view = computeNightView(deal, 0, 4, { kind: 'lone-wolf', actor: 0, center: 5 });
    expect(view).toEqual({ kind: 'lone-wolf', center: 5, role: 'tanner' });
  });

  it('minion sees the wolves', () => {
    const deal: RoleId[] = ['minion', 'werewolf', 'villager', 'werewolf', 'seer', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'minion', wolves: [1, 3] });
  });

  it('mason sees the other mason', () => {
    const deal: RoleId[] = ['mason', 'villager', 'mason', 'seer', 'werewolf', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'masons', partners: [2] });
  });

  it('lone mason sees empty partners', () => {
    const deal: RoleId[] = ['mason', 'villager', 'seer', 'robber', 'werewolf', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'masons', partners: [] });
  });

  it('seer peeking a player sees that player original role', () => {
    const deal: RoleId[] = ['seer', 'werewolf', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    const view = computeNightView(deal, 0, 4, { kind: 'seer', actor: 0, peek: { kind: 'player', target: 1 } });
    expect(view).toEqual({ kind: 'seer-player', target: 1, role: 'werewolf' });
  });

  it('seer peeking the center sees two center cards', () => {
    const deal: RoleId[] = ['seer', 'werewolf', 'villager', 'villager', 'minion', 'tanner', 'robber'];
    const view = computeNightView(deal, 0, 4, { kind: 'seer', actor: 0, peek: { kind: 'center', cards: [4, 6] } });
    expect(view).toEqual({ kind: 'seer-center', cards: [4, 6], roles: ['minion', 'robber'] });
  });

  it('robber sees the role it took (original target role)', () => {
    const deal: RoleId[] = ['robber', 'werewolf', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    const view = computeNightView(deal, 0, 4, { kind: 'robber', actor: 0, target: 1 });
    expect(view).toEqual({ kind: 'robber', target: 1, role: 'werewolf' });
  });

  it('troublemaker and drunk get no info', () => {
    const deal: RoleId[] = ['troublemaker', 'drunk', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, { kind: 'troublemaker', actor: 0, a: 1, b: 2 })).toEqual({ kind: 'troublemaker' });
    expect(computeNightView(deal, 1, 4, { kind: 'drunk', actor: 1, center: 5 })).toEqual({ kind: 'drunk' });
  });

  it('optional actors who declined (null action) get a null view', () => {
    const deal: RoleId[] = ['seer', 'robber', 'troublemaker', 'villager', 'minion', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toBeNull(); // seer declined
    expect(computeNightView(deal, 1, 4, null)).toBeNull(); // robber declined
    expect(computeNightView(deal, 2, 4, null)).toBeNull(); // troublemaker declined
  });

  it('insomniac, villager, hunter, tanner see nothing during the night', () => {
    const deal: RoleId[] = ['insomniac', 'villager', 'hunter', 'tanner', 'minion', 'werewolf', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toBeNull();
    expect(computeNightView(deal, 1, 4, null)).toBeNull();
    expect(computeNightView(deal, 2, 4, null)).toBeNull();
    expect(computeNightView(deal, 3, 4, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts -t computeNightView`
Expected: FAIL — `computeNightView is not a function`.

- [ ] **Step 3: Write `computeNightView`**

Append to `logic.ts`:

```ts
import type { NightView } from './types';

export function computeNightView(
  deal: RoleId[],
  playerIndex: number,
  playerCount: number,
  action: NightAction | null,
): NightView {
  const role = deal[playerIndex];
  const playerIdxs = (pred: (r: RoleId, i: number) => boolean): number[] => {
    const out: number[] = [];
    for (let i = 0; i < playerCount; i++) if (pred(deal[i], i)) out.push(i);
    return out;
  };

  switch (role) {
    case 'werewolf': {
      if (action && action.kind === 'lone-wolf') {
        return { kind: 'lone-wolf', center: action.center, role: deal[action.center] };
      }
      const partners = playerIdxs((r, i) => r === 'werewolf' && i !== playerIndex);
      return { kind: 'wolves', partners };
    }
    case 'minion':
      return { kind: 'minion', wolves: playerIdxs((r) => r === 'werewolf') };
    case 'mason':
      return { kind: 'masons', partners: playerIdxs((r, i) => r === 'mason' && i !== playerIndex) };
    case 'seer':
      if (!action || action.kind !== 'seer') return null;
      return action.peek.kind === 'player'
        ? { kind: 'seer-player', target: action.peek.target, role: deal[action.peek.target] }
        : {
            kind: 'seer-center',
            cards: action.peek.cards,
            roles: [deal[action.peek.cards[0]], deal[action.peek.cards[1]]],
          };
    case 'robber':
      if (!action || action.kind !== 'robber') return null;
      return { kind: 'robber', target: action.target, role: deal[action.target] };
    case 'troublemaker':
      return action && action.kind === 'troublemaker' ? { kind: 'troublemaker' } : null;
    case 'drunk':
      return action && action.kind === 'drunk' ? { kind: 'drunk' } : null;
    default:
      return null; // insomniac (dawn), villager, hunter, tanner
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/logic.ts src/games/hiddenroles/onenight/logic.test.ts
git commit -m "feat(onenight): computeNightView from original deal"
```

---

### Task 7: `resolveDeaths` — votes to deaths (with Hunter chain)

Counts votes; if `maxVotes < 2` nobody dies; otherwise everyone tied at the top dies. Then a Hunter who dies also kills whoever they voted for — resolved to a fixpoint (chains of hunters terminate).

**Files:**
- Modify: `src/games/hiddenroles/onenight/logic.ts`
- Test: `src/games/hiddenroles/onenight/logic.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `logic.test.ts`:

```ts
import { resolveDeaths } from './logic';

describe('resolveDeaths', () => {
  it('nobody dies when the top vote-getter has fewer than 2 votes', () => {
    // 3 players each pointing at a different person -> all have 1 vote
    const finalRoles: RoleId[] = ['villager', 'werewolf', 'seer'];
    expect(resolveDeaths([1, 2, 0], finalRoles)).toEqual([]);
  });

  it('kills the single player with the most votes (>=2)', () => {
    // players 0,1,2,3 ; votes all point at player 1
    const finalRoles: RoleId[] = ['villager', 'werewolf', 'seer', 'robber'];
    expect(resolveDeaths([1, 2, 1, 1], finalRoles)).toEqual([1]);
  });

  it('a tie at the top kills everyone tied', () => {
    // player0 gets 2, player1 gets 2
    const finalRoles: RoleId[] = ['werewolf', 'villager', 'seer', 'robber'];
    expect(resolveDeaths([1, 0, 1, 0], finalRoles)).toEqual([0, 1]);
  });

  it('a dead Hunter also kills whoever they voted for', () => {
    // player0 is hunter, voted player3; player0 gets 2 votes and dies -> player3 dies too
    const finalRoles: RoleId[] = ['hunter', 'villager', 'seer', 'werewolf'];
    expect(resolveDeaths([3, 0, 0, 1], finalRoles)).toEqual([0, 3]);
  });

  it('hunter chain resolves to a fixpoint without infinite loop', () => {
    // p0 hunter -> voted p1 ; p1 hunter -> voted p2 ; p0 dies by votes
    const finalRoles: RoleId[] = ['hunter', 'hunter', 'villager', 'seer'];
    // votes: p2->0, p3->0 (p0 gets 2, dies). p0 voted p1, p1 voted p2.
    expect(resolveDeaths([1, 2, 0, 0], finalRoles)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts -t resolveDeaths`
Expected: FAIL — `resolveDeaths is not a function`.

- [ ] **Step 3: Write `resolveDeaths`**

Append to `logic.ts`:

```ts
export function resolveDeaths(votes: number[], finalRoles: RoleId[]): number[] {
  const n = votes.length;
  const count = new Array<number>(n).fill(0);
  for (const v of votes) if (v >= 0 && v < n) count[v]++;
  const maxVotes = Math.max(0, ...count);

  const dead = new Set<number>();
  if (maxVotes >= 2) {
    for (let i = 0; i < n; i++) if (count[i] === maxVotes) dead.add(i);
  }

  // Hunter fixpoint: a dead hunter kills whoever they voted for.
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of [...dead]) {
      if (finalRoles[d] === 'hunter') {
        const t = votes[d];
        if (t >= 0 && t < n && !dead.has(t)) {
          dead.add(t);
          changed = true;
        }
      }
    }
  }

  return [...dead].sort((a, b) => a - b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/logic.ts src/games/hiddenroles/onenight/logic.test.ts
git commit -m "feat(onenight): resolveDeaths with hunter chain"
```

---

### Task 8: `resolveWinners` + `awardScores` — the win matrix

Implements the locked win matrix exactly (Tanner blocks the werewolf-team win; Minion-without-wolves; no-kill under 2 votes already handled by deaths). `awardScores` turns team wins into per-player `+1`.

**Files:**
- Modify: `src/games/hiddenroles/onenight/logic.ts`
- Test: `src/games/hiddenroles/onenight/logic.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `logic.test.ts`:

```ts
import { resolveWinners, awardScores } from './logic';
import type { Player } from './types';

describe('resolveWinners (locked win matrix)', () => {
  it('a werewolf dies -> Village wins', () => {
    const final: RoleId[] = ['werewolf', 'villager', 'seer'];
    expect(resolveWinners(final, [0])).toEqual({ village: true, werewolf: false, tanner: false });
  });

  it('no wolf dies, a wolf is in play, no tanner died -> Werewolf team wins', () => {
    const final: RoleId[] = ['werewolf', 'villager', 'seer'];
    expect(resolveWinners(final, [1])).toEqual({ village: false, werewolf: true, tanner: false });
  });

  it('Tanner dies and no wolf dies -> only Tanner wins (blocks the wolves)', () => {
    const final: RoleId[] = ['werewolf', 'tanner', 'seer'];
    expect(resolveWinners(final, [1])).toEqual({ village: false, werewolf: false, tanner: true });
  });

  it('Tanner dies AND a wolf dies -> Village wins AND Tanner wins', () => {
    const final: RoleId[] = ['werewolf', 'tanner', 'seer'];
    expect(resolveWinners(final, [0, 1])).toEqual({ village: true, werewolf: false, tanner: true });
  });

  it('no wolves in play and nobody dies -> Village wins', () => {
    const final: RoleId[] = ['villager', 'seer', 'robber'];
    expect(resolveWinners(final, [])).toEqual({ village: true, werewolf: false, tanner: false });
  });

  it('no wolves in play, a non-minion dies -> Minion (werewolf team) wins, Village loses', () => {
    const final: RoleId[] = ['minion', 'villager', 'seer'];
    expect(resolveWinners(final, [1])).toEqual({ village: false, werewolf: true, tanner: false });
  });

  it('no wolves in play, only the Minion dies -> Minion loses, Village loses', () => {
    const final: RoleId[] = ['minion', 'villager', 'seer'];
    expect(resolveWinners(final, [0])).toEqual({ village: false, werewolf: false, tanner: false });
  });
});

describe('awardScores', () => {
  const players: Player[] = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ];

  it('Village win gives +1 to every village-team player', () => {
    const final: RoleId[] = ['werewolf', 'villager', 'seer']; // village = b, c
    const scores = awardScores({}, players, final, [0], { village: true, werewolf: false, tanner: false });
    expect(scores).toEqual({ b: 1, c: 1 });
  });

  it('Werewolf win gives +1 to wolves and minion', () => {
    const final: RoleId[] = ['werewolf', 'minion', 'seer'];
    const scores = awardScores({}, players, final, [2], { village: false, werewolf: true, tanner: false });
    expect(scores).toEqual({ a: 1, b: 1 });
  });

  it('Tanner win gives +1 only to the dead tanner', () => {
    const final: RoleId[] = ['werewolf', 'tanner', 'seer'];
    const scores = awardScores({}, players, final, [1], { village: false, werewolf: false, tanner: true });
    expect(scores).toEqual({ b: 1 });
  });

  it('accumulates on top of existing scores', () => {
    const final: RoleId[] = ['villager', 'seer', 'robber'];
    const scores = awardScores({ a: 2, b: 1, c: 5 }, players, final, [], { village: true, werewolf: false, tanner: false });
    expect(scores).toEqual({ a: 3, b: 2, c: 6 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts -t "win matrix"`
Expected: FAIL — `resolveWinners is not a function`.

- [ ] **Step 3: Write `resolveWinners` + `awardScores`**

Append to `logic.ts`:

```ts
import { teamOf } from './roles';
import type { Player, WinResult } from './types';

export function resolveWinners(finalRoles: RoleId[], deaths: number[]): WinResult {
  const deadRoles = deaths.map((i) => finalRoles[i]);
  const tannerDied = deadRoles.includes('tanner');
  const werewolfDied = deadRoles.includes('werewolf');
  const wolvesInPlay = finalRoles.includes('werewolf');

  let village = false;
  let werewolf = false;

  if (werewolfDied) {
    village = true; // a werewolf died -> Village wins
  } else if (wolvesInPlay) {
    if (!tannerDied) werewolf = true; // wolves win unless a Tanner death blocks them
    // tannerDied here => only Tanner wins (village & werewolf stay false)
  } else {
    // no wolves in play
    if (deaths.length === 0) {
      village = true;
    } else {
      werewolf = deadRoles.some((r) => r !== 'minion'); // Minion wins iff a non-minion died
    }
  }

  return { village, werewolf, tanner: tannerDied };
}

export function awardScores(
  scores: Record<string, number>,
  players: Player[],
  finalRoles: RoleId[],
  deaths: number[],
  winners: WinResult,
): Record<string, number> {
  const next = { ...scores };
  players.forEach((p, i) => {
    const team = teamOf(finalRoles[i]);
    const won =
      (winners.village && team === 'village') ||
      (winners.werewolf && team === 'werewolf') ||
      (winners.tanner && team === 'tanner' && deaths.includes(i));
    if (won) next[p.id] = (next[p.id] ?? 0) + 1;
  });
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: PASS (all logic tests).

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/logic.ts src/games/hiddenroles/onenight/logic.test.ts
git commit -m "feat(onenight): win matrix + scoring"
```

---

### Task 9: Session state machine (pure transitions)

The phase machine, all pure. `createSession` deals and enters `night`. `submitPass` walks the seating-order night pass, recording each player's action+view, and at the end runs `resolveNight` then branches to `dawn` (if the insomniac card is in the bag) or `discussion`. `submitDawn` walks the uniform dawn pass. `startDiscussion` arms the timer, `beginVote` opens voting, `submitVote` walks the vote pass and at the end resolves deaths/winners/scores into `result`. `playAgain` re-deals the same bag, preserving scores.

**Files:**
- Modify: `src/games/hiddenroles/onenight/logic.ts`
- Test: `src/games/hiddenroles/onenight/logic.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `logic.test.ts`:

```ts
import {
  createSession, submitPass, submitDawn, startDiscussion, beginVote, submitVote, playAgain,
} from './logic';
import type { Config } from './types';

const players3: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

// rng=()=>0 deals bag [w,w,seer,robber,troublemaker,villager] to:
// players [werewolf, seer, robber], center [troublemaker, villager, werewolf]
const bagNoInsomniac: Config = {
  players: players3,
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 300,
};
const bagWithInsomniac: Config = {
  players: players3,
  bag: ['werewolf', 'insomniac', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 180,
};
const rng0 = () => 0;

describe('createSession', () => {
  it('deals and enters the night with fresh bookkeeping', () => {
    const s = createSession(bagNoInsomniac, rng0);
    expect(s.round.phase).toBe('night');
    expect(s.round.deal).toHaveLength(6);
    expect(s.round.passIndex).toBe(0);
    expect(s.round.views).toHaveLength(3);
    expect(s.round.votes).toEqual([-1, -1, -1]);
    expect(s.round.finalRoles).toEqual([]);
    expect(s.round.winners).toBeNull();
    expect(s.scores).toEqual({});
  });
});

describe('submitPass', () => {
  it('records the action+view and advances the pass index', () => {
    const s = createSession(bagNoInsomniac, rng0); // player0 = werewolf (lone -> partners [])
    const s1 = submitPass(s, null);
    expect(s1.round.passIndex).toBe(1);
    expect(s1.round.views[0]).toEqual({ kind: 'wolves', partners: [] });
    expect(s1.round.actions).toEqual([]); // null action stores nothing
  });

  it('stores non-null actions for later resolution', () => {
    const s = createSession(bagNoInsomniac, rng0);
    const s1 = submitPass(s, null); // werewolf
    const s2 = submitPass(s1, { kind: 'seer', actor: 1, peek: { kind: 'player', target: 2 } });
    expect(s2.round.actions).toHaveLength(1);
    expect(s2.round.views[1]).toEqual({ kind: 'seer-player', target: 2, role: 'robber' });
  });

  it('after the last player with NO insomniac in the bag, resolves and goes to discussion', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null); // p0 werewolf
    s = submitPass(s, null); // p1 seer declines
    s = submitPass(s, null); // p2 robber declines
    expect(s.round.phase).toBe('discussion');
    expect(s.round.finalRoles).toHaveLength(3);
    expect(s.round.endsAt).toBeNull();
  });

  it('after the last player WITH insomniac in the bag, goes to dawn', () => {
    let s = createSession(bagWithInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    expect(s.round.phase).toBe('dawn');
    expect(s.round.passIndex).toBe(0);
    expect(s.round.finalRoles).toHaveLength(3);
  });
});

describe('submitDawn', () => {
  it('walks the uniform dawn pass then enters discussion', () => {
    let s = createSession(bagWithInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null); // -> dawn
    s = submitDawn(s); // p0
    expect(s.round.phase).toBe('dawn');
    s = submitDawn(s); // p1
    s = submitDawn(s); // p2 -> discussion
    expect(s.round.phase).toBe('discussion');
    expect(s.round.endsAt).toBeNull();
  });
});

describe('startDiscussion / beginVote', () => {
  it('startDiscussion arms the countdown', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null); // discussion
    s = startDiscussion(s, 1000);
    expect(s.round.endsAt).toBe(1000 + 300 * 1000);
  });

  it('beginVote opens the vote pass with cleared votes', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = beginVote(s);
    expect(s.round.phase).toBe('vote');
    expect(s.round.passIndex).toBe(0);
    expect(s.round.votes).toEqual([-1, -1, -1]);
  });
});

describe('submitVote', () => {
  it('walks the vote pass and resolves into result on the last vote', () => {
    let s = createSession(bagNoInsomniac, rng0); // players [werewolf, seer, robber]
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = beginVote(s);
    s = submitVote(s, 0); // a votes werewolf(0)
    expect(s.round.phase).toBe('vote');
    s = submitVote(s, 0); // b votes 0
    s = submitVote(s, 1); // c votes 1 -> last vote
    expect(s.round.phase).toBe('result');
    expect(s.round.votes).toEqual([0, 0, 1]);
    // player0 has 2 votes (>=2) -> dies; player0 is a werewolf -> Village wins
    expect(s.round.deaths).toEqual([0]);
    expect(s.round.winners).toEqual({ village: true, werewolf: false, tanner: false });
    // seer(b) and robber(c) are village -> +1 each
    expect(s.scores).toEqual({ b: 1, c: 1 });
  });
});

describe('playAgain', () => {
  it('re-deals the same bag, resets the round, preserves scores', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = beginVote(s);
    s = submitVote(s, 0);
    s = submitVote(s, 0);
    s = submitVote(s, 1); // result, scores {b:1,c:1}
    const again = playAgain(s, rng0);
    expect(again.round.phase).toBe('night');
    expect(again.round.passIndex).toBe(0);
    expect(again.round.finalRoles).toEqual([]);
    expect(again.round.votes).toEqual([-1, -1, -1]);
    expect(again.config).toBe(s.config);
    expect(again.scores).toEqual({ b: 1, c: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts -t submitPass`
Expected: FAIL — `createSession is not a function`.

- [ ] **Step 3: Write the transition functions**

Append to `logic.ts`:

```ts
import type { Config, RoundState, SessionState } from './types';

function freshRound(deal: RoleId[], playerCount: number): RoundState {
  return {
    deal,
    actions: [],
    views: new Array<NightView>(playerCount).fill(null),
    passIndex: 0,
    finalRoles: [],
    endsAt: null,
    votes: new Array<number>(playerCount).fill(-1),
    deaths: [],
    winners: null,
    phase: 'night',
  };
}

export function createSession(config: Config, rng: () => number = Math.random): SessionState {
  const deal = dealRoles(config.bag, rng);
  return { config, scores: {}, round: freshRound(deal, config.players.length) };
}

export function submitPass(state: SessionState, action: NightAction | null): SessionState {
  const { round, config } = state;
  if (round.phase !== 'night') return state;
  const n = config.players.length;
  const idx = round.passIndex;

  const views = [...round.views];
  views[idx] = computeNightView(round.deal, idx, n, action);
  const actions = action ? [...round.actions, action] : round.actions;

  const next = idx + 1;
  if (next < n) {
    return { ...state, round: { ...round, views, actions, passIndex: next } };
  }

  const finalRoles = resolveNight(round.deal, actions, n);
  const hasInsomniac = config.bag.includes('insomniac');
  return {
    ...state,
    round: {
      ...round,
      views,
      actions,
      finalRoles,
      passIndex: 0,
      phase: hasInsomniac ? 'dawn' : 'discussion',
      endsAt: null,
    },
  };
}

export function submitDawn(state: SessionState): SessionState {
  const { round, config } = state;
  if (round.phase !== 'dawn') return state;
  const n = config.players.length;
  const idx = round.passIndex;

  const views = [...round.views];
  if (round.deal[idx] === 'insomniac') {
    views[idx] = { kind: 'insomniac', role: round.finalRoles[idx] };
  }

  const next = idx + 1;
  if (next < n) {
    return { ...state, round: { ...round, views, passIndex: next } };
  }
  return { ...state, round: { ...round, views, phase: 'discussion', endsAt: null } };
}

export function startDiscussion(state: SessionState, now: number): SessionState {
  const { round, config } = state;
  if (round.phase !== 'discussion') return state;
  return { ...state, round: { ...round, endsAt: now + config.discussSeconds * 1000 } };
}

export function beginVote(state: SessionState): SessionState {
  const { round, config } = state;
  if (round.phase !== 'discussion') return state;
  return {
    ...state,
    round: { ...round, phase: 'vote', passIndex: 0, votes: new Array<number>(config.players.length).fill(-1) },
  };
}

export function submitVote(state: SessionState, target: number): SessionState {
  const { round, config } = state;
  if (round.phase !== 'vote') return state;
  const n = config.players.length;
  const idx = round.passIndex;

  const votes = [...round.votes];
  votes[idx] = target;

  const next = idx + 1;
  if (next < n) {
    return { ...state, round: { ...round, votes, passIndex: next } };
  }

  const deaths = resolveDeaths(votes, round.finalRoles);
  const winners = resolveWinners(round.finalRoles, deaths);
  const scores = awardScores(state.scores, config.players, round.finalRoles, deaths, winners);
  return { ...state, scores, round: { ...round, votes, deaths, winners, phase: 'result' } };
}

export function playAgain(state: SessionState, rng: () => number = Math.random): SessionState {
  const deal = dealRoles(state.config.bag, rng);
  return { config: state.config, scores: state.scores, round: freshRound(deal, state.config.players.length) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/logic.test.ts`
Expected: PASS (entire logic suite).

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/logic.ts src/games/hiddenroles/onenight/logic.test.ts
git commit -m "feat(onenight): session state machine transitions"
```

---

### Task 10: Persistence + player store

Two tiny localStorage wrappers, identical in shape to Insider's. Keys: `games-app:onenight:current` and `games-app:onenight:players`.

**Files:**
- Create: `src/games/hiddenroles/onenight/persistence.ts`
- Create: `src/games/hiddenroles/onenight/playerStore.ts`
- Test: `src/games/hiddenroles/onenight/persistence.test.ts`
- Test: `src/games/hiddenroles/onenight/playerStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/games/hiddenroles/onenight/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession } from './persistence';
import { createSession } from './logic';
import type { Config } from './types';

const config: Config = {
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ],
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 300,
};

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('saves and reloads the same state', () => {
    const s = createSession(config, () => 0);
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it('loadSession returns null when empty', () => {
    expect(loadSession()).toBeNull();
  });

  it('loadSession returns null for corrupt JSON', () => {
    localStorage.setItem('games-app:onenight:current', '{nope');
    expect(loadSession()).toBeNull();
  });

  it('clearSession removes the saved state', () => {
    saveSession(createSession(config, () => 0));
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
```

```ts
// src/games/hiddenroles/onenight/playerStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPlayers, savePlayers } from './playerStore';

beforeEach(() => localStorage.clear());

describe('playerStore', () => {
  it('returns an empty list when nothing is saved', () => {
    expect(loadPlayers()).toEqual([]);
  });

  it('saves and reloads the player list', () => {
    const players = [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
    ];
    savePlayers(players);
    expect(loadPlayers()).toEqual(players);
  });

  it('returns an empty list for corrupt JSON', () => {
    localStorage.setItem('games-app:onenight:players', 'oops');
    expect(loadPlayers()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/games/hiddenroles/onenight/persistence.test.ts src/games/hiddenroles/onenight/playerStore.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write the stores**

```ts
// src/games/hiddenroles/onenight/persistence.ts
import type { SessionState } from './types';

const KEY = 'games-app:onenight:current';

export function saveSession(state: SessionState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage indisponível: ignora */
  }
}

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
}
```

```ts
// src/games/hiddenroles/onenight/playerStore.ts
import type { Player } from './types';

const KEY = 'games-app:onenight:players';

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Player[]) : [];
  } catch {
    return [];
  }
}

export function savePlayers(players: Player[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(players));
  } catch {
    /* ignora */
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/games/hiddenroles/onenight/persistence.test.ts src/games/hiddenroles/onenight/playerStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/persistence.ts src/games/hiddenroles/onenight/persistence.test.ts src/games/hiddenroles/onenight/playerStore.ts src/games/hiddenroles/onenight/playerStore.test.ts
git commit -m "feat(onenight): persistence + player store"
```

---

### Task 11: Reducer

Thin wrapper mapping `OneNightAction` to logic functions (mirror `insiderReducer`).

**Files:**
- Create: `src/games/hiddenroles/onenight/reducer.ts`
- Test: `src/games/hiddenroles/onenight/reducer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/games/hiddenroles/onenight/reducer.test.ts
import { describe, it, expect } from 'vitest';
import { oneNightReducer } from './reducer';
import { createSession } from './logic';
import type { Config, SessionState } from './types';

const config: Config = {
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ],
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 300,
};

describe('oneNightReducer', () => {
  it('runs the happy path night -> discussion -> vote -> result', () => {
    let s = createSession(config, () => 0); // players [werewolf, seer, robber]
    s = oneNightReducer(s, { type: 'SUBMIT_PASS', action: null });
    s = oneNightReducer(s, { type: 'SUBMIT_PASS', action: null });
    s = oneNightReducer(s, { type: 'SUBMIT_PASS', action: null });
    expect(s.round.phase).toBe('discussion'); // no insomniac in bag

    s = oneNightReducer(s, { type: 'START_DISCUSSION', now: 1000 });
    expect(s.round.endsAt).toBe(1000 + 300 * 1000);

    s = oneNightReducer(s, { type: 'BEGIN_VOTE' });
    expect(s.round.phase).toBe('vote');

    s = oneNightReducer(s, { type: 'SUBMIT_VOTE', target: 0 });
    s = oneNightReducer(s, { type: 'SUBMIT_VOTE', target: 0 });
    s = oneNightReducer(s, { type: 'SUBMIT_VOTE', target: 1 });
    expect(s.round.phase).toBe('result');
    expect(s.round.winners).not.toBeNull();
  });

  it('PLAY_AGAIN starts a new night preserving scores', () => {
    let s = createSession(config, () => 0);
    s = { ...s, scores: { a: 3 } };
    s = oneNightReducer(s, { type: 'PLAY_AGAIN' });
    expect(s.round.phase).toBe('night');
    expect(s.scores).toEqual({ a: 3 });
  });

  it('LOAD replaces the state', () => {
    const s = createSession(config, () => 0);
    const loaded: SessionState = { ...s, scores: { z: 9 } };
    expect(oneNightReducer(s, { type: 'LOAD', state: loaded })).toBe(loaded);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/reducer.test.ts`
Expected: FAIL — cannot find module `./reducer`.

- [ ] **Step 3: Write the reducer**

```ts
// src/games/hiddenroles/onenight/reducer.ts
import {
  submitPass, submitDawn, startDiscussion, beginVote, submitVote, playAgain,
} from './logic';
import type { NightAction, SessionState } from './types';

export type OneNightAction =
  | { type: 'SUBMIT_PASS'; action: NightAction | null }
  | { type: 'SUBMIT_DAWN' }
  | { type: 'START_DISCUSSION'; now: number }
  | { type: 'BEGIN_VOTE' }
  | { type: 'SUBMIT_VOTE'; target: number }
  | { type: 'PLAY_AGAIN' }
  | { type: 'LOAD'; state: SessionState };

export function oneNightReducer(state: SessionState, action: OneNightAction): SessionState {
  switch (action.type) {
    case 'SUBMIT_PASS':
      return submitPass(state, action.action);
    case 'SUBMIT_DAWN':
      return submitDawn(state);
    case 'START_DISCUSSION':
      return startDiscussion(state, action.now);
    case 'BEGIN_VOTE':
      return beginVote(state);
    case 'SUBMIT_VOTE':
      return submitVote(state, action.target);
    case 'PLAY_AGAIN':
      return playAgain(state);
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/reducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/reducer.ts src/games/hiddenroles/onenight/reducer.test.ts
git commit -m "feat(onenight): reducer"
```

---

### Task 12: `ui.ts` — centralized token classes

All screen styling routes through this object so every class is a design token (no raw colors). No test (it's a constant map); it gets exercised by the screen tests.

**Files:**
- Create: `src/games/hiddenroles/onenight/ui.ts`

- [ ] **Step 1: Write the ui module**

```ts
// src/games/hiddenroles/onenight/ui.ts
// Estilos centralizados das telas do One Night — todos via design tokens (@theme em src/index.css).
// Guia: docs/visual-tokens.md. PONTO ÚNICO de restyle. Botões via <ActionButton> herdam do shell.
export const ui = {
  // containers
  screenGap4: 'mx-auto flex max-w-md flex-col gap-4 p-4',
  screenCenteredGap5: 'mx-auto flex max-w-md flex-col gap-5 p-6 text-center',
  screenCenteredGap6: 'mx-auto flex max-w-md flex-col gap-6 p-6 text-center',
  screenFull: 'mx-auto flex h-dvh max-w-md flex-col items-center justify-between p-6',
  appRoot: 'flex flex-col gap-4',
  banner: 'mx-auto mt-4 flex max-w-md flex-col gap-2 px-4',
  buttonCol: 'flex w-full flex-col gap-3',

  // typography
  title: 'text-2xl font-bold text-ink',
  hero: 'text-4xl font-extrabold text-ink',
  lead: 'text-xl text-muted',
  body: 'text-base text-ink',
  muted: 'text-muted',
  label: 'text-muted',
  blurb: 'text-base text-muted',
  warn: 'text-sm text-bad-text',
  good: 'text-good-text',
  bad: 'text-bad-text',

  // timer
  timer: 'mt-8 text-7xl font-extrabold tabular-nums',
  timerCalm: 'text-ink',
  timerUrgent: 'text-bad-text animate-urgent',

  // lists / sections
  section: 'flex flex-col gap-2',
  list: 'flex flex-col gap-1',
  listItem: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  inputRow: 'flex gap-2',
  fieldGroup: 'flex flex-col gap-1 text-sm font-medium text-muted',
  field: 'rounded-lg border border-line bg-surface px-3 py-2 text-ink',

  // bag builder
  counter: 'text-lg font-bold tabular-nums text-ink',
  counterOk: 'text-good-text',
  counterOff: 'text-bad-text',
  roleRow: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2',
  roleName: 'text-ink',
  stepper: 'flex items-center gap-3',
  stepBtn: 'h-8 w-8 rounded-lg border border-line bg-surface text-lg font-bold text-ink transition active:brightness-95 disabled:opacity-30',
  count: 'w-6 text-center tabular-nums text-ink',

  // cards / choices (night, vote)
  card: 'rounded-2xl border border-line bg-surface p-4 text-center',
  choiceCol: 'flex w-full flex-col gap-3',
  choice: 'w-full rounded-2xl border border-line bg-surface py-4 text-lg font-semibold text-ink select-none transition active:brightness-95',
  choiceOn: 'w-full rounded-2xl border border-accent bg-surface py-4 text-lg font-semibold text-accent select-none transition active:brightness-95',

  // result
  standing: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  deathTag: 'text-bad-text',

  // raw buttons (those NOT using ActionButton)
  removeBtn: 'text-bad-text',
  addBtn: 'rounded-lg bg-good px-4 font-bold text-ink transition active:brightness-90',
  primaryCta: 'mt-2 rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40',
  resumeBtn: 'rounded-2xl bg-accent py-4 text-lg font-bold text-bg transition active:brightness-90',
  linkBtn: 'text-sm text-muted underline',
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/games/hiddenroles/onenight/ui.ts
git commit -m "feat(onenight): centralized token classes (ui.ts)"
```

---

### Task 13: ConfigScreen (players + bag builder + duration)

Manages the persisted player list, a live bag builder (per-role steppers respecting box limits, a `selected/needed` counter where `needed = N+3`, pre-seeded with `recommendedBag(N)` plus a reset button), and the discussion-duration preset. "Começar" is disabled unless `3 ≤ N ≤ 10` and `bag.length === N+3`. On start it builds a `Config` and calls `onStart(createSession(config))`.

**Files:**
- Create: `src/games/hiddenroles/onenight/screens/ConfigScreen.tsx`
- Test: `src/games/hiddenroles/onenight/screens/ConfigScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/screens/ConfigScreen.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigScreen } from './ConfigScreen';
import { savePlayers } from '../playerStore';

beforeEach(() => localStorage.clear());

const fourPlayers = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

describe('ConfigScreen', () => {
  it('disables "Começar" with fewer than 3 players', () => {
    savePlayers([{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }]);
    render(<ConfigScreen onStart={() => {}} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });

  it('with a valid recommended bag, "Começar" calls onStart with a night session', async () => {
    const user = userEvent.setup();
    savePlayers(fourPlayers);
    const onStart = vi.fn();
    render(<ConfigScreen onStart={onStart} />);
    // recommendedBag(4) has length 7 = 4 + 3 -> counter satisfied, start enabled
    const begin = screen.getByRole('button', { name: /começar/i });
    expect(begin).toBeEnabled();
    await user.click(begin);
    expect(onStart).toHaveBeenCalledTimes(1);
    const session = onStart.mock.calls[0][0];
    expect(session.config.players).toHaveLength(4);
    expect(session.config.bag).toHaveLength(7);
    expect(session.round.phase).toBe('night');
  });

  it('adding a card past the needed count disables "Começar"', async () => {
    const user = userEvent.setup();
    savePlayers(fourPlayers);
    render(<ConfigScreen onStart={() => {}} />);
    // bump villager up by one -> bag length 8 != 7 needed
    await user.click(screen.getByRole('button', { name: /adicionar aldeão/i }));
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/ConfigScreen.test.tsx`
Expected: FAIL — cannot find module `./ConfigScreen`.

- [ ] **Step 3: Write ConfigScreen**

```tsx
// src/games/hiddenroles/onenight/screens/ConfigScreen.tsx
import { useState } from 'react';
import { createSession } from '../logic';
import { loadPlayers, savePlayers } from '../playerStore';
import { ROLES } from '../roles';
import { recommendedBag, BOX_LIMITS } from '../../../../data/hiddenroles/onenight/bags';
import type { Player, RoleId, SessionState } from '../types';
import { ui } from '../ui';

const PRESETS = [180, 300, 480]; // 3 / 5 / 8 min
const ROLE_ORDER: RoleId[] = [
  'werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker',
  'drunk', 'insomniac', 'hunter', 'tanner', 'villager',
];

export function ConfigScreen({ onStart }: { onStart: (s: SessionState) => void }) {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [name, setName] = useState('');
  const [bag, setBag] = useState<RoleId[]>(() => recommendedBag(Math.max(3, loadPlayers().length || 3)));
  const [discussSeconds, setDiscussSeconds] = useState(300);

  const needed = players.length + 3;
  const selected = bag.length;
  const canStart = players.length >= 3 && players.length <= 10 && selected === needed;

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers([...players, { id: crypto.randomUUID(), name: trimmed }]);
    setName('');
  }
  function removePlayer(id: string) {
    setPlayers(players.filter((p) => p.id !== id));
  }

  function countOf(role: RoleId): number {
    return bag.filter((r) => r === role).length;
  }
  function addRole(role: RoleId) {
    if (countOf(role) < BOX_LIMITS[role]) setBag([...bag, role]);
  }
  function removeRole(role: RoleId) {
    const idx = bag.lastIndexOf(role);
    if (idx >= 0) setBag(bag.filter((_, i) => i !== idx));
  }
  function resetBag() {
    setBag(recommendedBag(Math.min(10, Math.max(3, players.length))));
  }

  function start() {
    savePlayers(players);
    onStart(createSession({ players, bag, discussSeconds }));
  }

  return (
    <div className={`${ui.screenGap4} animate-screen-in`}>
      <h1 className={ui.title}>One Night</h1>

      <div className={ui.section}>
        <span className={ui.label}>Jogadores ({players.length})</span>
        <ul className={ui.list}>
          {players.map((p) => (
            <li key={p.id} className={ui.listItem}>
              <span>{p.name}</span>
              <button className={ui.removeBtn} onClick={() => removePlayer(p.id)} aria-label={`Remover ${p.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className={ui.inputRow}>
          <input
            className={`${ui.field} flex-1`}
            value={name}
            placeholder="Nome do jogador"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button className={ui.addBtn} onClick={addPlayer}>+</button>
        </div>
        {players.length < 3 && <p className={ui.warn}>Mínimo de 3 jogadores.</p>}
        {players.length > 10 && <p className={ui.warn}>Máximo de 10 jogadores.</p>}
      </div>

      <div className={ui.section}>
        <div className="flex items-center justify-between">
          <span className={ui.label}>Cartas no saco</span>
          <span className={`${ui.counter} ${selected === needed ? ui.counterOk : ui.counterOff}`}>
            {selected}/{needed}
          </span>
        </div>
        <ul className={ui.list}>
          {ROLE_ORDER.map((role) => (
            <li key={role} className={ui.roleRow}>
              <span className={ui.roleName}>{ROLES[role].name}</span>
              <div className={ui.stepper}>
                <button
                  className={ui.stepBtn}
                  onClick={() => removeRole(role)}
                  disabled={countOf(role) === 0}
                  aria-label={`Remover ${ROLES[role].name}`}
                >
                  −
                </button>
                <span className={ui.count}>{countOf(role)}</span>
                <button
                  className={ui.stepBtn}
                  onClick={() => addRole(role)}
                  disabled={countOf(role) >= BOX_LIMITS[role]}
                  aria-label={`Adicionar ${ROLES[role].name}`}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button className={ui.linkBtn} onClick={resetBag}>Restaurar conjunto recomendado</button>
      </div>

      <label className={ui.fieldGroup}>
        Duração da discussão
        <select
          className={ui.field}
          value={discussSeconds}
          onChange={(e) => setDiscussSeconds(Number(e.target.value))}
        >
          {PRESETS.map((s) => (
            <option key={s} value={s}>{s / 60} min</option>
          ))}
        </select>
      </label>

      <button className={ui.primaryCta} onClick={start} disabled={!canStart}>
        Começar
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/ConfigScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/screens/ConfigScreen.tsx src/games/hiddenroles/onenight/screens/ConfigScreen.test.tsx
git commit -m "feat(onenight): ConfigScreen with live bag builder"
```

---

### Task 14: NightPassScreen (seating-order pass + per-role action UI)

Drives one player's night turn: handoff → reveal role + blurb → action UI per `ActionKind` → show the resulting `NightView` → "esconder e passar" which dispatches `SUBMIT_PASS` with the chosen `NightAction | null`. Interactive roles: seer (player or 2 center, or decline), robber (target, or decline), troublemaker (two others, or decline), drunk (one center — mandatory), lone werewolf (peek one center, or decline). Everyone else is info-only and dispatches `null`.

The parent remounts this with `key={passIndex}` so local stage resets each turn.

**Files:**
- Create: `src/games/hiddenroles/onenight/screens/NightPassScreen.tsx`
- Test: `src/games/hiddenroles/onenight/screens/NightPassScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/screens/NightPassScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NightPassScreen } from './NightPassScreen';
import type { RoleId, SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

function state(deal: RoleId[], passIndex: number): SessionState {
  return {
    config: { players, bag: deal, discussSeconds: 300 },
    scores: {},
    round: {
      deal, actions: [], views: [null, null, null, null], passIndex,
      finalRoles: [], endsAt: null, votes: [-1, -1, -1, -1], deaths: [], winners: null, phase: 'night',
    },
  };
}

describe('NightPassScreen', () => {
  it('shows the handoff name, then the role on reveal', async () => {
    const user = userEvent.setup();
    const deal: RoleId[] = ['werewolf', 'werewolf', 'villager', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={() => {}} />);
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    expect(screen.getByText(/Lobisomem/i)).toBeInTheDocument();
  });

  it('a werewolf with a partner sees the partner and passes with no action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['werewolf', 'villager', 'werewolf', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    expect(screen.getByText(/Caio/)).toBeInTheDocument(); // partner at index 2
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });

  it('the robber picks a target and passes a robber action; the view shows the stolen role', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['robber', 'werewolf', 'villager', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    await user.click(screen.getByRole('button', { name: /roubar de beto/i }));
    expect(screen.getByText(/Lobisomem/i)).toBeInTheDocument(); // stole werewolf
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'robber', actor: 0, target: 1 });
  });

  it('the drunk must swap with a center card', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['drunk', 'werewolf', 'villager', 'seer', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    await user.click(screen.getByRole('button', { name: /carta do centro 1/i })); // center index 4 (N=4)
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'drunk', actor: 0, center: 4 });
  });

  it('the seer can decline and pass with no action', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['seer', 'werewolf', 'villager', 'robber', 'minion', 'tanner', 'villager'];
    render(<NightPassScreen state={state(deal, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
    await user.click(screen.getByRole('button', { name: /não agir/i }));
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/NightPassScreen.test.tsx`
Expected: FAIL — cannot find module `./NightPassScreen`.

- [ ] **Step 3: Write NightPassScreen**

```tsx
// src/games/hiddenroles/onenight/screens/NightPassScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { computeNightView } from '../logic';
import { ROLES } from '../roles';
import type { NightAction, NightView, SessionState } from '../types';
import { ui } from '../ui';

type Stage = 'handoff' | 'choose' | 'view';

export function NightPassScreen({
  state,
  onSubmit,
}: {
  state: SessionState;
  onSubmit: (action: NightAction | null) => void;
}) {
  const { config, round } = state;
  const n = config.players.length;
  const idx = round.passIndex;
  const player = config.players[idx];
  const role = round.deal[idx];
  const center = [n, n + 1, n + 2];
  const others = config.players.map((_, i) => i).filter((i) => i !== idx);

  const interactive =
    role === 'seer' || role === 'robber' || role === 'troublemaker' || role === 'drunk' ||
    (role === 'werewolf' && !round.deal.slice(0, n).some((r, i) => r === 'werewolf' && i !== idx));

  const [stage, setStage] = useState<Stage>('handoff');
  const [chosen, setChosen] = useState<NightAction | null>(null);
  const [buf, setBuf] = useState<number[]>([]);   // multi-pick buffer (troublemaker, seer-center)
  const [seerMode, setSeerMode] = useState<'menu' | 'player' | 'center'>('menu');

  const nameOf = (i: number) => config.players[i].name;

  function commit(action: NightAction | null) {
    setChosen(action);
    setStage('view');
  }

  if (stage === 'handoff') {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Passe o celular para</p>
        <p key={player.id} className={`${ui.hero} animate-card-in`}>{player.name}</p>
        <ActionButton variant="neutral" onClick={() => setStage(interactive ? 'choose' : 'view')}>
          Toque para ver seu papel
        </ActionButton>
      </div>
    );
  }

  if (stage === 'choose') {
    return (
      <div className={ui.screenCenteredGap5}>
        <p className={`${ui.title} animate-card-in`}>{ROLES[role].name}</p>
        <p className={ui.blurb}>{ROLES[role].blurb}</p>
        <div className={ui.choiceCol}>
          {role === 'robber' &&
            others.map((i) => (
              <button key={i} className={ui.choice} onClick={() => commit({ kind: 'robber', actor: idx, target: i })}>
                Roubar de {nameOf(i)}
              </button>
            ))}

          {role === 'drunk' &&
            center.map((c, k) => (
              <button key={c} className={ui.choice} onClick={() => commit({ kind: 'drunk', actor: idx, center: c })}>
                Carta do centro {k + 1}
              </button>
            ))}

          {role === 'werewolf' &&
            center.map((c, k) => (
              <button key={c} className={ui.choice} onClick={() => commit({ kind: 'lone-wolf', actor: idx, center: c })}>
                Espiar carta do centro {k + 1}
              </button>
            ))}

          {role === 'troublemaker' &&
            others.map((i) => (
              <button
                key={i}
                className={buf.includes(i) ? ui.choiceOn : ui.choice}
                onClick={() => {
                  const next = buf.includes(i) ? buf.filter((x) => x !== i) : [...buf, i];
                  if (next.length === 2) commit({ kind: 'troublemaker', actor: idx, a: next[0], b: next[1] });
                  else setBuf(next);
                }}
              >
                {nameOf(i)}
              </button>
            ))}

          {role === 'seer' && seerMode === 'menu' && (
            <>
              <button className={ui.choice} onClick={() => setSeerMode('player')}>Ver a carta de um jogador</button>
              <button className={ui.choice} onClick={() => setSeerMode('center')}>Ver 2 cartas do centro</button>
            </>
          )}
          {role === 'seer' && seerMode === 'player' &&
            others.map((i) => (
              <button
                key={i}
                className={ui.choice}
                onClick={() => commit({ kind: 'seer', actor: idx, peek: { kind: 'player', target: i } })}
              >
                {nameOf(i)}
              </button>
            ))}
          {role === 'seer' && seerMode === 'center' &&
            center.map((c, k) => (
              <button
                key={c}
                className={buf.includes(c) ? ui.choiceOn : ui.choice}
                onClick={() => {
                  const next = buf.includes(c) ? buf.filter((x) => x !== c) : [...buf, c];
                  if (next.length === 2) {
                    commit({ kind: 'seer', actor: idx, peek: { kind: 'center', cards: [next[0], next[1]] } });
                  } else setBuf(next);
                }}
              >
                Carta do centro {k + 1}
              </button>
            ))}

          {role !== 'drunk' && (
            <button className={ui.linkBtn} onClick={() => commit(null)}>Não agir</button>
          )}
        </div>
      </div>
    );
  }

  // stage === 'view'
  const view = computeNightView(round.deal, idx, n, chosen);
  return (
    <div className={ui.screenCenteredGap6}>
      <p className={`${ui.title} animate-card-in`}>{ROLES[role].name}</p>
      <ViewBody view={view} nameOf={nameOf} />
      <ActionButton variant="positive" onClick={() => onSubmit(chosen)}>
        Esconder e passar
      </ActionButton>
    </div>
  );
}

function ViewBody({ view, nameOf }: { view: NightView; nameOf: (i: number) => string }) {
  if (view === null) return <p className={ui.body}>Você optou por não agir.</p>;
  switch (view.kind) {
    case 'wolves':
      return (
        <p className={ui.body}>
          {view.partners.length
            ? `Outros lobos: ${view.partners.map(nameOf).join(', ')}.`
            : 'Você é o único lobo entre os jogadores.'}
        </p>
      );
    case 'lone-wolf':
      return <p className={ui.body}>Carta do centro espiada: {ROLES[view.role].name}.</p>;
    case 'minion':
      return (
        <p className={ui.body}>
          Lobos: {view.wolves.length ? view.wolves.map(nameOf).join(', ') : 'nenhum (todos no centro)'}.
        </p>
      );
    case 'masons':
      return (
        <p className={ui.body}>
          {view.partners.length ? `Outro Maçom: ${view.partners.map(nameOf).join(', ')}.` : 'Você é o único Maçom.'}
        </p>
      );
    case 'seer-player':
      return <p className={ui.body}>{nameOf(view.target)} é {ROLES[view.role].name}.</p>;
    case 'seer-center':
      return <p className={ui.body}>Centro: {ROLES[view.roles[0]].name} e {ROLES[view.roles[1]].name}.</p>;
    case 'robber':
      return <p className={ui.body}>Você roubou e agora é {ROLES[view.role].name}.</p>;
    case 'troublemaker':
      return <p className={ui.body}>Você trocou as cartas de dois jogadores.</p>;
    case 'drunk':
      return <p className={ui.body}>Você trocou com o centro às cegas.</p>;
    case 'insomniac':
      return <p className={ui.body}>Você acordou como {ROLES[view.role].name}.</p>;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/NightPassScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/screens/NightPassScreen.tsx src/games/hiddenroles/onenight/screens/NightPassScreen.test.tsx
git commit -m "feat(onenight): NightPassScreen with per-role action UI"
```

---

### Task 15: DawnPassScreen (uniform dawn pass)

Runs only when the insomniac card is in the bag. Uniform pass so nobody can tell who the insomniac is: every player hands off and taps; the player dealt the insomniac card sees their **final** role, everyone else sees "you slept". Dispatches `SUBMIT_DAWN` on "esconder e passar". Remounted with `key={passIndex}`.

**Files:**
- Create: `src/games/hiddenroles/onenight/screens/DawnPassScreen.tsx`
- Test: `src/games/hiddenroles/onenight/screens/DawnPassScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/screens/DawnPassScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DawnPassScreen } from './DawnPassScreen';
import type { RoleId, SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

function dawnState(deal: RoleId[], finalRoles: RoleId[], passIndex: number): SessionState {
  return {
    config: { players, bag: deal, discussSeconds: 300 },
    scores: {},
    round: {
      deal, actions: [], views: [null, null, null], passIndex,
      finalRoles, endsAt: null, votes: [-1, -1, -1], deaths: [], winners: null, phase: 'dawn',
    },
  };
}

describe('DawnPassScreen', () => {
  it('the insomniac sees their final role', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const deal: RoleId[] = ['insomniac', 'werewolf', 'seer', 'robber', 'villager', 'troublemaker'];
    const finalRoles: RoleId[] = ['robber', 'werewolf', 'seer']; // insomniac became robber
    render(<DawnPassScreen state={dawnState(deal, finalRoles, 0)} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /acordar/i }));
    expect(screen.getByText(/Ladrão/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('a non-insomniac just sleeps', async () => {
    const user = userEvent.setup();
    const deal: RoleId[] = ['insomniac', 'werewolf', 'seer', 'robber', 'villager', 'troublemaker'];
    const finalRoles: RoleId[] = ['insomniac', 'werewolf', 'seer'];
    render(<DawnPassScreen state={dawnState(deal, finalRoles, 1)} onSubmit={() => {}} />);
    await user.click(screen.getByRole('button', { name: /acordar/i }));
    expect(screen.getByText(/dorme/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/DawnPassScreen.test.tsx`
Expected: FAIL — cannot find module `./DawnPassScreen`.

- [ ] **Step 3: Write DawnPassScreen**

```tsx
// src/games/hiddenroles/onenight/screens/DawnPassScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { ROLES } from '../roles';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function DawnPassScreen({
  state,
  onSubmit,
}: {
  state: SessionState;
  onSubmit: () => void;
}) {
  const { config, round } = state;
  const idx = round.passIndex;
  const player = config.players[idx];
  const isInsomniac = round.deal[idx] === 'insomniac';
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Amanheceu. Passe o celular para</p>
        <p key={player.id} className={`${ui.hero} animate-card-in`}>{player.name}</p>
        <ActionButton variant="neutral" onClick={() => setRevealed(true)}>
          Toque para acordar
        </ActionButton>
      </div>
    );
  }

  return (
    <div className={ui.screenCenteredGap6}>
      <p className={`${ui.title} animate-card-in`}>
        {isInsomniac
          ? `Você acorda como ${ROLES[round.finalRoles[idx]].name}.`
          : 'Você dorme tranquilo — nada mudou.'}
      </p>
      <ActionButton variant="positive" onClick={onSubmit}>
        Esconder e passar
      </ActionButton>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/DawnPassScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/screens/DawnPassScreen.tsx src/games/hiddenroles/onenight/screens/DawnPassScreen.test.tsx
git commit -m "feat(onenight): DawnPassScreen uniform insomniac pass"
```

---

### Task 16: DiscussionScreen (timer + "votar agora")

Mirrors Insider's GuessingScreen: when `endsAt` is null, show a start button (`onStart`); once armed, show the `useCountdown` timer (urgent in the last 10s) plus a "Votar agora" button. Timer expiry and the button both call `onVote` (which begins the vote pass).

**Files:**
- Create: `src/games/hiddenroles/onenight/screens/DiscussionScreen.tsx`
- Test: `src/games/hiddenroles/onenight/screens/DiscussionScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/screens/DiscussionScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscussionScreen } from './DiscussionScreen';
import type { SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

function discState(endsAt: number | null): SessionState {
  return {
    config: { players, bag: [], discussSeconds: 300 },
    scores: {},
    round: {
      deal: [], actions: [], views: [], passIndex: 0, finalRoles: ['villager', 'seer', 'werewolf'],
      endsAt, votes: [-1, -1, -1], deaths: [], winners: null, phase: 'discussion',
    },
  };
}

describe('DiscussionScreen', () => {
  it('shows a start button before the timer is armed', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<DiscussionScreen state={discState(null)} onStart={onStart} onVote={() => {}} />);
    await user.click(screen.getByRole('button', { name: /começar discussão/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('once armed, "Votar agora" begins the vote', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<DiscussionScreen state={discState(Date.now() + 300_000)} onStart={() => {}} onVote={onVote} />);
    await user.click(screen.getByRole('button', { name: /votar agora/i }));
    expect(onVote).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/DiscussionScreen.test.tsx`
Expected: FAIL — cannot find module `./DiscussionScreen`.

- [ ] **Step 3: Write DiscussionScreen**

```tsx
// src/games/hiddenroles/onenight/screens/DiscussionScreen.tsx
import { useCallback } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { useCountdown } from '../../../../shell/useCountdown';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function DiscussionScreen({
  state,
  onStart,
  onVote,
}: {
  state: SessionState;
  onStart: () => void;
  onVote: () => void;
}) {
  const stableExpire = useCallback(onVote, [onVote]);
  const remaining = useCountdown(state.round.endsAt, stableExpire);

  if (state.round.endsAt === null) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Discutam quem são os lobos. Quando estiverem prontos, votem.</p>
        <ActionButton variant="positive" onClick={onStart}>
          Começar discussão
        </ActionButton>
      </div>
    );
  }

  const urgent = remaining <= 10;
  return (
    <div className={ui.screenFull}>
      <span className={`${ui.timer} ${urgent ? ui.timerUrgent : ui.timerCalm}`}>{remaining}s</span>
      <div className={ui.buttonCol}>
        <ActionButton variant="positive" onClick={onVote}>
          Votar agora
        </ActionButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/DiscussionScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/screens/DiscussionScreen.tsx src/games/hiddenroles/onenight/screens/DiscussionScreen.test.tsx
git commit -m "feat(onenight): DiscussionScreen timer + votar agora"
```

---

### Task 17: VotePassScreen (secret vote pass)

Each player hands off, taps to open the ballot, and picks a target among the **other** players (cannot vote self). Picking dispatches `SUBMIT_VOTE` and advances to the next voter. Remounted with `key={passIndex}`.

**Files:**
- Create: `src/games/hiddenroles/onenight/screens/VotePassScreen.tsx`
- Test: `src/games/hiddenroles/onenight/screens/VotePassScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/screens/VotePassScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VotePassScreen } from './VotePassScreen';
import type { SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

function voteState(passIndex: number): SessionState {
  return {
    config: { players, bag: [], discussSeconds: 300 },
    scores: {},
    round: {
      deal: [], actions: [], views: [], passIndex, finalRoles: ['villager', 'seer', 'werewolf'],
      endsAt: null, votes: [-1, -1, -1], deaths: [], winners: null, phase: 'vote',
    },
  };
}

describe('VotePassScreen', () => {
  it('cannot vote for yourself and records a vote for another player', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();
    render(<VotePassScreen state={voteState(0)} onVote={onVote} />); // voter = Ana (index 0)
    await user.click(screen.getByRole('button', { name: /abrir voto/i }));
    expect(screen.queryByRole('button', { name: 'Ana' })).toBeNull(); // self not selectable
    await user.click(screen.getByRole('button', { name: 'Caio' }));
    expect(onVote).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/VotePassScreen.test.tsx`
Expected: FAIL — cannot find module `./VotePassScreen`.

- [ ] **Step 3: Write VotePassScreen**

```tsx
// src/games/hiddenroles/onenight/screens/VotePassScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function VotePassScreen({
  state,
  onVote,
}: {
  state: SessionState;
  onVote: (target: number) => void;
}) {
  const { config, round } = state;
  const idx = round.passIndex;
  const voter = config.players[idx];
  const others = config.players.map((_, i) => i).filter((i) => i !== idx);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Passe o celular para</p>
        <p key={voter.id} className={`${ui.hero} animate-card-in`}>{voter.name}</p>
        <ActionButton variant="neutral" onClick={() => setOpen(true)}>
          Abrir voto
        </ActionButton>
      </div>
    );
  }

  return (
    <div className={ui.screenCenteredGap5}>
      <p className={ui.title}>Em quem você vota?</p>
      <div className={ui.choiceCol}>
        {others.map((i) => (
          <button key={i} className={ui.choice} onClick={() => onVote(i)}>
            {config.players[i].name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/VotePassScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/screens/VotePassScreen.tsx src/games/hiddenroles/onenight/screens/VotePassScreen.test.tsx
git commit -m "feat(onenight): VotePassScreen secret ballot"
```

---

### Task 18: ResultScreen (winners + night trail + standings)

Reveals the outcome: which team(s) won, who died, every player's original→final role (the "night trail"), and the cumulative standings. Offers "Jogar de novo" (`onPlayAgain`) and "Home" (`onHome`).

**Files:**
- Create: `src/games/hiddenroles/onenight/screens/ResultScreen.tsx`
- Test: `src/games/hiddenroles/onenight/screens/ResultScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/screens/ResultScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultScreen } from './ResultScreen';
import type { SessionState } from '../types';

const players = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

const finished: SessionState = {
  config: { players, bag: [], discussSeconds: 300 },
  scores: { b: 1, c: 1 },
  round: {
    deal: ['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'werewolf'],
    actions: [], views: [], passIndex: 0,
    finalRoles: ['werewolf', 'seer', 'robber'],
    endsAt: null, votes: [0, 0, 1], deaths: [0],
    winners: { village: true, werewolf: false, tanner: false },
    phase: 'result',
  },
};

describe('ResultScreen', () => {
  it('announces the winning team and the dead player', () => {
    render(<ResultScreen state={finished} onPlayAgain={() => {}} onHome={() => {}} />);
    expect(screen.getByText(/Aldeia/i)).toBeInTheDocument();
    // Ana (index 0) is the dead werewolf
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });

  it('"Jogar de novo" and "Home" fire their callbacks', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    render(<ResultScreen state={finished} onPlayAgain={onPlayAgain} onHome={onHome} />);
    await user.click(screen.getByRole('button', { name: /jogar de novo/i }));
    await user.click(screen.getByRole('button', { name: /home/i }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/ResultScreen.test.tsx`
Expected: FAIL — cannot find module `./ResultScreen`.

- [ ] **Step 3: Write ResultScreen**

```tsx
// src/games/hiddenroles/onenight/screens/ResultScreen.tsx
import { ActionButton } from '../../../../shell/ActionButton';
import { ROLES } from '../roles';
import type { SessionState, WinResult } from '../types';
import { ui } from '../ui';

function winnerLine(w: WinResult): string {
  const parts: string[] = [];
  if (w.village) parts.push('Aldeia');
  if (w.werewolf) parts.push('Time dos Lobos');
  if (w.tanner) parts.push('Tanner');
  return parts.length ? `Venceu: ${parts.join(' + ')}` : 'Ninguém venceu';
}

export function ResultScreen({
  state,
  onPlayAgain,
  onHome,
}: {
  state: SessionState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const { config, round, scores } = state;
  const winners = round.winners ?? { village: false, werewolf: false, tanner: false };
  const deadNames = round.deaths.map((i) => config.players[i].name);
  const standings = [...config.players].sort((p, q) => (scores[q.id] ?? 0) - (scores[p.id] ?? 0));

  return (
    <div className={`${ui.screenGap4} animate-screen-in`}>
      <h1 className={ui.title}>{winnerLine(winners)}</h1>

      <p className={ui.body}>
        {deadNames.length ? `Morreu: ${deadNames.join(', ')}.` : 'Ninguém morreu.'}
      </p>

      <div className={ui.section}>
        <span className={ui.label}>Papéis (início → fim)</span>
        <ul className={ui.list}>
          {config.players.map((p, i) => {
            const start = ROLES[round.deal[i]].name;
            const end = ROLES[round.finalRoles[i]].name;
            const dead = round.deaths.includes(i);
            return (
              <li key={p.id} className={ui.listItem}>
                <span>
                  {p.name}
                  {dead && <span className={ui.deathTag}> ☠</span>}
                </span>
                <span className={ui.muted}>{start === end ? end : `${start} → ${end}`}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={ui.section}>
        <span className={ui.label}>Placar</span>
        <ul className={ui.list}>
          {standings.map((p) => (
            <li key={p.id} className={ui.standing}>
              <span>{p.name}</span>
              <span className="tabular-nums">{scores[p.id] ?? 0}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={ui.buttonCol}>
        <ActionButton variant="positive" onClick={onPlayAgain}>
          Jogar de novo
        </ActionButton>
        <button className={ui.linkBtn} onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/screens/ResultScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/screens/ResultScreen.tsx src/games/hiddenroles/onenight/screens/ResultScreen.test.tsx
git commit -m "feat(onenight): ResultScreen winners + night trail + standings"
```

---

### Task 19: OneNightSession (reducer wiring + autosave)

`useReducer` over `oneNightReducer`, autosave on every state change, and a phase switch rendering the right screen. The wrapper `key` is `${phase}-${passIndex}` so each pass remounts (resetting per-player local stage and replaying the entrance animation); during discussion `passIndex` is constant so the countdown is not interrupted.

**Files:**
- Create: `src/games/hiddenroles/onenight/OneNightSession.tsx`
- Test: `src/games/hiddenroles/onenight/OneNightSession.test.tsx` (added in Task 21)

- [ ] **Step 1: Write OneNightSession**

```tsx
// src/games/hiddenroles/onenight/OneNightSession.tsx
import { useEffect, useReducer } from 'react';
import { oneNightReducer } from './reducer';
import { saveSession } from './persistence';
import { NightPassScreen } from './screens/NightPassScreen';
import { DawnPassScreen } from './screens/DawnPassScreen';
import { DiscussionScreen } from './screens/DiscussionScreen';
import { VotePassScreen } from './screens/VotePassScreen';
import { ResultScreen } from './screens/ResultScreen';
import type { SessionState } from './types';

export function OneNightSession({
  initial,
  onHome,
}: {
  initial: SessionState;
  onHome: () => void;
}) {
  const [state, dispatch] = useReducer(oneNightReducer, initial);

  useEffect(() => {
    saveSession(state);
  }, [state]);

  const screen = (() => {
    switch (state.round.phase) {
      case 'night':
        return <NightPassScreen state={state} onSubmit={(action) => dispatch({ type: 'SUBMIT_PASS', action })} />;
      case 'dawn':
        return <DawnPassScreen state={state} onSubmit={() => dispatch({ type: 'SUBMIT_DAWN' })} />;
      case 'discussion':
        return (
          <DiscussionScreen
            state={state}
            onStart={() => dispatch({ type: 'START_DISCUSSION', now: Date.now() })}
            onVote={() => dispatch({ type: 'BEGIN_VOTE' })}
          />
        );
      case 'vote':
        return <VotePassScreen state={state} onVote={(target) => dispatch({ type: 'SUBMIT_VOTE', target })} />;
      case 'result':
        return (
          <ResultScreen
            state={state}
            onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })}
            onHome={onHome}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div key={`${state.round.phase}-${state.round.passIndex}`} className="animate-screen-in">
      {screen}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/games/hiddenroles/onenight/OneNightSession.tsx
git commit -m "feat(onenight): OneNightSession reducer wiring"
```

---

### Task 20: OneNightApp (root export + resume banner)

Root component exposed to the home shell. Mirrors `InsiderApp`: a resume banner when a non-finished session is saved, plus the ConfigScreen → Session handoff. This is the only export the home wires.

**Files:**
- Create: `src/games/hiddenroles/onenight/OneNightApp.tsx`
- Test: `src/games/hiddenroles/onenight/OneNightApp.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/games/hiddenroles/onenight/OneNightApp.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OneNightApp } from './OneNightApp';
import { savePlayers } from './playerStore';

beforeEach(() => localStorage.clear());

describe('OneNightApp', () => {
  it('renders the config screen with the One Night title', () => {
    render(<OneNightApp onHome={() => {}} />);
    expect(screen.getByRole('heading', { name: /one night/i })).toBeInTheDocument();
  });

  it('starting a game from config leaves the config screen (enters the night)', async () => {
    const user = userEvent.setup();
    savePlayers([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Beto' },
      { id: 'c', name: 'Caio' },
    ]);
    render(<OneNightApp onHome={() => {}} />);
    await user.click(screen.getByRole('button', { name: /começar/i }));
    // night handoff shows the first player's name and the reveal button
    expect(screen.getByRole('button', { name: /ver seu papel/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/games/hiddenroles/onenight/OneNightApp.test.tsx`
Expected: FAIL — cannot find module `./OneNightApp`.

- [ ] **Step 3: Write OneNightApp**

```tsx
// src/games/hiddenroles/onenight/OneNightApp.tsx
import { useState } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { OneNightSession } from './OneNightSession';
import { loadSession, clearSession } from './persistence';
import type { SessionState } from './types';
import { ui } from './ui';

export function OneNightApp({ onHome }: { onHome: () => void }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [resumable, setResumable] = useState<SessionState | null>(() => loadSession());

  if (session) {
    return (
      <OneNightSession
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
          <button className={ui.resumeBtn} onClick={() => setSession(resumable)}>
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/OneNightApp.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/OneNightApp.tsx src/games/hiddenroles/onenight/OneNightApp.test.tsx
git commit -m "feat(onenight): OneNightApp root + resume banner"
```

---

### Task 21: End-to-end session smoke test + final verification

One integration test that plays a full 3-player round (all night actions declined) from night → discussion → vote → result, plus the whole-suite + typecheck/build gate, plus the status update.

**Files:**
- Create: `src/games/hiddenroles/onenight/OneNightSession.test.tsx`
- Modify: `docs/status-chats.md` (only the hidden-roles section)

- [ ] **Step 1: Write the failing integration test**

```tsx
// src/games/hiddenroles/onenight/OneNightSession.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OneNightSession } from './OneNightSession';
import { createSession } from './logic';
import type { Config } from './types';

const config: Config = {
  players: [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ],
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'], // no insomniac -> no dawn
  discussSeconds: 300,
};

beforeEach(() => localStorage.clear());

describe('OneNightSession (end to end)', () => {
  it('plays night -> discussion -> vote -> result', async () => {
    const user = userEvent.setup();
    // rng=()=>0 deals players [werewolf, seer, robber]; player0 is the lone wolf.
    render(<OneNightSession initial={createSession(config, () => 0)} onHome={() => {}} />);

    // 3 night passes, every actor declines.
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /ver seu papel/i }));
      // interactive roles (lone wolf, seer, robber) show a "Não agir" choice
      const decline = screen.queryByRole('button', { name: /não agir/i });
      if (decline) await user.click(decline);
      await user.click(screen.getByRole('button', { name: /esconder e passar/i }));
    }

    // discussion
    await user.click(screen.getByRole('button', { name: /começar discussão/i }));
    await user.click(screen.getByRole('button', { name: /votar agora/i }));

    // vote pass: everyone votes Beto (index 1)
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /abrir voto/i }));
      await user.click(screen.getByRole('button', { name: 'Beto' }));
    }

    // result screen
    expect(screen.getByRole('button', { name: /jogar de novo/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it passes**

Run: `npm run test:run -- src/games/hiddenroles/onenight/OneNightSession.test.tsx`
Expected: PASS (the wiring is already implemented in Tasks 1–20).

> If it fails because a voter can vote for a dead/declined option or a button label differs, fix the screen — not the test — to match the locked behavior, then re-run.

- [ ] **Step 3: Run the FULL suite + typecheck/build (verification gate)**

Run: `npm run test:run`
Expected: PASS — the pre-existing 33 baseline tests plus all new One Night tests, 0 failures.

Run: `npm run build`
Expected: `tsc -b` clean (no type errors) and Vite build succeeds.

Do not proceed if either is red. Fix forward (the failure is in the new code), re-run until green.

- [ ] **Step 4: Update the status doc (only the hidden-roles section)**

Edit `docs/status-chats.md`: in the "Engine 4 — Papéis Ocultos + Noite" section, change the status to done/implemented and note the public surface `<OneNightApp onHome={() => void} />` plus the localStorage keys (`games-app:onenight:current`, `games-app:onenight:players`). Do **not** touch other chats' sections, `src/App.tsx`, or `src/shell/**`.

- [ ] **Step 5: Commit**

```bash
git add src/games/hiddenroles/onenight/OneNightSession.test.tsx docs/status-chats.md
git commit -m "test(onenight): end-to-end session smoke + status update"
```

- [ ] **Step 6: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to decide how to integrate (the user coordinates the merge to `main`; do not merge unprompted). Surface: full suite green, build green, no edits outside the engine folder + the owned status section.

---

## Self-Review (run after the plan is written; fix inline)

**1. Spec coverage** — every spec section maps to a task:
- Domain model (`types.ts`, registry) → Tasks 1, 2.
- Recommended bag + box limits → Task 3.
- `dealRoles` / `resolveNight` / `computeNightView` → Tasks 4, 5, 6.
- Deaths (no-kill <2, tie, Hunter chain) → Task 7.
- Win matrix (Tanner blocks wolves, Minion-no-wolves) → Task 8.
- Phase machine + Insomniac dawn pass + optional actions → Task 9.
- Persistence / player store / scores-in-session → Tasks 9, 10.
- Reducer → Task 11. Tokens/`ui.ts` → Task 12.
- ConfigScreen/BagBuilder (live counter, ≥3..10) → Task 13.
- NightPassScreen (seating order, per-role actions, optional) → Task 14.
- DawnPassScreen (uniform) → Task 15.
- DiscussionScreen (presets/timer/votar agora) → Task 16.
- VotePassScreen (no self-vote) → Task 17.
- ResultScreen (winners, night trail, standings, play again/home) → Task 18.
- `<OneNightApp>` export + resume banner → Tasks 19, 20.
- TDD test layout mirrors Insider → throughout; e2e → Task 21.

**2. Out-of-scope respected** — no Doppelgänger, no multi-device, no audio narrator, no other engines. `src/App.tsx` and `src/shell/**` untouched; only `ActionButton` + `useCountdown` reused read-only.

**3. Type consistency** — names are locked in the "Domain reference" section and reused verbatim: `submitPass`/`submitDawn`/`startDiscussion`/`beginVote`/`submitVote`/`playAgain`, `computeNightView`, `resolveNight(deal, actions, playerCount)`, `resolveDeaths(votes, finalRoles)`, `resolveWinners(finalRoles, deaths)`, `awardScores(scores, players, finalRoles, deaths, winners)`. Action indices are deal indices (players `0..N-1`, center `N..N+2`).

**4. Style** — every screen styles through `ui.ts` (design tokens only); no raw colors. `ActionButton`/`useCountdown` imported from `src/shell` read-only.

