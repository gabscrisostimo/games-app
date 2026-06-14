export type Player = { id: string; name: string };
export type Mode = 'duel' | 'group';

export type PromptCard = { id: string; text: string };
export type PromptDeck = { id: string; name: string; cards: PromptCard[] };

export type QuiplashConfig = {
  players: Player[]; // 3..12
  mode: Mode;
  rounds: number;    // 2..5
  deckId: string;
};

export type Answer = { authorId: string; text: string };

export type Matchup = {
  promptId: string;
  promptText: string;
  answers: Answer[];               // duelo: 2; grupo: N (placeholders no build, texto no answering)
  voterIds: string[];              // quem pode votar neste confronto
  votes: Record<string, string>;   // voterId -> authorId escolhido
};

// order = permutação dos índices de answers que o votante pode escolher (exclui a própria).
// Gerada uma vez (rng) ao montar a fila e persistida → ordem estável no reload.
export type Ballot = { voterId: string; matchupIndex: number; order: number[] };

export type Phase = 'answering' | 'voting' | 'round-result' | 'final-result';

export type RoundState = {
  index: number;       // 0-based
  multiplier: number;  // index + 1
  isLastLash: boolean;
  matchups: Matchup[];
  answerIndex: number; // jogador atual escrevendo
  ballots: Ballot[];
  voteCursor: number;
  phase: Phase;
};

export type SessionState = {
  config: QuiplashConfig;
  scores: Record<string, number>;
  usedPromptIds: string[];
  round: RoundState;
};

// Helper de exibição (RoundResultScreen)
export type MatchupResult = {
  promptText: string;
  tallies: { authorId: string; text: string; votes: number; points: number; quiplash: boolean }[];
};
