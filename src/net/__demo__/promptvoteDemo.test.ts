import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { promptvoteDemo as G } from './promptvoteDemo';
import type { DemoState } from './promptvoteDemo';

const players = [
  { id: 'a', nickname: 'Ana' },
  { id: 'b', nickname: 'Bia' },
  { id: 'c', nickname: 'Cau' },
];

function init(now = 1000): DemoState {
  return G.createInitial({
    config: { promptSeconds: 75, voteSeconds: 60 },
    players,
    now,
    rng: mulberry32(1),
  });
}

describe('promptvoteDemo — answering', () => {
  it('começa em answering com prompt, endsAt e scores zerados', () => {
    const s = init(1000);
    expect(s.phase).toBe('answering');
    expect(typeof s.prompt).toBe('string');
    expect(s.endsAt).toBe(1000 + 75 * 1000);
    expect(s.scores).toEqual({ a: 0, b: 0, c: 0 });
  });

  it('SUBMIT_ANSWER grava a resposta do ator', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'minha resposta' }, ctx('a'));
    expect(s.answers.a).toBe('minha resposta');
    expect(s.phase).toBe('answering');
  });

  it('ignora resposta vazia e resposta duplicada', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: '   ' }, ctx('a'));
    expect(s.answers.a).toBeUndefined();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'primeira' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segunda' }, ctx('a'));
    expect(s.answers.a).toBe('primeira');
  });

  it('projeção em answering NÃO vaza resposta de outro jogador', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'segredo da Ana' }, ctx('a'));
    const pbView = G.project(s, 'b');
    expect(JSON.stringify(pbView)).not.toContain('segredo da Ana');
    expect(pbView).toMatchObject({ phase: 'answering', yourAnswer: null, submitted: 1, total: 3 });
    const paView = G.project(s, 'a');
    expect(paView).toMatchObject({ yourAnswer: 'segredo da Ana' });
  });

  it('legalActions: pode responder até enviar, depois não', () => {
    let s = init();
    expect(G.legalActions(s, 'a')).toEqual(['SUBMIT_ANSWER']);
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'oi' }, ctx('a'));
    expect(G.legalActions(s, 'a')).toEqual([]);
  });

  it('quando todos respondem, avança pra voting', () => {
    let s = init();
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'ra' }, ctx('a'));
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'rb' }, ctx('b'));
    expect(s.phase).toBe('answering');
    s = G.reducer(s, { type: 'SUBMIT_ANSWER', text: 'rc' }, ctx('c'));
    expect(s.phase).toBe('voting');
  });
});

function ctx(actorId: string) {
  return { now: 2000, rng: mulberry32(1), actorId };
}

import { promptvoteDemo as G2 } from './promptvoteDemo';
import type { DemoState as DS } from './promptvoteDemo';

function reachVoting(): DS {
  let s = G2.createInitial({
    config: { promptSeconds: 75, voteSeconds: 60 },
    players: [
      { id: 'a', nickname: 'Ana' },
      { id: 'b', nickname: 'Bia' },
      { id: 'c', nickname: 'Cau' },
    ],
    now: 1000,
    rng: mulberry32(3),
  });
  s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'AAA' }, { now: 1100, rng: mulberry32(3), actorId: 'a' });
  s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'BBB' }, { now: 1200, rng: mulberry32(3), actorId: 'b' });
  s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'CCC' }, { now: 1300, rng: mulberry32(3), actorId: 'c' });
  return s; // agora em voting
}

describe('promptvoteDemo — voting', () => {
  it('cria uma option por resposta com endsAt de voto', () => {
    const s = reachVoting();
    expect(s.phase).toBe('voting');
    expect(s.options).toHaveLength(3);
    expect(s.endsAt).toBe(1300 + 60 * 1000);
  });

  it('projeção de voto exclui a própria resposta e NÃO vaza autoria', () => {
    const s = reachVoting();
    const view = G2.project(s, 'a') as Extract<ReturnType<typeof G2.project>, { phase: 'voting' }>;
    expect(view.phase).toBe('voting');
    expect(view.options).toHaveLength(2); // sem a própria
    expect(view.options.some((o) => o.text === 'AAA')).toBe(false);
    expect(JSON.stringify(view.options)).not.toContain('authorId');
  });

  it('barra voto na própria resposta', () => {
    const s = reachVoting();
    const ownOpt = s.options.find((o) => o.authorId === 'a')!;
    const after = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: ownOpt.optionId }, { now: 1400, rng: mulberry32(3), actorId: 'a' });
    expect(after.votes.a).toBeUndefined();
  });

  it('quando todos votam, vai pra reveal e pontua os autores', () => {
    let s = reachVoting();
    const optOf = (author: string) => s.options.find((o) => o.authorId === author)!.optionId;
    // a e c votam na B; b vota na A
    s = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: optOf('b') }, { now: 1400, rng: mulberry32(3), actorId: 'a' });
    s = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: optOf('b') }, { now: 1500, rng: mulberry32(3), actorId: 'c' });
    s = G2.reducer(s, { type: 'SUBMIT_VOTE', optionId: optOf('a') }, { now: 1600, rng: mulberry32(3), actorId: 'b' });
    expect(s.phase).toBe('reveal');
    expect(s.scores.b).toBe(2);
    expect(s.scores.a).toBe(1);
    expect(s.scores.c).toBe(0);
  });
});

describe('promptvoteDemo — deadline/onTimeout', () => {
  it('deadline reflete a fase', () => {
    const s = reachVoting();
    expect(G2.deadline!(s)).toBe(s.endsAt);
  });

  it('onTimeout em answering força voting mesmo sem todos responderem', () => {
    let s = G2.createInitial({
      config: { promptSeconds: 75, voteSeconds: 60 },
      players: [
        { id: 'a', nickname: 'Ana' },
        { id: 'b', nickname: 'Bia' },
        { id: 'c', nickname: 'Cau' },
      ],
      now: 1000,
      rng: mulberry32(5),
    });
    s = G2.reducer(s, { type: 'SUBMIT_ANSWER', text: 'só a Ana' }, { now: 1100, rng: mulberry32(5), actorId: 'a' });
    expect(s.phase).toBe('answering');
    s = G2.onTimeout!(s, { now: 99999, rng: mulberry32(5) });
    expect(s.phase).toBe('voting');
    expect(s.options).toHaveLength(1); // só quem respondeu vira option
  });

  it('onTimeout em answering SEM nenhuma resposta vai direto pro reveal (não trava em voting vazio)', () => {
    let s = G2.createInitial({
      config: { promptSeconds: 75, voteSeconds: 60 },
      players: [
        { id: 'a', nickname: 'Ana' },
        { id: 'b', nickname: 'Bia' },
        { id: 'c', nickname: 'Cau' },
      ],
      now: 1000,
      rng: mulberry32(8),
    });
    s = G2.onTimeout!(s, { now: 99999, rng: mulberry32(8) });
    expect(s.phase).toBe('reveal');
    expect(s.options).toHaveLength(0);
  });
});
