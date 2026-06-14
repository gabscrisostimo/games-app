// src/games/hiddenroles/onenight/logic.test.ts
import { describe, it, expect } from 'vitest';
import { dealRoles } from './logic';
import type { RoleId } from './types';

const bag: RoleId[] = ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'];

describe('dealRoles', () => {
  it('returns a deal the same length as the bag', () => {
    const deal = dealRoles(bag, () => 0);
    expect(deal).toHaveLength(bag.length);
  });

  it('is a permutation of the bag (same multiset of cards)', () => {
    const deal = dealRoles(bag, () => 0.42);
    expect([...deal].sort()).toEqual([...bag].sort());
  });

  it('is deterministic given a fixed rng', () => {
    const a = dealRoles(bag, makeRng([0.1, 0.9, 0.3, 0.7, 0.5]));
    const b = dealRoles(bag, makeRng([0.1, 0.9, 0.3, 0.7, 0.5]));
    expect(a).toEqual(b);
  });

  it('does not mutate the input bag', () => {
    const copy = [...bag];
    dealRoles(bag, () => 0.5);
    expect(bag).toEqual(copy);
  });
});

// rng that yields a fixed sequence then 0
function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
}

import {
  resolveNight, computeNightView, resolveDeaths, resolveWinners, awardScores,
  createSession, submitPass, submitDawn, startDiscussion, beginVote, submitVote, playAgain,
} from './logic';
import type { Config, Player } from './types';

describe('resolveNight', () => {
  // deal indices: 0..N-1 players, N..N+2 center.
  // N=4: players 0..3, center 4,5,6.
  it('with no actions, final roles equal the players slice of the deal', () => {
    const deal: RoleId[] = ['werewolf', 'seer', 'robber', 'villager', 'troublemaker', 'villager', 'werewolf'];
    expect(resolveNight(deal, [], 4)).toEqual(['werewolf', 'seer', 'robber', 'villager']);
  });

  it('robber swaps actor with target (robber takes the target role)', () => {
    // player2 = robber robs player3 (villager)
    const deal: RoleId[] = ['werewolf', 'seer', 'robber', 'villager', 'troublemaker', 'villager', 'werewolf'];
    const final = resolveNight(deal, [{ kind: 'robber', actor: 2, target: 3 }], 4);
    expect(final[2]).toBe('villager'); // robber now holds villager
    expect(final[3]).toBe('robber');   // target now holds robber
  });

  it('robber then troublemaker: robber ends DIFFERENT from what it saw (order matters)', () => {
    // N=5 (length 8): players 0..4, center 5,6,7.
    // p2 robber robs p0 (werewolf) -> p2 becomes werewolf; then p4 troublemaker swaps p2 <-> p3
    const deal: RoleId[] = ['werewolf', 'seer', 'robber', 'villager', 'troublemaker', 'villager', 'minion', 'tanner'];
    const final = resolveNight(
      deal,
      [
        { kind: 'troublemaker', actor: 4, a: 2, b: 3 },     // collected out of canonical order on purpose
        { kind: 'robber', actor: 2, target: 0 },
      ],
      5,
    );
    // robber (order 50) runs first: p2<-werewolf, p0<-robber
    // troublemaker (order 60) runs second: swaps p2<->p3 => p2<-villager, p3<-werewolf
    expect(final[2]).toBe('villager'); // robber SAW werewolf but ENDS villager
    expect(final[3]).toBe('werewolf');
    expect(final[0]).toBe('robber');
  });

  it('drunk swaps actor with a center card (blind)', () => {
    // N=3, players 0..2, center 3,4,5. p0 drunk swaps with center index 4 (=minion)
    const deal: RoleId[] = ['drunk', 'seer', 'villager', 'werewolf', 'minion', 'werewolf'];
    const final = resolveNight(deal, [{ kind: 'drunk', actor: 0, center: 4 }], 3);
    expect(final[0]).toBe('minion');
  });

  it('lone-wolf and seer actions cause no swaps', () => {
    // N=4 (length 7): players 0..3, center 4,5,6.
    const deal: RoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'minion', 'tanner', 'robber'];
    const final = resolveNight(
      deal,
      [
        { kind: 'lone-wolf', actor: 0, center: 5 },
        { kind: 'seer', actor: 1, peek: { kind: 'player', target: 2 } },
      ],
      4,
    );
    expect(final).toEqual(['werewolf', 'seer', 'villager', 'villager']);
  });

  it('chained swaps resolve in canonical order regardless of array order', () => {
    // N=5 (length 8): players 0..4, center 5,6,7.
    // robber p0 robs p1, troublemaker p2 swaps p0<->p3, drunk p4 swaps with center 6.
    const deal: RoleId[] = ['robber', 'villager', 'troublemaker', 'seer', 'drunk', 'werewolf', 'minion', 'villager'];
    const final = resolveNight(
      deal,
      [
        { kind: 'drunk', actor: 4, center: 6 },          // listed out of canonical order on purpose
        { kind: 'troublemaker', actor: 2, a: 0, b: 3 },
        { kind: 'robber', actor: 0, target: 1 },
      ],
      5,
    );
    // canonical: robber(50): p0<-villager, p1<-robber
    // troublemaker(60): swap p0<->p3 => p0<-seer, p3<-villager
    // drunk(70): p4<-deal[6]=minion
    expect(final[0]).toBe('seer');
    expect(final[1]).toBe('robber');
    expect(final[3]).toBe('villager');
    expect(final[4]).toBe('minion');
    expect(final).toHaveLength(5);
  });

  it('does not mutate the input deal', () => {
    const deal: RoleId[] = ['robber', 'villager', 'seer', 'werewolf'];
    const copy = [...deal];
    resolveNight(deal, [{ kind: 'robber', actor: 0, target: 1 }], 1);
    expect(deal).toEqual(copy);
  });
});

