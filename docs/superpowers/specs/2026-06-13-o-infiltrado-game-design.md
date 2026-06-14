# O Infiltrado — design

- **Data:** 2026-06-13
- **Status:** brainstorm aprovado; aguardando revisão do spec
- **Engine:** Impostor / Assimetria (Engine 1) — irmão do Insider
- **Território:** `src/games/impostor/infiltrado/**` (jogo) + extensão pontual em `src/net/server/**` (registry de jogo) + entry próprio `infiltrado.html`
- **Base:** worktree `feat/multiplayer` (tem a camada `src/net/` e as deps do PartyKit)

## 1. Problema e objetivo

Criar um jogo de festa **multi-device** (cada jogador no seu próprio celular, todos na
**mesma sala**) com mecânica de **impostor por assimetria de pergunta**:

- Todos recebem a **mesma** pergunta, **menos o(s) impostor(es)**, que recebe(m) uma
  pergunta **parecida, mas diferente**.
- Cada um escreve sua resposta no celular, sem ver a dos outros.
- Quando todos enviam, as respostas são reveladas com o nome do autor. **É só nesse
  momento que o impostor percebe que era o impostor** — ninguém é avisado do papel
  antes; durante a escrita, a tela de todos é idêntica.
- O grupo defende suas respostas (conversa falada, na mesa) e vota em quem acha que é
  o impostor.
- Se pegam o impostor, ele ainda tem uma chance de **escapar** adivinhando qual era a
  pergunta original.

Este é o **primeiro jogo real (não-demo) multi-device** do app, e o "uso #2" que o
spec do multiplayer (`2026-06-13-multiplayer-netcode-design.md`, §14) previa para
provar a abstração de **projeção secreta por-jogador** com um jogo de informação
assimétrica.

### Por que o multiplayer já existente é suficiente

A camada `src/net/` entrega lobby, presença, reconexão, timer autoritativo e — o que
importa aqui — **`project(state, playerId)` rodando no servidor antes do broadcast**,
de modo que a pergunta de cada um nunca vaza para os outros. "Cada jogador vê só a sua
pergunta" É a projeção secreta. A única lacuna é um **registry de jogo no servidor**
(hoje o servidor está hard-coded no demo `promptvote`).

## 2. Decisões travadas (no brainstorm)

| Tema | Decisão |
|---|---|
| Cenário | **Mesma sala.** Defesa é falada em voz alta; o app cuida de pergunta-secreta, revelação, votação e escape. Sem chat dentro do app. |
| Modo | **Multi-device** (cada um no seu celular). Pass-and-play fica fora do escopo. |
| Estrutura | **Várias rodadas + placar**, papel de impostor **rotativo**. |
| Nº de impostores | **Configurável 1–2** (2 só com ≥6 jogadores). |
| Impostor pego | **Tenta escapar** adivinhando a pergunta original. |
| Adjudicação do escape | **Texto livre + o grupo decide** (sim/não por maioria). |
| 2 impostores | **Pega o mais votado** — uma votação só; só o acusado tenta escapar. |

## 3. Não-objetivos (YAGNI deste ciclo)

- **Sem pass-and-play** (um celular passando de mão). É multi-device.
- **Sem chat/discussão no app** — defesa é verbal (mesma sala).
- **Sem wiring na home (`App.tsx`)** — território do Chat A. A PoC roda em entry
  próprio (`infiltrado.html`), igual o `net-demo.html`.
- **Sem persistência durável** de partida (estado em memória no Durable Object, com
  reconexão por `playerId`, igual ao resto da camada net).
- **Sem editor de baralho de perguntas** in-app — o conteúdo é um JSON versionado.
- **Sem generalização prematura** da camada net: este jogo *valida* o seam; só se
  refatora o contrato se algo não encaixar.

## 4. Arquitetura / componentes

Cada unidade tem propósito único e é testável isolada.

