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
