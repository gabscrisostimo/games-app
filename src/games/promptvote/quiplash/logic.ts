import type {
  Matchup, PromptCard, PromptDeck, QuiplashConfig, RoundState,
} from './types';

export const MAX_PER_MATCHUP = 1000;
export const QUIPLASH_BONUS_FRAC = 0.5;

/** Sorteia `count` prompts evitando os já usados; reseta a memória se esgotar (borda). */
function pickPrompts(
  deck: PromptDeck, count: number, used: string[], rng: () => number,
): { cards: PromptCard[]; used: string[] } {
  const cards: PromptCard[] = [];
  let remaining = [...used];
  for (let k = 0; k < count; k++) {
    let pool = deck.cards.filter((c) => !remaining.includes(c.id));
    if (pool.length === 0) { remaining = []; pool = [...deck.cards]; }
    const card = pool[Math.floor(rng() * pool.length)];
    cards.push(card);
    remaining.push(card.id);
  }
  return { cards, used: remaining };
}

export function buildRound(
  config: QuiplashConfig, roundIndex: number, deck: PromptDeck,
  used: string[], rng: () => number = Math.random,
): { round: RoundState; used: string[] } {
  const isLastLash = roundIndex === config.rounds - 1;
  const format: 'duel' | 'group' = isLastLash ? 'group' : config.mode;
  const players = config.players;
  const ids = players.map((p) => p.id);
  let matchups: Matchup[];
  let newUsed: string[];

  if (format === 'group') {
    const picked = pickPrompts(deck, 1, used, rng);
    newUsed = picked.used;
    const prompt = picked.cards[0];
    matchups = [{
      promptId: prompt.id,
      promptText: prompt.text,
      answers: players.map((p) => ({ authorId: p.id, text: '' })),
      voterIds: [...ids],
      votes: {},
    }];
  } else {
    const n = players.length;
    const picked = pickPrompts(deck, n, used, rng);
    newUsed = picked.used;
    matchups = picked.cards.map((prompt, k) => {
      const a = players[k];
      const b = players[(k + 1) % n];
      return {
        promptId: prompt.id,
        promptText: prompt.text,
        answers: [{ authorId: a.id, text: '' }, { authorId: b.id, text: '' }],
        voterIds: ids.filter((id) => id !== a.id && id !== b.id),
        votes: {},
      };
    });
  }

  const round: RoundState = {
    index: roundIndex,
    multiplier: roundIndex + 1,
    isLastLash,
    matchups,
    answerIndex: 0,
    ballots: [],
    voteCursor: 0,
    phase: 'answering',
  };
  return { round, used: newUsed };
}

/** Índices dos confrontos que `playerId` deve responder nesta rodada. */
export function promptsForPlayer(round: RoundState, playerId: string): number[] {
  return round.matchups
    .map((m, i) => (m.answers.some((a) => a.authorId === playerId) ? i : -1))
    .filter((i) => i !== -1);
}
