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

import { resolveNight, computeNightView } from './logic';

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
