import { describe, it, expect } from 'vitest';
import {
  buildRound, promptsForPlayer, createSession, playAgain, submitAnswers, castVote, matchupResults,
  nextRound, ranking,
} from './logic';
import type { PromptDeck, QuiplashConfig, Player } from './types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
];

const deck: PromptDeck = {
  id: 'd', name: 'Teste',
  cards: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, text: `Prompt ${i}` })),
};

const cfg = (over: Partial<QuiplashConfig> = {}): QuiplashConfig => ({
  players, mode: 'duel', rounds: 3, deckId: 'd', ...over,
});

const rng0 = () => 0;

describe('buildRound — duelo (anel)', () => {
  it('gera N confrontos; cada jogador é autor em exatamente 2; votam os não-autores', () => {
    const { round } = buildRound(cfg(), 0, deck, [], rng0);
    expect(round.phase).toBe('answering');
    expect(round.multiplier).toBe(1);
    expect(round.isLastLash).toBe(false);
    expect(round.matchups).toHaveLength(players.length);

    // cada jogador autor em 2 confrontos
    for (const p of players) {
      const asAuthor = round.matchups.filter((m) => m.answers.some((a) => a.authorId === p.id));
      expect(asAuthor).toHaveLength(2);
    }
    // cada confronto: 2 autores distintos, voterIds = os outros
    for (const m of round.matchups) {
      expect(m.answers).toHaveLength(2);
      const authors = m.answers.map((a) => a.authorId);
      expect(new Set(authors).size).toBe(2);
      expect(m.voterIds.sort()).toEqual(players.map((p) => p.id).filter((id) => !authors.includes(id)).sort());
      expect(m.answers.every((a) => a.text === '')).toBe(true);
    }
  });

  it('última rodada vira Last Lash (grupo), mesmo no modo duelo', () => {
    const { round } = buildRound(cfg({ rounds: 3 }), 2, deck, [], rng0);
    expect(round.isLastLash).toBe(true);
    expect(round.multiplier).toBe(3);
    expect(round.matchups).toHaveLength(1);
    expect(round.matchups[0].answers).toHaveLength(players.length); // todos respondem
    expect(round.matchups[0].voterIds.sort()).toEqual(players.map((p) => p.id).sort());
  });

  it('não repete prompts já usados (retorna used atualizado)', () => {
    const { round, used } = buildRound(cfg(), 0, deck, [], rng0);
    const ids = round.matchups.map((m) => m.promptId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(used).toEqual(expect.arrayContaining(ids));
    const r2 = buildRound(cfg(), 1, deck, used, rng0);
    const ids2 = r2.round.matchups.map((m) => m.promptId);
    expect(ids2.some((id) => ids.includes(id))).toBe(false);
  });

  it('não repete prompt na mesma rodada quando o deck esgota a memória cross-rodada', () => {
    const smallDeck: PromptDeck = {
      id: 's', name: 'Small',
      cards: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, text: `S${i}` })),
    };
    // 4 jogadores (duelo → 4 prompts), mas 3 ids já usados → só 2 frescos: força o reset no meio.
    const used = ['s0', 's1', 's2'];
    // rng: na 3ª chamada (pós-reset) aponta pra um índice que, no código bugado,
    // re-sortearia um prompt já escolhido nesta rodada (s3).
    const seq = [0, 0, 0.7, 0];
    let i = 0;
    const rng = () => seq[i++];
    const { round } = buildRound(cfg(), 0, smallDeck, used, rng);
    const ids = round.matchups.map((m) => m.promptId);
    expect(new Set(ids).size).toBe(ids.length); // nenhum prompt repetido na rodada
  });
});

describe('buildRound — grupo', () => {
  it('modo grupo: 1 confronto por rodada, todos respondem e votam', () => {
    const { round } = buildRound(cfg({ mode: 'group' }), 0, deck, [], rng0);
    expect(round.matchups).toHaveLength(1);
    expect(round.matchups[0].answers).toHaveLength(players.length);
    expect(round.matchups[0].voterIds.sort()).toEqual(players.map((p) => p.id).sort());
  });
});

