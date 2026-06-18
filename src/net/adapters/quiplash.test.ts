import { describe, it, expect } from 'vitest';
import { quiplashNet } from './quiplash';
import type { QuiplashNetConfig, QuiplashNetState } from './quiplash';
import { mulberry32 } from '../rng';
import { promptsForPlayer, submitAnswers } from '../../games/promptvote/quiplash/logic';

const players = [
  { id: 'p1', nickname: 'Ana' },
  { id: 'p2', nickname: 'Bia' },
  { id: 'p3', nickname: 'Cid' },
];

const config: QuiplashNetConfig = {
  mode: 'duel',
  rounds: 2,
  deckId: 'quiplash-padrao',
  answerSeconds: 60,
  voteSeconds: 30,
};

function init(seed = 1) {
  return quiplashNet.createInitial({ config, players, now: 1000, rng: mulberry32(seed) });
}

function ctx(actorId: string, now = 2000, seed = 7) {
  return { now, rng: mulberry32(seed), actorId };
}

/** Leva o estado de answering até voting submetendo `text` por todos os jogadores. */
function reachVoting(now = 5000): QuiplashNetState {
  let s = init();
  for (const pid of ['p1', 'p2', 'p3']) {
    const idxs = promptsForPlayer(s.session.round, pid);
    s = quiplashNet.reducer(
      s,
      { type: 'SUBMIT_ANSWERS', texts: idxs.map((i) => `${pid}_resp${i}`) },
      ctx(pid, now),
    );
  }
  return s;
}

describe('quiplashNet.createInitial', () => {
  it('começa em answering com scores zerados e deadline do answering', () => {
    const s = init();
    expect(s.session.round.phase).toBe('answering');
    expect(s.session.scores).toEqual({ p1: 0, p2: 0, p3: 0 });
    expect(s.endsAt).toBe(1000 + 60 * 1000);
    expect(s.answered).toEqual([]);
  });

  it('usa o apelido do lobby como nome do jogador na config', () => {
    const s = init();
    expect(s.session.config.players).toEqual([
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Bia' },
      { id: 'p3', name: 'Cid' },
    ]);
  });
});

describe('quiplashNet.project — answering', () => {
  it('mostra ao jogador só os próprios prompts, com yourText vazio no início', () => {
    const s = init();
    const proj = quiplashNet.project(s, 'p1');
    if (proj.phase !== 'answering') throw new Error('esperava fase answering');
    expect(proj.prompts.map((p) => p.matchupIndex)).toEqual([0, 2]);
    expect(proj.prompts.every((p) => p.promptText.length > 0)).toBe(true);
    expect(proj.prompts.every((p) => p.yourText === '')).toBe(true);
    expect(proj.submitted).toBe(false);
    expect(proj.answeredCount).toBe(0);
    expect(proj.total).toBe(3);
    expect(proj.endsAt).toBe(s.endsAt);
  });

  it('NÃO vaza a resposta de outro jogador (projeção secreta)', () => {
    const s = init();
    const idxs = promptsForPlayer(s.session.round, 'p2');
    const withP2: QuiplashNetState = {
      ...s,
      session: submitAnswers(s.session, 'p2', idxs.map(() => 'SEGREDO_P2')),
      answered: ['p2'],
    };
    const projP1 = quiplashNet.project(withP2, 'p1');
    expect(JSON.stringify(projP1)).not.toContain('SEGREDO_P2');
    if (projP1.phase !== 'answering') throw new Error('esperava fase answering');
    expect(projP1.answeredCount).toBe(1);
    expect(projP1.submitted).toBe(false);
  });

  it('reflete o próprio texto e submitted=true pro autor que já respondeu', () => {
    const s = init();
    const idxs = promptsForPlayer(s.session.round, 'p1');
    const withP1: QuiplashNetState = {
      ...s,
      session: submitAnswers(s.session, 'p1', idxs.map((i) => `resp_${i}`)),
      answered: ['p1'],
    };
    const proj = quiplashNet.project(withP1, 'p1');
    if (proj.phase !== 'answering') throw new Error('esperava fase answering');
    expect(proj.submitted).toBe(true);
    expect(proj.prompts.map((p) => p.yourText)).toEqual(idxs.map((i) => `resp_${i}`));
  });
});

