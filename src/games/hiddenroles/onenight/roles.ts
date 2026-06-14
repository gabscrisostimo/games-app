// src/games/hiddenroles/onenight/roles.ts
import type { RoleDef, RoleId, Team } from './types';

export const ROLES: Record<RoleId, RoleDef> = {
  werewolf: {
    id: 'werewolf', name: 'Lobisomem', team: 'werewolf', nightOrder: 10, action: 'see-team', max: 2,
    blurb: 'Você é um Lobisomem. Veja os outros lobos. Se for o único, espie 1 carta do centro.',
  },
  minion: {
    id: 'minion', name: 'Capanga', team: 'werewolf', nightOrder: 20, action: 'minion-see-wolves', max: 1,
    blurb: 'Você é o Capanga. Veja quem são os lobos. Eles não sabem quem você é.',
  },
  mason: {
    id: 'mason', name: 'Maçom', team: 'village', nightOrder: 30, action: 'see-team', max: 2,
    blurb: 'Você é um Maçom. Veja o outro Maçom (ou descubra que está sozinho).',
  },
  seer: {
    id: 'seer', name: 'Vidente', team: 'village', nightOrder: 40, action: 'seer-peek', max: 1,
    blurb: 'Você é a Vidente. Veja a carta de 1 jogador OU 2 cartas do centro.',
  },
  robber: {
    id: 'robber', name: 'Ladrão', team: 'village', nightOrder: 50, action: 'rob', max: 1,
    blurb: 'Você é o Ladrão. Troque sua carta com a de outro jogador e veja seu novo papel.',
  },
  troublemaker: {
    id: 'troublemaker', name: 'Encrenqueiro', team: 'village', nightOrder: 60, action: 'swap-others', max: 1,
    blurb: 'Você é o Encrenqueiro. Troque as cartas de dois outros jogadores (sem olhar).',
  },
  drunk: {
    id: 'drunk', name: 'Bêbado', team: 'village', nightOrder: 70, action: 'drunk-swap-center', max: 1,
    blurb: 'Você é o Bêbado. Troque sua carta com uma do centro, sem olhar qual.',
  },
  insomniac: {
    id: 'insomniac', name: 'Insônia', team: 'village', nightOrder: 80, action: 'insomniac-check', max: 1,
    blurb: 'Você é a Insônia. No amanhecer você verá em quem se tornou.',
  },
  hunter: {
    id: 'hunter', name: 'Caçador', team: 'village', nightOrder: null, action: 'none', max: 1,
    blurb: 'Você é o Caçador. Se morrer, quem você votou morre junto.',
  },
  tanner: {
    id: 'tanner', name: 'Tanner', team: 'tanner', nightOrder: null, action: 'none', max: 1,
    blurb: 'Você é o Tanner. Você só vence se morrer.',
  },
  villager: {
    id: 'villager', name: 'Aldeão', team: 'village', nightOrder: null, action: 'none', max: 3,
    blurb: 'Você é um Aldeão. Sem ação noturna — use a lógica na discussão.',
  },
};

export function roleDef(id: RoleId): RoleDef {
  return ROLES[id];
}

export function teamOf(id: RoleId): Team {
  return ROLES[id].team;
}

export function nightOrderOf(id: RoleId): number | null {
  return ROLES[id].nightOrder;
}
