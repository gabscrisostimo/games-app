# Design — Taboo v1 (games-app)

**Data:** 2026-06-12
**Status:** Aprovado (design); pendente plano de implementação
**Escopo:** Primeiro jogo do games-app — um clone do Taboo / eTABU, modo passa-e-joga (um celular).

---

## Contexto do projeto

O **games-app** é um app pessoal (Gabs + amigos) que hospeda uma coleção de *party games*
sociais e de texto. Conteúdo simples; a substância está na infraestrutura de partida e na
possibilidade de adicionar jogos novos de forma barata.

Decisões de produto que enquadram este v1:

- **Modo presencial, passa-e-joga** (um único celular passado de mão em mão). Multi-device
  em tempo real é uma fase futura, fora deste escopo.
- **Mobile-first**, web app / PWA.
- **Plataforma usada por poucos** (o autor e amigos), sem necessidade de loja de apps.
- O Taboo é a "cobaia" que exercita a casca reutilizável (shell) sem a complexidade de
  informação secreta por jogador.

---

## Regras do Taboo (v1)

- **2 times fixos** (default "Time A" / "Time B"; nome editável). O app rastreia apenas
  times + placar — **sem cadastro de jogadores** e sem rodízio automático de quem dá a dica.
- **Turno cronometrado.** Em cada turno, um jogador dá dicas de uma palavra por vez e seu
  time tenta adivinhar o máximo de cartas possível até o tempo acabar.
- **Pontuação:**
  - Acerto: **+1**.
  - Palavra proibida: **−1** e a carta é descartada (pula pra próxima).
  - Pular: permitido com **limite por turno**.
- **Fiscalização da palavra proibida:** um **juiz do time adversário** acompanha a mesma
  tela (as proibidas ficam em destaque pra ele) e é quem marca o erro.
- **Fim de jogo configurável** ao criar a partida: número fixo de rodadas **ou** meta de pontos.

### Ajustes configuráveis na criação da partida

| Ajuste | Opções / default |
|---|---|
| Modo de fim de jogo | `rodadas` (N turnos por time) **ou** `pontos` (meta X) |
| Duração do turno | ex.: 30 / 60 / 90s — default **60s** |
| Limite de pulos | ex.: 1 / 3 / 5 / ilimitado — default **3** |
| Custo do pulo | pulo **tira −1 ponto** **ou** **só conta no limite** (sem perder ponto) |
| Deck / tema | escolha do baralho — default: deck padrão |
| Nomes dos times | opcional; default "Time A" / "Time B" |

---

## Arquitetura

**Stack:** Web app / **PWA** — **Vite + React + TypeScript + Tailwind**.

Duas camadas, com fronteira limpa para tornar barato plugar um 2º jogo depois (sem construir
uma "engine genérica" especulativa — YAGNI):

1. **Shell (reutilizável)** — casca do app, tela inicial com lista de jogos, e os *primitivos*
   compartilhados que outros party games vão reaproveitar: **Timer**, **Placar**, **Carta**,
   **botões de ação grandes** (touch-friendly), **tela de configurar partida**. Na Fase 1
   constrói-se apenas o que o Taboo precisa, mas estruturado como primitivos reutilizáveis.
2. **Módulo Taboo** — regras, telas e estado específicos do Taboo, montados sobre os
   primitivos do shell.

### Isolamento da lógica (peça central)

- **`taboo/logic.ts` — funções puras, sem React:** embaralhar deck, comprar carta, aplicar
  ação (acerto / pular / proibida) → novo estado, checar fim de turno, fim de jogo, calcular
  vencedor. Sem dependência de UI → **testável isoladamente** com Vitest.
- **Componentes React são finos:** renderizam o estado e disparam ações.
- **Estado da partida:** `useReducer` + Context (sem dependência extra de state management).
- **Persistência em `localStorage`:** recarregar/travar o celular no meio da partida restaura
  de onde parou.
