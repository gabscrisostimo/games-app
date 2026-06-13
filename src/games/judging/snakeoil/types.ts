// src/games/judging/snakeoil/types.ts
export type WordCard = { id: string; word: string };
export type PersonaCard = { id: string; persona: string };
export type WordDeck = { id: string; name: string; cards: WordCard[] };
export type PersonaDeck = { id: string; name: string; cards: PersonaCard[] };

export type Player = {
  id: string;
  name: string;
  score: number;
  hand: string[]; // ids de WordCard
};

export type EndMode = 'rotations' | 'points';

export type MatchConfig = {
  playerNames: string[]; // min 3
  handSize: number; // default 6
  cardsPerPitch: number; // default 2
  pitchSeconds: number | null; // null = sem timer
  endMode: EndMode;
  endValue: number; // K rotações OU X pontos
};

export type GamePhase =
  | 'pre-round'
  | 'selecting'
  | 'pitching'
  | 'judging'
  | 'round-summary'
  | 'game-over';

export type RoundState = {
  customerIndex: number;
  personaId: string | null;
  order: number[]; // índices dos pitchers (todos menos o cliente)
  selIndex: number; // posição atual em `order` durante o selecting
  picks: Record<number, string[]>; // playerIndex -> ids escolhidos
  winnerIndex: number | null;
};

export type GameState = {
  config: MatchConfig;
  players: Player[];
  wordDraw: string[];
  wordDiscard: string[];
  personaDraw: string[];
  personaDiscard: string[];
  roundsPlayed: number;
  round: RoundState | null;
  phase: GamePhase;
};