describe('quiplashNet — answering: reducer + legalActions', () => {
  it('SUBMIT_ANSWERS grava as respostas do ator e o adiciona a answered', () => {
    const s = init();
    const idxs = promptsForPlayer(s.session.round, 'p1');
    const next = quiplashNet.reducer(s, { type: 'SUBMIT_ANSWERS', texts: idxs.map(() => 'oi') }, ctx('p1'));
    expect(next.answered).toEqual(['p1']);
    expect(next.session.round.phase).toBe('answering'); // só 1 de 3 respondeu
    const proj = quiplashNet.project(next, 'p1');
    if (proj.phase !== 'answering') throw new Error('fase');
    expect(proj.submitted).toBe(true);
  });

  it('SUBMIT_ANSWERS duplicado do mesmo ator é no-op (estado inalterado)', () => {
    const s = init();
    const idxs = promptsForPlayer(s.session.round, 'p1');
    const once = quiplashNet.reducer(s, { type: 'SUBMIT_ANSWERS', texts: idxs.map(() => 'a') }, ctx('p1'));
    const twice = quiplashNet.reducer(once, { type: 'SUBMIT_ANSWERS', texts: idxs.map(() => 'b') }, ctx('p1'));
    expect(twice).toBe(once);
  });

  it('legalActions: pode SUBMIT_ANSWERS antes de responder, não depois', () => {
    const s = init();
    expect(quiplashNet.legalActions(s, 'p1')).toEqual(['SUBMIT_ANSWERS']);
    const idxs = promptsForPlayer(s.session.round, 'p1');
    const next = quiplashNet.reducer(s, { type: 'SUBMIT_ANSWERS', texts: idxs.map(() => 'x') }, ctx('p1'));
    expect(quiplashNet.legalActions(next, 'p1')).toEqual([]);
  });

  it('quando todos respondem, vai pra voting e atualiza o deadline pro voteSeconds', () => {
    const s = reachVoting(5000);
    expect(s.session.round.phase).toBe('voting');
    expect(s.endsAt).toBe(5000 + 30 * 1000); // voteSeconds=30
  });
});

describe('quiplashNet.project — voting', () => {
  it('mostra a(s) cédula(s) do votante com opções anônimas por índice (sem authorId)', () => {
    const s = reachVoting();
    const proj = quiplashNet.project(s, 'p1');
    if (proj.phase !== 'voting') throw new Error('esperava voting');
    // 3 jogadores em duelo: cada um vota em exatamente 1 confronto
    expect(proj.ballots.length).toBe(1);
    const b = proj.ballots[0];
    expect(b.matchupIndex).toBe(1);
    expect(b.options.map((o) => o.choice)).toEqual([0, 1]);
    expect(b.options.every((o) => o.text.length > 0)).toBe(true);
    expect(b.options.every((o) => !('authorId' in o))).toBe(true);
    expect(b.yourChoice).toBeNull();
  });

  it('votante NÃO vê a própria resposta entre as opções', () => {
    const s = reachVoting();
    const proj = quiplashNet.project(s, 'p1');
    if (proj.phase !== 'voting') throw new Error('voting');
    const texts = proj.ballots.flatMap((b) => b.options.map((o) => o.text));
    expect(texts).not.toContain('p1_resp0');
    expect(texts).not.toContain('p1_resp2');
  });

  it('endsAt da projeção de voting é o deadline de voto', () => {
    const s = reachVoting(8000);
    const proj = quiplashNet.project(s, 'p1');
    if (proj.phase !== 'voting') throw new Error('voting');
    expect(proj.endsAt).toBe(8000 + 30 * 1000);
  });
});

/** Vota TODAS as cédulas pendentes de cada voterId em `order`, sempre choice 0. */
function castAll(s: QuiplashNetState, order: string[], now = 9000): QuiplashNetState {
  let st = s;
  for (const v of order) {
    const pending = st.session.round.ballots.filter(
      (b) => b.voterId === v && st.session.round.matchups[b.matchupIndex].votes[v] === undefined,
    );
    for (const b of pending) {
      st = quiplashNet.reducer(st, { type: 'CAST_VOTE', matchupIndex: b.matchupIndex, choice: 0 }, ctx(v, now));
    }
  }
  return st;
}

const ALL = ['p1', 'p2', 'p3'];

/** Submete respostas de todos os jogadores na fase answering atual. */
function answerAll(s: QuiplashNetState, now = 5000): QuiplashNetState {
  let st = s;
  for (const pid of ALL) {
    if (!quiplashNet.legalActions(st, pid).includes('SUBMIT_ANSWERS')) continue;
    const idxs = promptsForPlayer(st.session.round, pid);
    st = quiplashNet.reducer(
      st,
      { type: 'SUBMIT_ANSWERS', texts: idxs.map((i) => `${pid}_r${st.session.round.index}_${i}`) },
      ctx(pid, now),
    );
  }
  return st;
}

