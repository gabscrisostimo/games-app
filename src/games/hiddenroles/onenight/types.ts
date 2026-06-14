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