describe('computeNightView', () => {
  it('werewolf sees the other werewolves (player indices only)', () => {
    // N=4: players 0..3 (0 and 2 are wolves), center 4,5,6
    const deal: RoleId[] = ['werewolf', 'seer', 'werewolf', 'villager', 'minion', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'wolves', partners: [2] });
  });

  it('lone werewolf with no peek sees empty partners', () => {
    const deal: RoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'werewolf', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'wolves', partners: [] });
  });

  it('lone werewolf who peeks a center card sees that card', () => {
    const deal: RoleId[] = ['werewolf', 'seer', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    const view = computeNightView(deal, 0, 4, { kind: 'lone-wolf', actor: 0, center: 5 });
    expect(view).toEqual({ kind: 'lone-wolf', center: 5, role: 'tanner' });
  });

  it('minion sees the wolves', () => {
    const deal: RoleId[] = ['minion', 'werewolf', 'villager', 'werewolf', 'seer', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'minion', wolves: [1, 3] });
  });

  it('mason sees the other mason', () => {
    const deal: RoleId[] = ['mason', 'villager', 'mason', 'seer', 'werewolf', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'masons', partners: [2] });
  });

  it('lone mason sees empty partners', () => {
    const deal: RoleId[] = ['mason', 'villager', 'seer', 'robber', 'werewolf', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toEqual({ kind: 'masons', partners: [] });
  });

  it('seer peeking a player sees that player original role', () => {
    const deal: RoleId[] = ['seer', 'werewolf', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    const view = computeNightView(deal, 0, 4, { kind: 'seer', actor: 0, peek: { kind: 'player', target: 1 } });
    expect(view).toEqual({ kind: 'seer-player', target: 1, role: 'werewolf' });
  });

  it('seer peeking the center sees two center cards', () => {
    const deal: RoleId[] = ['seer', 'werewolf', 'villager', 'villager', 'minion', 'tanner', 'robber'];
    const view = computeNightView(deal, 0, 4, { kind: 'seer', actor: 0, peek: { kind: 'center', cards: [4, 6] } });
    expect(view).toEqual({ kind: 'seer-center', cards: [4, 6], roles: ['minion', 'robber'] });
  });

  it('robber sees the role it took (original target role)', () => {
    const deal: RoleId[] = ['robber', 'werewolf', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    const view = computeNightView(deal, 0, 4, { kind: 'robber', actor: 0, target: 1 });
    expect(view).toEqual({ kind: 'robber', target: 1, role: 'werewolf' });
  });

  it('troublemaker and drunk get no info', () => {
    const deal: RoleId[] = ['troublemaker', 'drunk', 'villager', 'villager', 'minion', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, { kind: 'troublemaker', actor: 0, a: 1, b: 2 })).toEqual({ kind: 'troublemaker' });
    expect(computeNightView(deal, 1, 4, { kind: 'drunk', actor: 1, center: 5 })).toEqual({ kind: 'drunk' });
  });

  it('optional actors who declined (null action) get a null view', () => {
    const deal: RoleId[] = ['seer', 'robber', 'troublemaker', 'villager', 'minion', 'tanner', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toBeNull(); // seer declined
    expect(computeNightView(deal, 1, 4, null)).toBeNull(); // robber declined
    expect(computeNightView(deal, 2, 4, null)).toBeNull(); // troublemaker declined
  });

  it('insomniac, villager, hunter, tanner see nothing during the night', () => {
    const deal: RoleId[] = ['insomniac', 'villager', 'hunter', 'tanner', 'minion', 'werewolf', 'villager'];
    expect(computeNightView(deal, 0, 4, null)).toBeNull();
    expect(computeNightView(deal, 1, 4, null)).toBeNull();
    expect(computeNightView(deal, 2, 4, null)).toBeNull();
    expect(computeNightView(deal, 3, 4, null)).toBeNull();
  });
});

describe('resolveDeaths', () => {
  it('nobody dies when the top vote-getter has fewer than 2 votes', () => {
    // 3 players each pointing at a different person -> all have 1 vote
    const finalRoles: RoleId[] = ['villager', 'werewolf', 'seer'];
    expect(resolveDeaths([1, 2, 0], finalRoles)).toEqual([]);
  });

  it('kills the single player with the most votes (>=2)', () => {
    // players 0,1,2,3 ; votes all point at player 1
    const finalRoles: RoleId[] = ['villager', 'werewolf', 'seer', 'robber'];
    expect(resolveDeaths([1, 2, 1, 1], finalRoles)).toEqual([1]);
  });

  it('a tie at the top kills everyone tied', () => {
    // player0 gets 2, player1 gets 2
    const finalRoles: RoleId[] = ['werewolf', 'villager', 'seer', 'robber'];
    expect(resolveDeaths([1, 0, 1, 0], finalRoles)).toEqual([0, 1]);
  });

  it('a dead Hunter also kills whoever they voted for', () => {
    // player0 is hunter, voted player3; player0 gets 2 votes and dies -> player3 dies too
    const finalRoles: RoleId[] = ['hunter', 'villager', 'seer', 'werewolf'];
    expect(resolveDeaths([3, 0, 0, 1], finalRoles)).toEqual([0, 3]);
  });

  it('hunter chain resolves to a fixpoint without infinite loop', () => {
    // p0 hunter -> voted p1 ; p1 hunter -> voted p2 ; p0 dies by votes
    const finalRoles: RoleId[] = ['hunter', 'hunter', 'villager', 'seer'];
    // votes: p2->0, p3->0 (p0 gets 2, dies). p0 voted p1, p1 voted p2.
    expect(resolveDeaths([1, 2, 0, 0], finalRoles)).toEqual([0, 1, 2]);
  });
});

describe('resolveWinners (locked win matrix)', () => {
  it('a werewolf dies -> Village wins', () => {
    const final: RoleId[] = ['werewolf', 'villager', 'seer'];
    expect(resolveWinners(final, [0])).toEqual({ village: true, werewolf: false, tanner: false });
  });

  it('no wolf dies, a wolf is in play, no tanner died -> Werewolf team wins', () => {
    const final: RoleId[] = ['werewolf', 'villager', 'seer'];
    expect(resolveWinners(final, [1])).toEqual({ village: false, werewolf: true, tanner: false });
  });

  it('Tanner dies and no wolf dies -> only Tanner wins (blocks the wolves)', () => {
    const final: RoleId[] = ['werewolf', 'tanner', 'seer'];
    expect(resolveWinners(final, [1])).toEqual({ village: false, werewolf: false, tanner: true });
  });

  it('Tanner dies AND a wolf dies -> Village wins AND Tanner wins', () => {
    const final: RoleId[] = ['werewolf', 'tanner', 'seer'];
    expect(resolveWinners(final, [0, 1])).toEqual({ village: true, werewolf: false, tanner: true });
  });

  it('no wolves in play and nobody dies -> Village wins', () => {
    const final: RoleId[] = ['villager', 'seer', 'robber'];
    expect(resolveWinners(final, [])).toEqual({ village: true, werewolf: false, tanner: false });
  });

  it('no wolves in play, a non-minion dies -> Minion (werewolf team) wins, Village loses', () => {
    const final: RoleId[] = ['minion', 'villager', 'seer'];
    expect(resolveWinners(final, [1])).toEqual({ village: false, werewolf: true, tanner: false });
  });

  it('no wolves in play, only the Minion dies -> Minion loses, Village loses', () => {
    const final: RoleId[] = ['minion', 'villager', 'seer'];
    expect(resolveWinners(final, [0])).toEqual({ village: false, werewolf: false, tanner: false });
  });
});

describe('awardScores', () => {
  const players: Player[] = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' },
  ];

  it('Village win gives +1 to every village-team player', () => {
    const final: RoleId[] = ['werewolf', 'villager', 'seer']; // village = b, c
    const scores = awardScores({}, players, final, [0], { village: true, werewolf: false, tanner: false });
    expect(scores).toEqual({ b: 1, c: 1 });
  });

  it('Werewolf win gives +1 to wolves and minion', () => {
    const final: RoleId[] = ['werewolf', 'minion', 'seer'];
    const scores = awardScores({}, players, final, [2], { village: false, werewolf: true, tanner: false });
    expect(scores).toEqual({ a: 1, b: 1 });
  });

  it('Tanner win gives +1 only to the dead tanner', () => {
    const final: RoleId[] = ['werewolf', 'tanner', 'seer'];
    const scores = awardScores({}, players, final, [1], { village: false, werewolf: false, tanner: true });
    expect(scores).toEqual({ b: 1 });
  });

  it('accumulates on top of existing scores', () => {
    const final: RoleId[] = ['villager', 'seer', 'robber'];
    const scores = awardScores({ a: 2, b: 1, c: 5 }, players, final, [], { village: true, werewolf: false, tanner: false });
    expect(scores).toEqual({ a: 3, b: 2, c: 6 });
  });
});

