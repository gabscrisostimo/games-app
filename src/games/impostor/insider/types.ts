export type WordCard = { id: string; word: string };
export type WordDeck = { id: string; name: string; cards: WordCard[] };

export type Player = { id: string; name: string };
export type Role = 'master' | 'insider' | 'commoner';

export type MasterMode = 'rotate' | 'choose';
export type Accusation = { kind: 'player'; id: string } | { kind: 'nobody' };

export type InsiderConfig = {
  deckId: string;
  guessSeconds: number;   // default 300; presets 180/300/420; ou custom
  players: Player[];      // >= 4
  masterMode: MasterMode;
};

export type Phase =
  | 'master-select'   // só no modo 'choose'
  | 'master-announce'
  | 'role-reveal'
  | 'guessing'
  | 'insider-hunt'
  | 'result';

export type Outcome = 'not-guessed' | 'insider-caught' | 'insider-escaped';

export type RoundState = {
  word: string;              // '' até dealRoles
  masterId: string;          // '' no modo choose antes de selectMaster
  insiderId: string;         // '' até dealRoles
  revealIndex: number;       // qual jogador está revelando
  endsAt: number | null;     // timestamp do fim da adivinhação
  accusation: Accusation | null;
  outcome: Outcome | null;
  phase: Phase;
};

export type SessionState = {
  config: InsiderConfig;
  masterRotation: string[];  // ids que já foram Mestre no ciclo (rodízio)
  round: RoundState;
};
