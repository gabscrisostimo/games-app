# Snake Oil — Engine 2 (Julgamento / Mão de Cartas) — Design

**Data:** 2026-06-13
**Chat:** C — branch `feat/judging-engine`
**Status:** spec aprovado em brainstorming; aguardando revisão antes do plano de implementação

## Contexto

Primeiro jogo da **Engine 2 — Julgamento / Mão de Cartas** do roadmap (`docs/ordem-de-construcao.md`). A engine cobre depois Cards Against Humanity, Funemployed e variações. O núcleo compartilhado: distribuir uma mão privada de cartas → jogadores jogam/combinam → um juiz rotativo escolhe o vencedor → pontua.

Este spec cobre **só o Snake Oil**. A abstração da "engine de julgamento" genérica **não** será extraída agora (YAGNI) — ela nasce de dentro de `src/games/judging/` quando o 2º jogo (CAH) chegar e a forma compartilhada real aparecer. A pasta `judging/` já reserva o território.

### Modelo de dispositivo

Pass-and-play num **único celular compartilhado** (sem multi-device/online — isso é futuro). A privacidade da mão é resolvida com telas-portão de "passe o celular".

## Decisões de design (brainstorming)

- **Engine:** Julgamento/Cartas, pasta `src/games/judging/`.
- **Mão de cartas:** mão privada por jogador; pass-the-phone (faithful ao físico, reutilizável por CAH/Funemployed).
- **Cliente/juiz:** carta de persona (segundo deck) — o cliente julga "no personagem".
- **Fim de jogo:** configurável `rotations` OU `points` (espelha o `MatchConfig` do Taboo).
- **Empate na votação:** não existe — o cliente escolhe exatamente 1 vencedor.

## Arquitetura & arquivos

Território exclusivo do Chat C. Espelha a estrutura provada do Taboo (lógica pura + reducer + persistência + telas).

```
src/games/judging/snakeoil/
  types.ts             # tipos puros
  logic.ts             # funções puras, rng injetável (coração testável)
  reducer.ts           # ações -> estado (wrapper sobre logic)
  persistence.ts       # save/load/clear no localStorage
  SnakeOilApp.tsx      # entry; expõe <SnakeOilApp onHome={() => void} />
  SnakeOilSession.tsx  # orquestra fases -> telas
  screens/
    ConfigScreen.tsx
    PreRoundScreen.tsx
    SelectingScreen.tsx
    PitchingScreen.tsx
    JudgingScreen.tsx
    RoundSummaryScreen.tsx
    GameOverScreen.tsx
src/data/judging/
  snakeoil-words.json     # deck de palavras
  snakeoil-personas.json  # deck de personas/clientes
  index.ts                # loader (espelha src/data/decks/index.ts)
```

Importa **read-only** do shell: `ActionButton`, `useCountdown`. Não toca em nada fora de `src/games/judging/**` e `src/data/judging/**`.

## Dados (types.ts)

```ts
export type WordCard = { id: string; word: string };
export type PersonaCard = { id: string; persona: string };   // ex.: "pirata aposentado"
export type WordDeck = { id: string; name: string; cards: WordCard[] };
export type PersonaDeck = { id: string; name: string; cards: PersonaCard[] };

export type Player = {
  id: string;
  name: string;
  score: number;
  hand: string[];   // ids de WordCard
};

export type EndMode = 'rotations' | 'points';

export type MatchConfig = {
  playerNames: string[];        // min 3
  handSize: number;             // default 6
  cardsPerPitch: number;        // default 2
  pitchSeconds: number | null;  // null = sem timer; senão countdown por pitch
  endMode: EndMode;
  endValue: number;             // K rotações OU X pontos
};

export type GamePhase =
  | 'pre-round'
  | 'selecting'
  | 'pitching'
  | 'judging'
  | 'round-summary'
  | 'game-over';

export type RoundState = {
  customerIndex: number;                 // índice do jogador-cliente
  personaId: string | null;             // persona da rodada
  order: number[];                      // índices dos pitchers (todos menos o cliente)
  selIndex: number;                     // posição em `order` de quem está escolhendo agora
  picks: Record<number, string[]>;      // playerIndex -> ids de WordCard escolhidos
  winnerIndex: number | null;           // definido na fase judging
};

export type GameState = {
  config: MatchConfig;
  players: Player[];
  wordDraw: string[];
  wordDiscard: string[];
  personaDraw: string[];
  personaDiscard: string[];
  roundsPlayed: number;                 // total de rodadas concluídas
  round: RoundState | null;
  phase: GamePhase;
};
```