const players3: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Beto' },
  { id: 'c', name: 'Caio' },
];

// rng=()=>0 deals bag [w,w,seer,robber,troublemaker,villager] to:
// players [werewolf, seer, robber], center [troublemaker, villager, werewolf]
const bagNoInsomniac: Config = {
  players: players3,
  bag: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 300,
};
const bagWithInsomniac: Config = {
  players: players3,
  bag: ['werewolf', 'insomniac', 'seer', 'robber', 'troublemaker', 'villager'],
  discussSeconds: 180,
};
const rng0 = () => 0;

describe('createSession', () => {
  it('deals and enters the night with fresh bookkeeping', () => {
    const s = createSession(bagNoInsomniac, rng0);
    expect(s.round.phase).toBe('night');
    expect(s.round.deal).toHaveLength(6);
    expect(s.round.passIndex).toBe(0);
    expect(s.round.views).toHaveLength(3);
    expect(s.round.votes).toEqual([-1, -1, -1]);
    expect(s.round.finalRoles).toEqual([]);
    expect(s.round.winners).toBeNull();
    expect(s.scores).toEqual({});
  });
});

describe('submitPass', () => {
  it('records the action+view and advances the pass index', () => {
    const s = createSession(bagNoInsomniac, rng0); // player0 = werewolf (lone -> partners [])
    const s1 = submitPass(s, null);
    expect(s1.round.passIndex).toBe(1);
    expect(s1.round.views[0]).toEqual({ kind: 'wolves', partners: [] });
    expect(s1.round.actions).toEqual([]); // null action stores nothing
  });

  it('stores non-null actions for later resolution', () => {
    const s = createSession(bagNoInsomniac, rng0);
    const s1 = submitPass(s, null); // werewolf
    const s2 = submitPass(s1, { kind: 'seer', actor: 1, peek: { kind: 'player', target: 2 } });
    expect(s2.round.actions).toHaveLength(1);
    expect(s2.round.views[1]).toEqual({ kind: 'seer-player', target: 2, role: 'robber' });
  });

  it('after the last player with NO insomniac in the bag, resolves and goes to discussion', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null); // p0 werewolf
    s = submitPass(s, null); // p1 seer declines
    s = submitPass(s, null); // p2 robber declines
    expect(s.round.phase).toBe('discussion');
    expect(s.round.finalRoles).toHaveLength(3);
    expect(s.round.endsAt).toBeNull();
  });

  it('after the last player WITH insomniac in the bag, goes to dawn', () => {
    let s = createSession(bagWithInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    expect(s.round.phase).toBe('dawn');
    expect(s.round.passIndex).toBe(0);
    expect(s.round.finalRoles).toHaveLength(3);
  });
});