| Unidade | Faz o quê | Depende de |
|---|---|---|
| **`logic.ts`** `src/games/impostor/infiltrado/` | O `NetGame` puro: `createInitial`, `reducer`, `project` (esconde a pergunta do impostor), `legalActions`, `deadline`, `onTimeout`. Toda a regra vive aqui. | contrato `NetGame`, `rng` (de `src/net/rng`) |
| **`types.ts`** | Estado, ações, projeções, config, par de perguntas. | — |
| **Telas** `screens/` | Render por fase a partir da **projeção** (não do estado): Responder, Revelação, Votação, Escape, FimDeRodada, Placar. Tokens de `docs/visual-tokens.md`. | projeção, `useCountdown` (shell, read-only) |
| **`InfiltradoApp.tsx`** | Compõe lobby genérico (`src/net/ui`) + `useRoom` + as telas por fase. Expõe `<InfiltradoApp />`. | `useRoom`, lobby UI |
| **Deck** `data/decks/*.json` | Pares de perguntas `{ id, normal, impostor, tema }`. | — |
| **Registry de jogo** `src/net/server/registry.ts` (novo) | Mapa `gameId → { game, config, minPlayers }`. O servidor escolhe o jogo da sala por `gameId`. | contrato, `infiltrado/logic` |
| **Entry** `infiltrado.html` + `src/net/infiltrado-entry.tsx` | Ponto de entrada da PoC, fora do `App.tsx`. | `InfiltradoApp` |

## 5. Como O Infiltrado implementa o contrato `NetGame`

Tipos (o seam). A autoridade roda `createInitial`/`reducer`/`onTimeout` (dona de
`now`/`rng`); o cliente só renderiza `project()`.

```ts
type Phase = 'answering' | 'reveal' | 'voting' | 'escape' | 'roundEnd' | 'matchEnd';

interface QuestionPair { id: string; tema: string; normal: string; impostor: string; }

interface InfiltradoConfig {
  impostorCount: 1 | 2;     // 2 exige >= 6 jogadores
  rounds: number;           // default = nº de jogadores (rotativo justo)
  answerSeconds: number;    // timer de folga da escrita (default 90)
  voteSeconds: number;      // timer de folga da votação (default 60)
}

interface InfiltradoState {
  phase: Phase;
  config: InfiltradoConfig;
  players: { id: PlayerId; nickname: string }[];
  roundIndex: number;                 // 0-based
  impostorSchedule: PlayerId[][];     // sorteado no início: quem é impostor em cada rodada
  currentImpostors: PlayerId[];       // impostores da rodada
  pair: QuestionPair;                 // par sorteado da rodada
  endsAt: number | null;              // deadline autoritativo da fase atual
  answers: Record<PlayerId, string>;
  revealOrder: PlayerId[];            // ordem embaralhada de exibição (não vaza ordem de envio)
  votes: Record<PlayerId, PlayerId>;  // votante -> suspeito
  accusedId: PlayerId | null;         // mais votado (resolvido ao sair de voting)
  escapeGuess: string | null;         // palpite do impostor pego
  escapeVotes: Record<PlayerId, boolean>; // grupo decide (sim/não)
  roundOutcome: 'group' | 'impostor' | null; // quem venceu a rodada
  scores: Record<PlayerId, number>;
}

type InfiltradoAction =
  | { type: 'SUBMIT_ANSWER'; text: string }
  | { type: 'ADVANCE' }                       // host: reveal -> voting, roundEnd -> próxima
  | { type: 'SUBMIT_VOTE'; suspectId: PlayerId }
  | { type: 'SUBMIT_ESCAPE_GUESS'; text: string }   // só o impostor pego
  | { type: 'SUBMIT_ESCAPE_VOTE'; ok: boolean };     // os outros: o palpite valeu?
```

**Projeção por fase** (o que cada jogador vê — segredo nunca sai do servidor):

- `answering` → `{ phase, yourQuestion, yourAnswer, submitted, total, endsAt }`
  — `yourQuestion` é a normal **ou** a do impostor, **sem revelar qual**. UI idêntica.
- `reveal` → `{ phase, answers: { nickname, answer }[] }` na `revealOrder`. Papel do
  impostor **ainda não** revelado.
- `voting` → `{ phase, candidates: { id, nickname }[], yourVote, voted, total, endsAt }`
  — não dá pra votar em si mesmo.
- `escape` → ramifica:
  - pro impostor pego: `{ phase, role:'guessing', accusedNickname }`
  - pros demais: `{ phase, role:'judging', accusedNickname, guess, originalQuestion, youVoted }`
    — `originalQuestion` (a normal) é mostrada pra facilitar o julgamento; só aparece
    aqui, e o impostor pego não a recebe.
- `roundEnd` → `{ phase, impostorNicknames, accusedNickname, escapeGuess|null, outcome, scores }`
- `matchEnd` → `{ phase, finalScores }`