## Máquina de estados (fluxo de uma rodada)

1. **pre-round** — mostra o cliente da rodada (`customerIndex`) + a carta de persona sorteada. O cliente lê em voz alta. Botão "começar rodada" → `selecting`.
2. **selecting** (pass-the-phone, privado) — para cada pitcher em `order`, em sequência:
   - **portão**: "Passe o celular para {nome} — toque quando estiver com ele".
   - **mão**: grade das `handSize` palavras; o jogador seleciona exatamente `cardsPerPitch`; "confirmar" (desabilitado até bater a contagem) grava em `picks` e avança `selIndex`.
   - Nada da seleção anterior fica visível ao próximo jogador.
   - Após o último pitcher → `pitching`.
3. **pitching** — produtos revelados (nome do pitcher + palavras escolhidas), um por vez; `useCountdown` opcional por pitch quando `pitchSeconds != null`; os pitches são verbais/presenciais. Botão "ir para votação" → `judging`.
4. **judging** — o cliente toca no produto vencedor; grava `winnerIndex` → `round-summary`.
5. **round-summary** — vencedor recebe +1; placar ordenado. Refil de mãos (recompra até `handSize`). "Próxima rodada" (ou "ver resultado" se for a última) → `nextRound`.
6. **game-over** — ranking final; "jogar de novo" (volta à config) / "home" (`onHome`).

## Lógica pura (logic.ts)

Todas as funções recebem `rng: () => number = Math.random` injetável (igual Taboo) e são puras (retornam novo estado).

- `createGame(config, wordDeck, personaDeck, rng)` — embaralha os dois decks; distribui mãos de `handSize` para cada jogador; `roundsPlayed = 0`; `phase = 'pre-round'`; monta `round` da rodada 0 (cliente = índice 0, persona sorteada, `order` = todos menos o cliente).
- `drawWords(draw, discard, n, rng)` / `drawPersona(draw, discard, rng)` — espelham `drawNext` do Taboo; reshuffle do discard quando o draw esvazia.
- `selectCards(state, picks)` — grava picks do pitcher atual; avança `selIndex`; ao passar do último, transição `selecting -> pitching`.
- `toJudging(state)` — `pitching -> judging`.
- `judge(state, winnerIndex)` — grava `winnerIndex`; **aplica +1 ao vencedor**; move as palavras usadas (todos os `picks`) para o `wordDiscard`; descarta a persona da rodada; `judging -> round-summary`. Assim a tela de summary já mostra o placar atualizado e o vencedor. (Efeito ocorre exatamente uma vez: só roda na transição `judging -> round-summary`.)
- `isGameOver(state)` — `rotations`: `roundsPlayed >= endValue * players.length`; `points`: `max(score) >= endValue`. Avaliado em fronteira de rodada (dentro de `nextRound`, após incrementar `roundsPlayed`).
- `nextRound(state, rng)` — **recompra** a mão de cada pitcher até `handSize` (via `drawWords`, que faz reshuffle do `wordDiscard` quando o `wordDraw` esvazia); incrementa `roundsPlayed`; se `isGameOver` → `phase = 'game-over'`; senão rotaciona `customerIndex` (`(prev + 1) % players.length`), sorteia nova persona, monta novo `round`, `phase = 'pre-round'`.
- `getRanking(state)` — jogadores ordenados por score desc (para game-over e summary).

**Invariantes:**
- Ações fora da fase esperada são no-op (retornam o estado inalterado), igual ao Taboo.
- `cardsPerPitch <= handSize`.
- `players.length >= 3` (cliente + ≥2 pitchers para haver disputa).
- Determinismo: com `rng` fixo, `createGame` e `nextRound` produzem resultados reproduzíveis.

