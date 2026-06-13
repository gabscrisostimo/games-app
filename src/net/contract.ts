// src/net/contract.ts
export type PlayerId = string;

export interface InitCtx<Config> {
  config: Config;
  players: { id: PlayerId; nickname: string }[];
  now: number; // relógio da autoridade no início da partida
  rng: () => number; // PRNG semeado pela autoridade
}

export interface ActionCtx {
  now: number;
  rng: () => number;
  actorId: PlayerId; // quem enviou a ação
}

export interface TimerCtx {
  now: number;
  rng: () => number;
}

/**
 * Contrato que todo jogo implementa pra rodar em rede. A autoridade roda estes
 * métodos; o cliente só renderiza Projection.
 */
export interface NetGame<State, Action extends { type: string }, Projection, Config> {
  createInitial(ctx: InitCtx<Config>): State;
  reducer(state: State, action: Action, ctx: ActionCtx): State;
  project(state: State, playerId: PlayerId): Projection;
  legalActions(state: State, playerId: PlayerId): Action['type'][];
  /** Próximo deadline autoritativo (ms epoch), ou null se a fase não tem timer. */
  deadline?(state: State): number | null;
  /** Chamado pela autoridade quando o deadline expira. */
  onTimeout?(state: State, ctx: TimerCtx): State;
}