`legalActions` barra ação em fase/ator errado **antes** do reducer (ex.:
`SUBMIT_ESCAPE_GUESS` só é legal pro `accusedId`; `ADVANCE` só pro host — o host vem
do room engine, ver §10).

## 6. Fluxo de uma rodada + determinismo

```
1. answering  — autoridade sorteia par + impostor(es); cada um vê só a sua pergunta e responde.
                Avança quando todos enviam OU o timer de folga estoura (onTimeout).
2. reveal     — todas as respostas com nome, em ordem embaralhada. Host toca ADVANCE.
3. voting     — cada um vota num suspeito (privado). Avança quando todos votam OU timer.
                Ao sair: apura o mais votado -> accusedId. Empate -> ninguém pego.
4a. accused é inocente OU empate -> roundOutcome='impostor', vai pra roundEnd.
4b. accused é impostor -> escape:
      - impostor pego digita o palpite da pergunta original (SUBMIT_ESCAPE_GUESS)
      - os outros votam sim/não se valeu (SUBMIT_ESCAPE_VOTE); maioria 'sim' -> escape OK
      - escape OK -> roundOutcome='impostor'; senão -> 'group'. Vai pra roundEnd.
5. roundEnd   — revela impostor(es) + resultado + placar. Host ADVANCE -> próxima rodada
                ou matchEnd (após config.rounds).
```

- **Determinismo:** a autoridade é dona de `now` (timers viram `endsAt` carimbado) e de
  um **PRNG semeado** (escolha de impostor, par de perguntas, `revealOrder`). O cliente
  manda só intenção; nunca calcula tempo nem aleatoriedade.
- **`impostorSchedule`** é sorteado uma vez em `createInitial` (uma permutação dos
  jogadores; com 2 impostores, pares por rodada) pra garantir rotação justa sem repetir
  alguém antes de todos terem sido. Pares de perguntas são sorteados sem reposição
  dentro da partida (não repete pergunta).

## 7. Regras detalhadas e bordas

- **Quem pode ser impostor:** definido pelo `impostorSchedule`; o jogador não sabe.
- **2 impostores:** liberado só com ≥6 jogadores. Ambos recebem a **mesma** pergunta-
  impostora e **não se conhecem** (cada um descobre só na revelação). Na votação,
  **só o mais votado** é "pego" e tenta escapar; o segundo passa batido.
- **Empate na votação:** ninguém é pego → impostor(es) vencem a rodada.
- **Voto:** todos votam, inclusive o(s) impostor(es) (pra disfarçar); não dá pra votar
  em si mesmo. Quem não votar até o timer não tem voto contado.
- **Escape:** o palpite é texto livre; o grupo decide por maioria sim/não. O próprio
  impostor pego não vota no escape dele. **Empate no sim/não = escape falhou** (grupo
  vence) — o impostor precisa de maioria simples pra escapar.
- **Pontuação (default, fácil de ajustar):**
  - Impostor venceu a rodada (não pego, empate, ou escapou): **+2 pra cada impostor**.
  - Grupo venceu (pegou o impostor e o escape falhou): **+1 pra cada não-impostor**.
- **Fim da partida:** após `config.rounds` (default = nº de jogadores). Maior placar
  vence; empate no placar é aceitável (mostra todos no topo).
- **Mínimo de jogadores:** 3 (com 1 impostor). `minPlayers` vem do registry.

## 8. Conteúdo — baralho de pares de perguntas

`data/decks/infiltrado-padrao.json`: lista de `{ id, tema, normal, impostor }`. Os pares
são desenhados pra produzir respostas **sobrepostas mas distinguíveis**. Exemplos:

| tema | normal | impostor |
|---|---|---|
| Comida | Qual comida você comeria todo dia? | Qual comida você acha mais cara? |
| Viagem | Um lugar que você quer muito visitar? | Um lugar que você nunca visitaria? |
| Hábitos | Algo que você faz todo dia de manhã? | Algo que você quase nunca faz de manhã? |

Conteúdo é dado, não código: ampliar o baralho = editar JSON. PT-BR, com ortografia e
acentuação corretas (regra de copy pública).

## 9. Sala / lobby / config / identidade

- Reusa o **room engine** e a **lobby UI** genéricos de `src/net/`: criar sala → código
  de 4 letras → entrar com apelido; presença ao vivo; `playerId` estável em
  `localStorage`.