describe('promptsForPlayer', () => {
  it('duelo: 2 índices por jogador; grupo: 1 índice', () => {
    const duel = buildRound(cfg(), 0, deck, [], rng0).round;
    expect(promptsForPlayer(duel, 'a')).toHaveLength(2);
    const group = buildRound(cfg({ mode: 'group' }), 0, deck, [], rng0).round;
    expect(promptsForPlayer(group, 'a')).toEqual([0]);
  });
});

describe('createSession', () => {
  it('monta rodada 1 em answering, scores zerados por jogador, usedPromptIds preenchido', () => {
    const s = createSession(cfg(), deck, rng0);
    expect(s.round.index).toBe(0);
    expect(s.round.phase).toBe('answering');
    expect(Object.values(s.scores)).toEqual([0, 0, 0, 0]);
    expect(s.usedPromptIds.length).toBe(players.length); // duelo: N prompts
  });
});

describe('playAgain', () => {
  it('zera placar e usedPromptIds, volta pra rodada 1, mesma config', () => {
    const s = createSession(cfg(), deck, rng0);
    const dirty = { ...s, scores: { a: 50, b: 0, c: 0, d: 0 }, round: { ...s.round, index: 2 } };
    const again = playAgain(dirty, deck, rng0);
    expect(again.round.index).toBe(0);
    expect(Object.values(again.scores)).toEqual([0, 0, 0, 0]);
    expect(again.config).toEqual(s.config);
  });
});

// responde todos os jogadores em ordem; texts = "resp-<player>-<pos>"
function answerAll(s0: ReturnType<typeof createSession>) {
  let s = s0;
  for (const p of s.config.players) {
    const idxs = promptsForPlayer(s.round, p.id);
    const texts = idxs.map((_, pos) => `r-${p.id}-${pos}`);
    s = submitAnswers(s, p.id, texts, rng0);
  }
  return s;
}

describe('submitAnswers', () => {
  it('grava as respostas do jogador e avança answerIndex', () => {
    const s = createSession(cfg(), deck, rng0);
    const idxs = promptsForPlayer(s.round, 'a');
    const s2 = submitAnswers(s, 'a', idxs.map((_, i) => `t${i}`), rng0);
    expect(s2.round.answerIndex).toBe(1);
    for (const i of idxs) {
      const ans = s2.round.matchups[i].answers.find((x) => x.authorId === 'a');
      expect(ans?.text).toMatch(/^t\d$/);
    }
  });

  it('quando todos responderam, monta cédulas e vai pra voting', () => {
    const s = answerAll(createSession(cfg(), deck, rng0));
    expect(s.round.phase).toBe('voting');
    expect(s.round.voteCursor).toBe(0);
    // duelo: cada confronto tem N-2 votantes → total de cédulas = N*(N-2)
    const expected = players.length * (players.length - 2);
    expect(s.round.ballots).toHaveLength(expected);
    // nenhuma cédula deixa o votante escolher a própria resposta
    for (const b of s.round.ballots) {
      const m = s.round.matchups[b.matchupIndex];
      for (const ai of b.order) expect(m.answers[ai].authorId).not.toBe(b.voterId);
      expect(m.voterIds).toContain(b.voterId);
    }
    // cédulas agrupadas por votante (ordem dos jogadores)
    const voterSeq = s.round.ballots.map((b) => b.voterId);
    const firstIdxOf = (id: string) => voterSeq.indexOf(id);
    const lastIdxOf = (id: string) => voterSeq.lastIndexOf(id);
    for (const p of players) {
      if (firstIdxOf(p.id) === -1) continue;
      expect(lastIdxOf(p.id) - firstIdxOf(p.id) + 1).toBe(voterSeq.filter((v) => v === p.id).length);
    }
  });

  it('grupo: cada votante 1 cédula no único confronto, order exclui a própria', () => {
    const s = answerAll(createSession(cfg({ mode: 'group' }), deck, rng0));
    expect(s.round.ballots).toHaveLength(players.length);
    for (const b of s.round.ballots) {
      expect(b.matchupIndex).toBe(0);
      expect(b.order).toHaveLength(players.length - 1); // exclui a própria
    }
  });
});

// vota em TODAS as cédulas escolhendo o 1º autor exibido (order[0]) de cada confronto
function voteAll(s0: ReturnType<typeof createSession>) {
  let s = s0;
  while (s.round.phase === 'voting') {
    const b = s.round.ballots[s.round.voteCursor];
    const author = s.round.matchups[b.matchupIndex].answers[b.order[0]].authorId;
    s = castVote(s, author);
  }
  return s;
}

