export type Card = { id: string; target: string; taboo: string[] };
export type Deck = { id: string; name: string; cards: Card[] };

export type EndMode = 'rounds' | 'points';

export type MatchConfig = {
  deckId: string;
  turnSeconds: number;
  skipLimit: number | null;
  skipCostsPoint: boolean;
  endMode: EndMode;
  endValue: number;
  teamNames: string[];  // 2–5 times
};

export type TeamState = { name: string; score: number };

export type Outcome = 'correct' | 'taboo' | 'skip';
export type TurnResult = { cardId: string; outcome: Outcome };

export type GamePhase = 'pre-turn' | 'in-turn' | 'turn-summary' | 'game-over';

export type TurnState = {
  endsAt: number;
  skipsUsed: number;
  currentCardId: string | null;
  results: TurnResult[];
};

export type GameState = {
  config: MatchConfig;
  teams: TeamState[];
  currentTeam: number;
  turnsTaken: number;
  drawPile: string[];
  discardPile: string[];
  turn: TurnState | null;
  phase: GamePhase;
};
