// Proof #1: o Quiplash real (engine promptvote) rodando pela camada genérica
// (roomEngine) com 3 clientes simulados. Prova que a abstração NetGame segura um
// jogo de informação secreta de verdade: cada cliente recebe SÓ a sua projeção e
// nenhum segredo (resposta alheia, autoria no voto) vaza pela rede.
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { createRoom, reduceRoom } from '../server/roomEngine';
import type { EngineDeps, EngineResult, RoomState } from '../server/roomEngine';
import { quiplashNet } from './quiplash';
import type { QuiplashNetState } from './quiplash';
import { promptsForPlayer } from '../../games/promptvote/quiplash/logic';

type RS = RoomState<QuiplashNetState>;
const PLAYERS = ['a', 'b', 'c'];

const deps = (now = 1000): EngineDeps<QuiplashNetState, any, any, any> => ({
  game: quiplashNet,
  config: { mode: 'duel', rounds: 2, deckId: 'quiplash-padrao', answerSeconds: 60, voteSeconds: 30 },
  minPlayers: 3,
  now,
  rng: mulberry32(1),
});

function game(s: RS): QuiplashNetState {
  if (!s.game) throw new Error('sem jogo em curso');
  return s.game;
}

function startedRoom(now = 2000): RS {
  let r = reduceRoom(createRoom('WXYZ'), { kind: 'join', playerId: 'a', nickname: 'Ana' }, deps());
  r = reduceRoom(r.state, { kind: 'join', playerId: 'b', nickname: 'Bia' }, deps());
  r = reduceRoom(r.state, { kind: 'join', playerId: 'c', nickname: 'Cau' }, deps());
  return reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps(now)).state;
}

/** Submete respostas de todos; devolve o resultado da última chamada (a que vira voting). */
function answerAll(s: RS, now = 3000): EngineResult<QuiplashNetState> {
  let last!: EngineResult<QuiplashNetState>;
  let st = s;
  for (const pid of PLAYERS) {
    const idxs = promptsForPlayer(game(st).session.round, pid);
    const action = { type: 'SUBMIT_ANSWERS', texts: idxs.map((i) => `${pid}-secreto-${i}`) };
    last = reduceRoom(st, { kind: 'action', playerId: pid, action }, deps(now));
    st = last.state;
  }
  return last;
}

/** Vota todas as cédulas de todos; devolve o resultado da última chamada (a que vira round-result). */
function voteAll(s: RS, now = 9000): EngineResult<QuiplashNetState> {
  let last!: EngineResult<QuiplashNetState>;
  let st = s;
  for (const pid of PLAYERS) {
    const round = game(st).session.round;
    const pending = round.ballots.filter(
      (b) => b.voterId === pid && round.matchups[b.matchupIndex].votes[pid] === undefined,
    );
    for (const b of pending) {
      last = reduceRoom(
        st,
        { kind: 'action', playerId: pid, action: { type: 'CAST_VOTE', matchupIndex: b.matchupIndex, choice: 0 } },
        deps(now),
      );
      st = last.state;
    }
  }
  return last;
}

describe('Quiplash via roomEngine (proof #1)', () => {
  it('start manda projeção por-jogador e agenda o deadline do answering', () => {
    let r = reduceRoom(createRoom('WXYZ'), { kind: 'join', playerId: 'a', nickname: 'Ana' }, deps());
    r = reduceRoom(r.state, { kind: 'join', playerId: 'b', nickname: 'Bia' }, deps());
    r = reduceRoom(r.state, { kind: 'join', playerId: 'c', nickname: 'Cau' }, deps());
    const started = reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps(2000));
    expect(started.state.phase).toBe('playing');
    for (const id of PLAYERS) {
      expect(started.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
    expect(started.deadline).toBe(2000 + 60 * 1000);
  });

  it('a resposta secreta de A não aparece na projeção mandada pra B', () => {
    const s = startedRoom();
    const idxs = promptsForPlayer(game(s).session.round, 'a');
    const r = reduceRoom(
      s,
      { kind: 'action', playerId: 'a', action: { type: 'SUBMIT_ANSWERS', texts: idxs.map(() => 'resposta-secreta-da-ana') } },
      deps(2100),
    );
    const toB = r.outbound.find((o) => o.to === 'b' && o.msg.t === 'projection')!;
    expect(JSON.stringify(toB.msg)).not.toContain('resposta-secreta-da-ana');
  });

  it('fluxo completo answering→voting→round-result com projeção por-jogador e voto anônimo', () => {
    const s = startedRoom();
    const toVoting = answerAll(s, 3000);
    expect(game(toVoting.state).session.round.phase).toBe('voting');
    // todos recebem projeção de voting…
    for (const id of PLAYERS) {
      expect(toVoting.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
    // …e nenhuma projeção de voting revela a autoria (sem "authorId" no fio)
    for (const o of toVoting.outbound) {
      if (o.msg.t === 'projection') expect(JSON.stringify(o.msg)).not.toContain('authorId');
    }

    const toResult = voteAll(toVoting.state, 9000);
    expect(game(toResult.state).session.round.phase).toBe('round-result');
    for (const id of PLAYERS) {
      expect(toResult.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
    const total = Object.values(game(toResult.state).session.scores).reduce((a, b) => a + b, 0);
    expect(total).toBe(4500);
  });
});