describe('submitDawn', () => {
  it('walks the uniform dawn pass then enters discussion', () => {
    let s = createSession(bagWithInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null); // -> dawn
    s = submitDawn(s); // p0
    expect(s.round.phase).toBe('dawn');
    s = submitDawn(s); // p1
    s = submitDawn(s); // p2 -> discussion
    expect(s.round.phase).toBe('discussion');
    expect(s.round.endsAt).toBeNull();
  });
});

describe('startDiscussion / beginVote', () => {
  it('startDiscussion arms the countdown', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null); // discussion
    s = startDiscussion(s, 1000);
    expect(s.round.endsAt).toBe(1000 + 300 * 1000);
  });

  it('beginVote opens the vote pass with cleared votes', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = beginVote(s);
    expect(s.round.phase).toBe('vote');
    expect(s.round.passIndex).toBe(0);
    expect(s.round.votes).toEqual([-1, -1, -1]);
  });
});

describe('submitVote', () => {
  it('walks the vote pass and resolves into result on the last vote', () => {
    let s = createSession(bagNoInsomniac, rng0); // players [werewolf, seer, robber]
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = beginVote(s);
    s = submitVote(s, 0); // a votes werewolf(0)
    expect(s.round.phase).toBe('vote');
    s = submitVote(s, 0); // b votes 0
    s = submitVote(s, 1); // c votes 1 -> last vote
    expect(s.round.phase).toBe('result');
    expect(s.round.votes).toEqual([0, 0, 1]);
    // player0 has 2 votes (>=2) -> dies; player0 is a werewolf -> Village wins
    expect(s.round.deaths).toEqual([0]);
    expect(s.round.winners).toEqual({ village: true, werewolf: false, tanner: false });
    // seer(b) and robber(c) are village -> +1 each
    expect(s.scores).toEqual({ b: 1, c: 1 });
  });
});

describe('playAgain', () => {
  it('re-deals the same bag, resets the round, preserves scores', () => {
    let s = createSession(bagNoInsomniac, rng0);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = submitPass(s, null);
    s = beginVote(s);
    s = submitVote(s, 0);
    s = submitVote(s, 0);
    s = submitVote(s, 1); // result, scores {b:1,c:1}
    const again = playAgain(s, rng0);
    expect(again.round.phase).toBe('night');
    expect(again.round.passIndex).toBe(0);
    expect(again.round.finalRoles).toEqual([]);
    expect(again.round.votes).toEqual([-1, -1, -1]);
    expect(again.config).toBe(s.config);
    expect(again.scores).toEqual({ b: 1, c: 1 });
  });
});