- **Config no lobby:** o host escolhe `impostorCount` (1, ou 2 se ≥6 jogadores) e,
  opcionalmente, `rounds`. Demais valores têm default.
- **Host** é só a flag de papel do room engine (quem toca "Começar"/ADVANCE); a
  autoridade é sempre o Durable Object.

## 10. Presença / reconexão

Herdado da camada net (sem trabalho novo): jogador que cai mantém a cadeira
(`present:false`), reconecta por `playerId` e recebe a **projeção atual** da fase. Como o
estado da partida vive no servidor, o iPhone que suspendeu o WebSocket volta sem perder
o jogo. Entrar tarde (partida em curso) é rejeitado.

## 11. Registry de jogo no servidor (a única mudança em `src/net/`)

Hoje `src/net/server/index.ts` instancia `promptvoteDemo` fixo. Mudança mínima:

- `src/net/server/registry.ts`: `{ [gameId]: { game, config, minPlayers } }`, incluindo
  `'infiltrado'` e mantendo `'promptvote-demo'`.
- O `gameId` da sala é definido na criação (query param no connect, junto de
  `playerId`/`nickname`) e guardado no estado da sala; o servidor resolve o `NetGame`
  pelo registry. Default permanece o demo se nenhum `gameId` vier (não quebra o
  `net-demo.html`).

Isso é território do "Chat Backend" — registrado no `status-chats.md` como extensão
coordenada, não reescrita.

## 12. Estratégia de testes

- **Unit (o grosso):** `logic.ts` é puro → testar como `taboo/logic.test.ts`.
  - `project()` **esconde**: o impostor recebe `impostor`, os outros `normal`, e
    **ninguém** sabe o próprio papel na fase `answering`; respostas dos outros não
    aparecem antes do `reveal`.
  - Fluxo: answering→reveal→voting→(escape)→roundEnd; apuração do mais votado; empate;
    escape OK/falho; pontuação; rotação do `impostorSchedule`; fim após N rodadas.
  - 2 impostores: mesma pergunta-impostora, só o mais votado tentando escapar.
- **Integração:** 1 teste com clientes simulados rodando o loop da sala via o room
  engine (join→start→answer→vote→escape→roundEnd), afirmando que cada cliente recebe
  **só a sua** projeção (a pergunta secreta não vaza no fio).
- **Manual:** celulares na mesma rede (`partykit dev` + `vite dev --host`), 3–6
  jogadores, incluindo uma reconexão forçada (bloquear a tela no meio).

## 13. Fronteiras e coordenação

- **Dono de:** `src/games/impostor/infiltrado/**`, `infiltrado.html`,
  `src/net/infiltrado-entry.tsx`, o deck em `data/decks/`.
- **Extensão coordenada (net):** `src/net/server/registry.ts` + ajuste fino em
  `src/net/server/index.ts`. Registrar no `status-chats.md`.
- **NÃO edita:** `src/App.tsx`, `src/shell/**`, `src/index.css` (só importa tokens),
  pastas de outros jogos. Wiring na home é trabalho futuro do Chat A.
- **Consome read-only do shell:** `useCountdown`. Reusa a lobby UI genérica de
  `src/net/ui`.

## 14. Como rodar o teste (mesma sala)

Como o jogo é "mesma sala", o caminho natural é todos no mesmo wifi:
- `partykit dev` (room server local) + `vite dev --host` (app no IP da LAN) → celulares
  na mesma rede abrem o `infiltrado.html`.
- **Não precisa** de conta Cloudflare nem `partykit login` pra esse teste. Um link
  estável pela internet (deploy PartyKit + Vercel) é opcional e fica pra depois — e o
  `npx partykit login` é interativo (o Gabs roda).

## 15. Riscos / questões abertas

- **Qualidade dos pares de perguntas** é o que faz ou quebra o jogo: precisam ser
  parecidos o bastante pra confundir, distintos o bastante pra dar pista. É trabalho de
  conteúdo, iterativo — o baralho inicial é um ponto de partida, não a verdade final.
- **Escape "grupo decide" é subjetivo** por construção (você escolheu o modo orgânico):
  o app só coleta o sim/não e mostra o palpite; a régua do que "valeu" é social.
- **Pontuação** é palpite inicial; ajustar após jogar de verdade.
- **`revealOrder`** embaralhada evita vazar ordem de envio, mas com poucos jogadores o
  metajogo de "quem demorou" ainda existe socialmente — aceitável.