## Reducer (reducer.ts)

Wrapper fino sobre `logic.ts`, no padrão do Taboo. Ações:
`START_ROUND`, `SELECT_CARDS(picks)`, `TO_JUDGING`, `JUDGE(winnerIndex)`, `NEXT_ROUND`, `RESET`. Cada ação delega à função pura e ignora ações fora de fase.

## Persistência (persistence.ts)

Espelha o Taboo: `saveGame(state)`, `loadGame(): GameState | null`, `clearGame()` em `localStorage` sob uma chave própria (`snakeoil:v1`). `SnakeOilApp` oferece "continuar partida" quando há estado salvo não-finalizado.

## Telas (screens/)

Estilo do Taboo (Tailwind, mobile-first, `ActionButton` do shell). Cada tela é função de props + callbacks; nenhuma lógica de jogo dentro das telas.

- **ConfigScreen** — nomes (add/remove, min 3), `handSize` (default 6), `cardsPerPitch` (default 2), timer on/off + segundos, `endMode` (rotações/pontos) + `endValue`, escolha de deck. "Começar" → `createGame`.
- **PreRoundScreen** — "Cliente: **{nome}**" + carta de persona em destaque; "começar rodada".
- **SelectingScreen** — dois sub-estados (portão / mão); "confirmar" desabilitado até `cardsPerPitch` selecionados; não vaza seleção anterior.
- **PitchingScreen** — lista de produtos (nome + palavras), revelados um a um; `useCountdown` opcional; "ir para votação".
- **JudgingScreen** — cliente toca o produto vencedor.
- **RoundSummaryScreen** — "🏆 {vencedor}" + placar ordenado; "próxima rodada" / "ver resultado".
- **GameOverScreen** — ranking final; "jogar de novo" / "home".

## Dados (decks)

- `snakeoil-words.json` — ~80–120 substantivos versáteis em PT-BR (ex.: "ímã", "queijo", "foguete", "pelúcia"). Shape: `{ id, name, cards: [{ id, word }] }`.
- `snakeoil-personas.json` — ~30–40 personas/clientes em PT-BR (ex.: "pirata aposentado", "influencer fitness", "vampiro vegano"). Shape: `{ id, name, cards: [{ id, persona }] }`.
- `src/data/judging/index.ts` — loader (espelha `src/data/decks/index.ts`), com teste de integridade (ids únicos, contagem mínima).

## Estratégia de testes (TDD, Vitest)

Lógica pura primeiro; teste antes do código de implementação.

- `logic.test.ts` — `createGame` distribui mãos de `handSize` e embaralha com rng fixo; `selectCards` grava picks e avança `selIndex`; transição selecting→pitching no último pitcher; `judge` define winner e dá +1 ao vencedor exatamente uma vez (e descarta palavras usadas + persona); `nextRound` recompra mãos até `handSize` e rotaciona o cliente; reshuffle de words/personas quando o draw esvazia; `isGameOver` para `rotations` e `points`; determinismo com rng fixo; no-op em ações fora de fase.
- `reducer.test.ts` — cada ação muda fase/estado corretamente; ignora ações fora de fase.
- `persistence.test.ts` — round-trip save/load/clear.
- `src/data/judging/index.test.ts` — integridade dos decks.
- 1 teste de tela: `SelectingScreen.test.tsx` — "confirmar" desabilitado até `cardsPerPitch`; não exibe seleção do jogador anterior.

## Contrato de integração

Exporta `<SnakeOilApp onHome={() => void} />` em `src/games/judging/snakeoil/SnakeOilApp.tsx`. A ligação na home (`src/App.tsx`) é responsabilidade do **Chat A**, depois do visual polish. O Chat C apenas **sinaliza** no `docs/status-chats.md` quando a engine estiver pronta. Não toca em `src/App.tsx` nem `src/shell/`.

## Fora de escopo (YAGNI agora)

- Multi-device / online.
- Editor de decks in-app.
- Extração da engine de julgamento genérica (só quando CAH chegar).
- Empate na votação (cliente escolhe exatamente 1).
- Cards Against Humanity, Funemployed e demais jogos da engine (specs próprios depois).