/** Joga até final-result (rounds=2): rodada 0 + NEXT_ROUND + rodada 1 + NEXT_ROUND. */
function reachFinal(): QuiplashNetState {
  let s = castAll(reachVoting(), ALL); // rodada 0 → round-result
  s = quiplashNet.reducer(s, { type: 'NEXT_ROUND' }, ctx('p1', 6000)); // rodada 1 answering
  s = answerAll(s, 6000); // → voting
  s = castAll(s, ALL, 7000); // → round-result (last-lash)
  s = quiplashNet.reducer(s, { type: 'NEXT_ROUND' }, ctx('p1', 8000)); // → final-result
  return s;
}

describe('quiplashNet — voting: reducer + legalActions (concorrente)', () => {
  it('CAST_VOTE registra o voto; a projeção do ator reflete yourChoice', () => {
    const s = reachVoting();
    const next = quiplashNet.reducer(s, { type: 'CAST_VOTE', matchupIndex: 1, choice: 1 }, ctx('p1', 9000));
    const proj = quiplashNet.project(next, 'p1');
    if (proj.phase !== 'voting') throw new Error('esperava voting (faltam p2/p3)');
    expect(proj.ballots[0].yourChoice).toBe(1);
    expect(proj.votedCount).toBe(1);
  });

  it('voto duplicado na mesma cédula é no-op', () => {
    const s = reachVoting();
    const once = quiplashNet.reducer(s, { type: 'CAST_VOTE', matchupIndex: 1, choice: 0 }, ctx('p1', 9000));
    const twice = quiplashNet.reducer(once, { type: 'CAST_VOTE', matchupIndex: 1, choice: 1 }, ctx('p1', 9000));
    expect(twice).toBe(once);
  });

  it('CAST_VOTE num confronto que não é cédula do ator é no-op', () => {
    const s = reachVoting();
    const next = quiplashNet.reducer(s, { type: 'CAST_VOTE', matchupIndex: 0, choice: 0 }, ctx('p1', 9000));
    expect(next).toBe(s);
  });

  it('legalActions: CAST_VOTE com cédula pendente, vazio depois de votar', () => {
    const s = reachVoting();
    expect(quiplashNet.legalActions(s, 'p1')).toEqual(['CAST_VOTE']);
    const next = quiplashNet.reducer(s, { type: 'CAST_VOTE', matchupIndex: 1, choice: 0 }, ctx('p1', 9000));
    expect(quiplashNet.legalActions(next, 'p1')).toEqual([]);
  });

  it('quando TODAS as cédulas são preenchidas, vai pra round-result e pontua', () => {
    const done = castAll(reachVoting(), ['p1', 'p2', 'p3']);
    expect(done.session.round.phase).toBe('round-result');
    const total = Object.values(done.session.scores).reduce((a, b) => a + b, 0);
    expect(total).toBe(4500); // 3 confrontos × (1000 + 500 quiplash), 1 votante cada
  });

  it('o resultado independe da ordem em que os votos chegam (concorrência)', () => {
    const a = castAll(reachVoting(), ['p1', 'p2', 'p3']);
    const b = castAll(reachVoting(), ['p3', 'p1', 'p2']);
    expect(b.session.scores).toEqual(a.session.scores);
  });
});

describe('quiplashNet.project — round-result', () => {
  it('é público: results + ranking ordenado + multiplier', () => {
    const done = castAll(reachVoting(), ['p1', 'p2', 'p3']);
    const proj = quiplashNet.project(done, 'p2');
    if (proj.phase !== 'round-result') throw new Error('esperava round-result');
    expect(proj.multiplier).toBe(1);
    expect(proj.isLastLash).toBe(false);
    expect(proj.results.length).toBe(3);
    const scores = proj.ranking.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(proj.ranking.every((r) => typeof r.name === 'string' && typeof r.id === 'string')).toBe(true);
    expect(proj.ranking.reduce((a, r) => a + r.score, 0)).toBe(4500);
  });
});

