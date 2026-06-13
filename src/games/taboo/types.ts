export type Card = { id: string; target: string; taboo: string[] };
export type Deck = { id: string; name: string; cards: Card[] };

export type EndMode = 'rounds' | 'points';

export type MatchConfig = {
  deckId: string;
  turnSeconds: number;       // ex.: 60
  skipLimit: number | null;  // null = ilimitado
  skipCostsPoint: boolean;   // true: pular tira -1; false: só conta no limite
  endMode: EndMode;
  endValue: number;          // N rodadas (por time) ou X pontos
  teamNames: [string, string];
};

export type TeamState = { name: string; score: number };

export type Outcome = 'correct' | 'taboo' | 'skip';
export type TurnResult = { cardId: string; outcome: Outcome };

export type GamePhase = 'pre-turn' | 'in-turn' | 'turn-summary' | 'game-over';

export type TurnState = {
  endsAt: number;             // timestamp epoch ms
  skipsUsed: number;
  currentCardId: string | null;
  results: TurnResult[];
};

export type GameState = {
  config: MatchConfig;
  teams: [TeamState, TeamState];
  currentTeam: 0 | 1;
  turnsTaken: number;         // total de turnos completados (round = 2 turnos)
  drawPile: string[];         // ids embaralhados
  discardPile: string[];
  turn: TurnState | null;
  phase: GamePhase;
};
