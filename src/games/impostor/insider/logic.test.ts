import { describe, it, expect } from 'vitest';
import {
  nextMaster, createSession, selectMaster, roleOf, dealRoles,
  advanceReveal, startGuessing, markGuessed, timeUp, accuse, playAgain,
} from './logic';
import type { InsiderConfig, MasterMode, Player, WordDeck } from './types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Duda' },
  { id: 'e', name: 'Edu' },
];

const rng0 = () => 0; // sempre escolhe o primeiro elegível

describe('nextMaster', () => {
  it('com rotação vazia escolhe o primeiro elegível e o registra', () => {
    const r = nextMaster([], players, rng0);
    expect(r.masterId).toBe('a');
    expect(r.rotation).toEqual(['a']);
  });

  it('não repete até todos terem sido Mestre, depois reseta', () => {
    let rotation: string[] = [];
    const picked: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = nextMaster(rotation, players, rng0);
      picked.push(r.masterId);
      rotation = r.rotation;
    }
    // 5 primeiros cobrem todos sem repetir; o 6º reinicia o ciclo
    expect(new Set(picked.slice(0, 5)).size).toBe(5);
    expect(picked[5]).toBe('a');
    expect(rotation).toEqual(['a']);
  });

  it('é determinístico com rng fixo', () => {
    const last = () => 0.999;
    const r = nextMaster([], players, last);
    expect(r.masterId).toBe('e'); // floor(0.999 * 5) = 4
  });
});

const baseConfig = (masterMode: MasterMode): InsiderConfig => ({
  deckId: 'd1',
  guessSeconds: 300,
  players,
  masterMode,
});

describe('createSession', () => {
  it('rotate: escolhe Mestre e vai pra master-announce, sem palavra/insider', () => {
    const s = createSession(baseConfig('rotate'), rng0);
    expect(s.round.phase).toBe('master-announce');
    expect(s.round.masterId).toBe('a');
    expect(s.masterRotation).toEqual(['a']);
    expect(s.round.word).toBe('');
    expect(s.round.insiderId).toBe('');
    expect(s.round.endsAt).toBeNull();
    expect(s.round.outcome).toBeNull();
  });

  it('choose: vai pra master-select sem Mestre definido', () => {
    const s = createSession(baseConfig('choose'), rng0);
    expect(s.round.phase).toBe('master-select');
    expect(s.round.masterId).toBe('');
    expect(s.masterRotation).toEqual([]);
  });
});

describe('selectMaster', () => {
  it('fixa o Mestre e vai pra master-announce', () => {
    const s = createSession(baseConfig('choose'), rng0);
    const s2 = selectMaster(s, 'c');
    expect(s2.round.masterId).toBe('c');
    expect(s2.round.phase).toBe('master-announce');
  });

  it('é no-op fora da fase master-select', () => {
    const s = createSession(baseConfig('rotate'), rng0); // master-announce
    expect(selectMaster(s, 'c')).toBe(s);
  });
});

describe('roleOf', () => {
  it('deriva master/insider/commoner', () => {
    const s = createSession(baseConfig('rotate'), rng0); // masterId 'a'
    const withInsider = { ...s, round: { ...s.round, insiderId: 'b' } };
    expect(roleOf(withInsider, 'a')).toBe('master');
    expect(roleOf(withInsider, 'b')).toBe('insider');
    expect(roleOf(withInsider, 'c')).toBe('commoner');
  });
});

const deck: WordDeck = {
  id: 'd1',
  name: 'Teste',
  cards: [
    { id: 'w1', word: 'GIRAFA' },
    { id: 'w2', word: 'PRAIA' },
    { id: 'w3', word: 'VIOLÃO' },
  ],
};

describe('dealRoles', () => {
  it('sorteia palavra e insider (não-Mestre) e vai pra role-reveal', () => {
    const s = createSession(baseConfig('rotate'), rng0); // masterId 'a', master-announce
    const s2 = dealRoles(s, deck, rng0);
    expect(s2.round.phase).toBe('role-reveal');
    expect(s2.round.word).toBe('GIRAFA'); // rng0 → carta 0
    expect(s2.round.insiderId).toBe('b'); // primeiro não-Mestre
    expect(s2.round.revealIndex).toBe(0);
  });

  it('o Insider nunca é o Mestre, mesmo com rng no extremo', () => {
    const s = createSession(baseConfig('rotate'), rng0); // masterId 'a'
    const s2 = dealRoles(s, deck, () => 0.999);
    expect(s2.round.insiderId).not.toBe(s2.round.masterId);
    expect(['b', 'c', 'd', 'e']).toContain(s2.round.insiderId);
  });

  it('é no-op fora da fase master-announce', () => {
    const s = createSession(baseConfig('choose'), rng0); // master-select
    expect(dealRoles(s, deck, rng0)).toBe(s);
  });
});