describe('quiplashNet — avanço de rodada', () => {
  it('NEXT_ROUND de round-result vai pra próxima rodada (answering), zera answered e recarimba deadline', () => {
    const rr = castAll(reachVoting(), ALL);
    const next = quiplashNet.reducer(rr, { type: 'NEXT_ROUND' }, ctx('p1', 6000));
    expect(next.session.round.phase).toBe('answering');
    expect(next.session.round.index).toBe(1);
    expect(next.answered).toEqual([]);
    expect(next.endsAt).toBe(6000 + 60 * 1000); // answerSeconds=60
  });

  it('NEXT_ROUND concorrente/duplicado é idempotente (2º vira no-op)', () => {
    const rr = castAll(reachVoting(), ALL);
    const once = quiplashNet.reducer(rr, { type: 'NEXT_ROUND' }, ctx('p1', 6000));
    const twice = quiplashNet.reducer(once, { type: 'NEXT_ROUND' }, ctx('p2', 6000));
    expect(twice).toBe(once);
  });

  it('legalActions: NEXT_ROUND em round-result, não em answering', () => {
    const rr = castAll(reachVoting(), ALL);
    expect(quiplashNet.legalActions(rr, 'p1')).toEqual(['NEXT_ROUND']);
    const next = quiplashNet.reducer(rr, { type: 'NEXT_ROUND' }, ctx('p1', 6000));
    expect(quiplashNet.legalActions(next, 'p1')).not.toContain('NEXT_ROUND');
  });

  it('última rodada → NEXT_ROUND leva a final-result (ranking público + PLAY_AGAIN liberado)', () => {
    const fin = reachFinal();
    expect(fin.session.round.phase).toBe('final-result');
    const proj = quiplashNet.project(fin, 'p1');
    if (proj.phase !== 'final-result') throw new Error('esperava final-result');
    expect(proj.ranking.length).toBe(3);
    expect(quiplashNet.legalActions(fin, 'p1')).toEqual(['PLAY_AGAIN']);
  });

  it('PLAY_AGAIN de final-result reinicia (answering, rodada 0, scores zerados)', () => {
    const fin = reachFinal();
    const again = quiplashNet.reducer(fin, { type: 'PLAY_AGAIN' }, ctx('p1', 9000));
    expect(again.session.round.phase).toBe('answering');
    expect(again.session.round.index).toBe(0);
    expect(Object.values(again.session.scores).every((v) => v === 0)).toBe(true);
    expect(again.answered).toEqual([]);
    expect(again.endsAt).toBe(9000 + 60 * 1000);
  });
});

describe('quiplashNet — deadline + onTimeout', () => {
  it('deadline é endsAt em answering/voting e null em resultado', () => {
    expect(quiplashNet.deadline!(init())).toBe(init().endsAt);
    const v = reachVoting();
    expect(quiplashNet.deadline!(v)).toBe(v.endsAt);
    expect(quiplashNet.deadline!(castAll(reachVoting(), ALL))).toBeNull();
    expect(quiplashNet.deadline!(reachFinal())).toBeNull();
  });

  it('timeout no answering força ida pra voting (quem não respondeu fica em branco)', () => {
    const s0 = init();
    const idxs = promptsForPlayer(s0.session.round, 'p1');
    const s1 = quiplashNet.reducer(s0, { type: 'SUBMIT_ANSWERS', texts: idxs.map(() => 'eu respondi') }, ctx('p1', 1000));
    expect(s1.session.round.phase).toBe('answering');
    const out = quiplashNet.onTimeout!(s1, { now: 50000, rng: mulberry32(3) });
    expect(out.session.round.phase).toBe('voting');
    expect(out.endsAt).toBe(50000 + 30 * 1000);
  });

  it('timeout no voting força round-result com os votos que houver', () => {
    const v = reachVoting();
    const b = v.session.round.ballots.find((bb) => bb.voterId === 'p1')!;
    const v1 = quiplashNet.reducer(v, { type: 'CAST_VOTE', matchupIndex: b.matchupIndex, choice: 0 }, ctx('p1', 9000));
    expect(v1.session.round.phase).toBe('voting');
    const out = quiplashNet.onTimeout!(v1, { now: 60000, rng: mulberry32(3) });
    expect(out.session.round.phase).toBe('round-result');
    expect(Object.values(out.session.scores).reduce((a, c) => a + c, 0)).toBeGreaterThan(0);
  });

  it('onTimeout em fase de resultado é no-op', () => {
    const rr = castAll(reachVoting(), ALL);
    expect(quiplashNet.onTimeout!(rr, { now: 99999, rng: mulberry32(1) })).toBe(rr);
  });
});