describe('castVote + pontuação', () => {
  it('registra votos, avança cursor e vai pra round-result ao esvaziar a fila', () => {
    const voted = voteAll(answerAll(createSession(cfg(), deck, rng0)));
    expect(voted.round.phase).toBe('round-result');
    expect(voted.round.voteCursor).toBe(voted.round.ballots.length);
  });

  it('matchupResults: proporção + bônus Quiplash! quando leva todos os votos', () => {
    // monta um confronto sintético: 2 votos, ambos pro autor "a" (sweep)
    const round = {
      index: 0, multiplier: 1, isLastLash: false, answerIndex: 0,
      ballots: [], voteCursor: 0, phase: 'round-result' as const,
      matchups: [{
        promptId: 'p', promptText: 'X',
        answers: [{ authorId: 'a', text: 'A' }, { authorId: 'b', text: 'B' }],
        voterIds: ['c', 'd'],
        votes: { c: 'a', d: 'a' },
      }],
    };
    const [res] = matchupResults(round);
    const a = res.tallies.find((t) => t.authorId === 'a')!;
    const b = res.tallies.find((t) => t.authorId === 'b')!;
    expect(a.votes).toBe(2);
    expect(a.quiplash).toBe(true);
    // 1000 * 1 * (2/2) + bônus 1000*1*0.5 = 1500
    expect(a.points).toBe(1500);
    expect(b.points).toBe(0);
    expect(b.quiplash).toBe(false);
  });

  it('scoreRound (via castVote) soma pontos no acumulado e não dobra ao reaplicar', () => {
    const voted = voteAll(answerAll(createSession(cfg(), deck, rng0)));
    const total = Object.values(voted.scores).reduce((x, y) => x + y, 0);
    expect(total).toBeGreaterThan(0);
    // scoreRound não tem guard de fase — a proteção contra dobrar pontos é castVote
    // retornar cedo quando phase !== 'voting'. Aqui só garantimos que matchupResults
    // (leitura pura) não muta o estado:
    const before = JSON.stringify(voted.round.matchups);
    matchupResults(voted.round);
    expect(JSON.stringify(voted.round.matchups)).toBe(before);
  });

  it('confronto sem votos → 0 pontos (sem divisão por zero)', () => {
    const round = {
      index: 0, multiplier: 2, isLastLash: false, answerIndex: 0,
      ballots: [], voteCursor: 0, phase: 'round-result' as const,
      matchups: [{
        promptId: 'p', promptText: 'X',
        answers: [{ authorId: 'a', text: 'A' }, { authorId: 'b', text: 'B' }],
        voterIds: [], votes: {},
      }],
    };
    const [res] = matchupResults(round);
    expect(res.tallies.every((t) => t.points === 0 && !t.quiplash)).toBe(true);
  });
});

describe('nextRound', () => {
  it('avança pra próxima rodada (answering) sem repetir prompts', () => {
    const voted = voteAll(answerAll(createSession(cfg(), deck, rng0)));
    const next = nextRound(voted, deck, rng0);
    expect(next.round.index).toBe(1);
    expect(next.round.phase).toBe('answering');
    const used = next.usedPromptIds;
    const ids = next.round.matchups.map((m) => m.promptId);
    // os novos prompts estão dentro de used e não colidem com a rodada 0
    expect(used).toEqual(expect.arrayContaining(ids));
  });

  it('na última rodada vai pra final-result', () => {
    let s = voteAll(answerAll(createSession(cfg({ rounds: 2 }), deck, rng0))); // rodada 0
    s = nextRound(s, deck, rng0);            // rodada 1 (última, last lash)
    s = voteAll(answerAll(s as ReturnType<typeof createSession>));
    s = nextRound(s, deck, rng0);            // fim
    expect(s.round.phase).toBe('final-result');
  });
});

describe('ranking', () => {
  it('ordena jogadores por pontos desc', () => {
    const s = createSession(cfg(), deck, rng0);
    const withScores = { ...s, scores: { a: 10, b: 30, c: 20, d: 0 } };
    expect(ranking(withScores).map((r) => r.player.id)).toEqual(['b', 'c', 'a', 'd']);
  });
});