describe('advanceReveal', () => {
  it('avança jogador a jogador e entra em guessing após o último', () => {
    const dealt = dealRoles(createSession(baseConfig('rotate'), rng0), deck, rng0);
    // 5 jogadores → revealIndex 0..4; o 5º avanço entra em guessing
    let s = dealt;
    for (let i = 0; i < 4; i++) {
      s = advanceReveal(s);
      expect(s.round.phase).toBe('role-reveal');
    }
    s = advanceReveal(s);
    expect(s.round.phase).toBe('guessing');
    expect(s.round.endsAt).toBeNull();
    expect(s.round.revealIndex).toBe(5);
  });
});

describe('startGuessing', () => {
  it('define endsAt = now + guessSeconds*1000', () => {
    const dealt = dealRoles(createSession(baseConfig('rotate'), rng0), deck, rng0);
    let s = dealt;
    for (let i = 0; i < 5; i++) s = advanceReveal(s); // → guessing
    const started = startGuessing(s, 1000);
    expect(started.round.endsAt).toBe(1000 + 300 * 1000);
  });

  it('é no-op fora de guessing', () => {
    const dealt = dealRoles(createSession(baseConfig('rotate'), rng0), deck, rng0); // role-reveal
    expect(startGuessing(dealt, 1000)).toBe(dealt);
  });
});

function guessingState() {
  const dealt = dealRoles(createSession(baseConfig('rotate'), rng0), deck, rng0); // master 'a', insider 'b'
  let s = dealt;
  for (let i = 0; i < 5; i++) s = advanceReveal(s); // → guessing
  return startGuessing(s, 1000);
}

describe('markGuessed', () => {
  it('vai de guessing para insider-hunt', () => {
    const s = markGuessed(guessingState());
    expect(s.round.phase).toBe('insider-hunt');
  });
});

describe('timeUp', () => {
  it('encerra como not-guessed e pula a caça', () => {
    const s = timeUp(guessingState());
    expect(s.round.phase).toBe('result');
    expect(s.round.outcome).toBe('not-guessed');
    expect(s.round.accusation).toBeNull();
  });
});

describe('accuse', () => {
  it('acertar o Insider → insider-caught', () => {
    const hunt = markGuessed(guessingState()); // insider 'b'
    const s = accuse(hunt, { kind: 'player', id: 'b' });
    expect(s.round.outcome).toBe('insider-caught');
    expect(s.round.phase).toBe('result');
  });
  it('acusar outro jogador → insider-escaped', () => {
    const hunt = markGuessed(guessingState());
    expect(accuse(hunt, { kind: 'player', id: 'c' }).round.outcome).toBe('insider-escaped');
  });
  it('acusar o Mestre → insider-escaped', () => {
    const hunt = markGuessed(guessingState());
    expect(accuse(hunt, { kind: 'player', id: 'a' }).round.outcome).toBe('insider-escaped');
  });
  it('"Ninguém" → insider-escaped', () => {
    const hunt = markGuessed(guessingState());
    expect(accuse(hunt, { kind: 'nobody' }).round.outcome).toBe('insider-escaped');
  });
});

describe('playAgain', () => {
  it('rotate: carrega a rotação e escolhe o próximo Mestre sem repetir', () => {
    const finished = accuse(markGuessed(guessingState()), { kind: 'player', id: 'b' });
    // rotação atual: ['a'] (Mestre da rodada anterior)
    const again = playAgain(finished, rng0);
    expect(again.round.phase).toBe('master-announce');
    expect(again.round.masterId).toBe('b'); // próximo elegível com rng0
    expect(again.masterRotation).toEqual(['a', 'b']);
    expect(again.round.word).toBe('');
    expect(again.round.insiderId).toBe('');
    expect(again.round.outcome).toBeNull();
    expect(again.round.accusation).toBeNull();
    expect(again.round.endsAt).toBeNull();
  });

  it('choose: volta para master-select preservando a rotação', () => {
    const start = createSession(baseConfig('choose'), rng0);
    const finished = accuse(
      markGuessed(startGuessing(advanceFully(dealRoles(selectMaster(start, 'a'), deck, rng0)), 1000)),
      { kind: 'nobody' },
    );
    const again = playAgain(finished, rng0);
    expect(again.round.phase).toBe('master-select');
    expect(again.round.masterId).toBe('');
    expect(again.masterRotation).toEqual(finished.masterRotation);
  });
});

// helper local ao teste: aplica advanceReveal até entrar em guessing
function advanceFully(s: ReturnType<typeof dealRoles>) {
  let cur = s;
  while (cur.round.phase === 'role-reveal') cur = advanceReveal(cur);
  return cur;
}
