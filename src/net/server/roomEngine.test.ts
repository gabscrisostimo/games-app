import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { promptvoteDemo } from '../__demo__/promptvoteDemo';
import type { DemoState } from '../__demo__/promptvoteDemo';
import { createRoom, reduceRoom } from './roomEngine';
import type { EngineDeps, RoomState } from './roomEngine';

type RS = RoomState<DemoState>;

const deps = (now = 1000): EngineDeps<DemoState, any, any, any> => ({
  game: promptvoteDemo,
  config: { promptSeconds: 75, voteSeconds: 60 },
  minPlayers: 3,
  now,
  rng: mulberry32(1),
});

function join(state: RS, playerId: string, nickname: string, now = 1000) {
  return reduceRoom(state, { kind: 'join', playerId, nickname }, deps(now));
}

describe('roomEngine — lobby/presença', () => {
  it('primeiro a entrar vira host; manda room snapshot pra todos', () => {
    const r = join(createRoom('WXYZ'), 'a', 'Ana');
    expect(r.state.hostId).toBe('a');
    expect(r.state.players).toEqual([{ id: 'a', nickname: 'Ana', present: true }]);
    expect(r.outbound).toContainEqual({
      to: 'all',
      msg: { t: 'room', room: { code: 'WXYZ', phase: 'lobby', hostId: 'a', minPlayers: 3, players: [{ id: 'a', nickname: 'Ana', present: true }] } },
    });
  });

  it('reconexão (mesmo playerId) re-marca presente sem duplicar', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = reduceRoom(r.state, { kind: 'disconnect', playerId: 'a' }, deps());
    expect(r.state.players[0].present).toBe(false);
    r = join(r.state, 'a', 'Ana');
    expect(r.state.players).toHaveLength(1);
    expect(r.state.players[0].present).toBe(true);
  });

  it('disconnect mantém a cadeira (não remove o jogador)', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = reduceRoom(r.state, { kind: 'disconnect', playerId: 'b' }, deps());
    expect(r.state.players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(r.state.players.find((p) => p.id === 'b')!.present).toBe(false);
  });
});

describe('roomEngine — start', () => {
  it('só o host inicia, e só com jogadores suficientes', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    // não-host tenta começar → erro só pra ele
    let bad = reduceRoom(r.state, { kind: 'start', playerId: 'b' }, deps());
    expect(bad.state.phase).toBe('lobby');
    expect(bad.outbound).toContainEqual({ to: 'b', msg: { t: 'error', message: expect.any(String) } });
    // host tenta com 2 < min 3 → erro
    bad = reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps());
    expect(bad.state.phase).toBe('lobby');
  });

  it('com host + min jogadores, começa e manda projeção por-jogador', () => {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = join(r.state, 'c', 'Cau');
    const started = reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps(2000));
    expect(started.state.phase).toBe('playing');
    // cada jogador recebe SUA projeção
    for (const id of ['a', 'b', 'c']) {
      expect(started.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
    // e há um deadline a agendar
    expect(started.deadline).toBe(2000 + 75 * 1000);
  });
});

describe('roomEngine — action routing + secrecy', () => {
  function startGame() {
    let r = join(createRoom('WXYZ'), 'a', 'Ana');
    r = join(r.state, 'b', 'Bia');
    r = join(r.state, 'c', 'Cau');
    return reduceRoom(r.state, { kind: 'start', playerId: 'a' }, deps(2000)).state;
  }

  it('ação ilegal (fase errada / não-ator) é barrada com erro só pro autor', () => {
    const s = startGame();
    const r = reduceRoom(s, { kind: 'action', playerId: 'a', action: { type: 'SUBMIT_VOTE', optionId: 'o0' } }, deps(2100));
    expect(r.outbound).toContainEqual({ to: 'a', msg: { t: 'error', message: expect.any(String) } });
  });

  it('SUBMIT_ANSWER de A não aparece na projeção mandada pra B', () => {
    let s = startGame();
    const r = reduceRoom(s, { kind: 'action', playerId: 'a', action: { type: 'SUBMIT_ANSWER', text: 'resposta-secreta-da-ana' } }, deps(2100));
    const toB = r.outbound.find((o) => o.to === 'b' && o.msg.t === 'projection')!;
    expect(JSON.stringify(toB.msg)).not.toContain('resposta-secreta-da-ana');
  });

  it('timeout avança a fase e re-projeta pra todos', () => {
    let s = startGame();
    const r = reduceRoom(s, { kind: 'timeout' }, deps(999999));
    // demo: answering -> voting
    expect((r.state.game as DemoState).phase).toBe('voting');
    for (const id of ['a', 'b', 'c']) {
      expect(r.outbound.some((o) => o.to === id && o.msg.t === 'projection')).toBe(true);
    }
  });
});