- **Timer baseado em timestamp:** guarda o instante de término e calcula o tempo restante
  (em vez de um contador `setInterval`), pra a tela bloquear / sair de foco no celular não
  causar desvio no relógio.

---

## Telas (fluxo)

1. **Início** — lista de jogos (só Taboo no v1) → botão "Jogar Taboo".
2. **Configurar partida** — os ajustes da tabela acima; botão "Começar".
3. **Prepare-se (entre-turnos)** — de quem é a vez (Time A/B), lembrete de quem dá a dica e
   de quem é o juiz adversário; botão grande **"Começar turno"** (dispara o timer).
4. **Turno em andamento** — a carta (palavra-alvo grande + lista de proibidas em destaque),
   timer correndo, contador de pulos restantes, e 3 ações grandes:
   **Acertou (+1)** · **Pular** · **Proibida (−1)**. Cada ação avança pra próxima carta.
   Tempo zerou → resumo do turno.
5. **Resumo do turno** — acertos / erros / pulos do turno, placar atualizado;
   "Próximo time" ou, se a partida acabou, "Ver resultado".
6. **Resultado final** — placar final, time vencedor (ou empate); "Jogar de novo" / "Início".

---

## Modelo de dados (esboço)

```ts
type Card = { id: string; target: string; taboo: string[] };
type Deck = { id: string; name: string; cards: Card[] };

type EndMode = 'rounds' | 'points';
type MatchConfig = {
  deckId: string;
  turnSeconds: number;     // default 60
  skipLimit: number | null; // null = ilimitado; default 3
  skipCostsPoint: boolean;  // true = pular tira -1; false = só conta no limite
  endMode: EndMode;
  endValue: number;        // N rodadas ou X pontos
  teamNames: [string, string];
};

type TeamState = { name: string; score: number };

type GamePhase = 'config' | 'pre-turn' | 'in-turn' | 'turn-summary' | 'game-over';

type GameState = {
  config: MatchConfig;
  teams: [TeamState, TeamState];
  currentTeam: 0 | 1;
  roundsPlayed: number;       // turnos completados (por par de times)
  drawPile: string[];         // ids de carta embaralhados
  discardPile: string[];
  turn: {
    endsAt: number;           // timestamp (timer)
    skipsUsed: number;
    results: Array<{ cardId: string; outcome: 'correct' | 'taboo' | 'skip' }>;
  };
  phase: GamePhase;
};
```

### Dados do deck

- `src/data/decks/*.json` (ou `.ts` p/ checagem de tipo) — um deck PT embutido (~50–100 cartas
  pra começar), **editável à mão**, validado no carregamento. Editor in-app fica para uma fase
  posterior.

---

## Casos de borda

- **Deck acaba no meio do turno** → re-embaralha o descarte e continua (comportamento casual).
- **Empate no fim** → mostra empate (desempate / morte súbita fica para depois — YAGNI).
- **Recarregar no meio da partida** → restaura do `localStorage`; oferece "continuar" ou
  "nova partida".
- **Sair de foco / tela bloqueada durante o turno** → timer por timestamp mantém o tempo correto.

---

## Testes

- **Vitest** sobre a lógica pura (`taboo/logic.ts`): pontuação (acerto/proibida), limite de
  pulos, toggle do custo do pulo, condições de fim (rodadas e pontos), cálculo de vencedor e
  empate, re-embaralho do descarte.
- Testes de componente leves (ex.: fiação das ações na tela de turno).

---

## Fora de escopo do v1 (explícito)

- Multi-device / tempo real (Fase 2).
- Editor de decks dentro do app (edição via arquivo por enquanto).
- Outros jogos (o shell é estruturado para permitir, mas só o Taboo é construído).
- Cadastro de jogadores / rodízio de quem dá a dica.
- 3+ times.
- Som, animações e layout fino (a passada de design visual vem depois, sobre a estrutura estável).

**Incluído no v1:** PWA básico (manifest + service worker p/ "adicionar à tela inicial" e
funcionamento offline), barato via `vite-plugin-pwa`.
