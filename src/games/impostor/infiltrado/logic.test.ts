import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../net/rng';
import { infiltrado as G } from './logic';
import type { InfiltradoConfig, InfiltradoState } from './types';

const players = [
  { id: 'a', nickname: 'Ana' }, { id: 'b', nickname: 'Bia' }, { id: 'c', nickname: 'Cau' },
  { id: 'd', nickname: 'Dan' },
];

const cfg = (over: Partial<InfiltradoConfig> = {}): InfiltradoConfig =>
  ({ impostorCount: 1, rounds: 0, answerSeconds: 90, voteSeconds: 60, ...over });

function init(over: Partial<InfiltradoConfig> = {}, now = 1000, seed = 1): InfiltradoState {
  return G.createInitial({ config: cfg(over), players, now, rng: mulberry32(seed) });
}
const ctx = (actorId: string, now = 2000, seed = 7) => ({ now, rng: mulberry32(seed), actorId });

describe('createInitial', () => {
  it('começa em answering, scores zerados, endsAt carimbado', () => {
    const s = init({}, 1000);
    expect(s.phase).toBe('answering');
    expect(s.endsAt).toBe(1000 + 90 * 1000);
    expect(s.scores).toEqual({ a: 0, b: 0, c: 0, d: 0 });
    expect(s.roundIndex).toBe(0);
  });

  it('totalRounds = nº de jogadores quando rounds=0', () => {
    expect(init({ rounds: 0 }).totalRounds).toBe(4);
    expect(init({ rounds: 2 }).totalRounds).toBe(2);
  });

  it('escolhe 1 impostor por padrão, dentro dos jogadores', () => {
    const s = init();
    expect(s.currentImpostors).toHaveLength(1);
    expect(players.map((p) => p.id)).toContain(s.currentImpostors[0]);
  });

  it('impostorSchedule tem totalRounds entradas', () => {
    const s = init({ rounds: 0 });
    expect(s.impostorSchedule).toHaveLength(4);
    s.impostorSchedule.forEach((r) => expect(r).toHaveLength(1));
  });
});

describe('answering — projeção secreta + envio', () => {
  it('impostor vê a pergunta impostora; os outros, a normal; ninguém sabe o papel', () => {
    const s = init();
    const imp = s.currentImpostors[0];
    const other = players.find((p) => p.id !== imp)!.id;
    const pi = G.project(s, imp);
    const po = G.project(s, other);
    expect(pi.phase === 'answering' && pi.yourQuestion).toBe(s.pair.impostor);
    expect(po.phase === 'answering' && po.yourQuestion).toBe(s.pair.normal);
    // nenhuma projeção revela o papel
    expect(JSON.stringify(pi)).not.toMatch(/impostor.*true|isImpostor|role/i);
    expect(JSON.stringify(po)).not.toContain(s.pair.impostor);
  });

  it('SUBMIT_ANSWER grava resposta; projeção não vaza resposta alheia', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segredo da Ana' }, ctx('a'));
    expect(s.answers.a).toBe('segredo da Ana');
    const pb = G.project(s, 'b');
    expect(JSON.stringify(pb)).not.toContain('segredo da Ana');
    expect(pb).toMatchObject({ phase: 'answering', yourAnswer: null, submitted: 1, total: 4 });
  });

  it('quando todos respondem, vai pra reveal com revealOrder cobrindo todos', () => {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `r-${p.id}` }, ctx(p.id));
    expect(s.phase).toBe('reveal');
    expect([...s.revealOrder].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(s.endsAt).toBeNull();
  });

  it('ignora resposta vazia e duplicada', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: '   ' }, ctx('a'));
    expect(s.answers.a).toBeUndefined();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'primeira' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segunda' }, ctx('a'));
    expect(s.answers.a).toBe('primeira');
  });
});

describe('reveal -> voting', () => {
  function reachReveal() {
    let s = init();
    for (const p of players) s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: `resp-${p.id}` }, ctx(p.id));
    return s;
  }

  it('reveal mostra todas as respostas com nome, na revealOrder', () => {
    const s = reachReveal();
    const p = G.project(s, 'a');
    expect(p.phase).toBe('reveal');
    if (p.phase !== 'reveal') return;
    expect(p.answers).toHaveLength(4);
    expect(p.answers.map((a) => a.id)).toEqual(s.revealOrder);
    expect(p.answers.find((a) => a.id === 'b')).toMatchObject({ nickname: 'Bia', answer: 'resp-b' });
  });

  it('ADVANCE (qualquer um) leva reveal -> voting e carimba endsAt', () => {
    const s = reachReveal();
    const v = G.reducer(s, { type: 'ADVANCE' }, ctx('c', 5000));
    expect(v.phase).toBe('voting');
    expect(v.endsAt).toBe(5000 + 60 * 1000);
  });

  it('voting projeta candidatos sem o próprio jogador', () => {
    let s = reachReveal();
    s = G.reducer(s, { type: 'ADVANCE' }, ctx('a', 5000));
    const p = G.project(s, 'a');
    expect(p.phase).toBe('voting');
    if (p.phase !== 'voting') return;
    expect(p.candidates.map((c) => c.id)).toEqual(['b', 'c', 'd']);
    expect(p.yourVote).toBeNull();
    expect(p.total).toBe(4);
  });
});
