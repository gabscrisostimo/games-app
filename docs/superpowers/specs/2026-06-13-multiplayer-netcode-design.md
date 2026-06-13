# Multiplayer / Netcode — design

- **Data:** 2026-06-13
- **Autor:** Chat Backend (worktree `feat/multiplayer`)
- **Status:** aprovado no brainstorm; aguardando revisão do spec
- **Território:** `src/net/**` (+ `partykit.json`, dep `partykit`/`partysocket` no `package.json`)

## 1. Problema e objetivo

Hoje os jogos são **pass-and-play**: tudo num celular, passando de mão em mão.
O objetivo é permitir **multi-device** — cada jogador no seu próprio celular, na
mesma sala. A meta **não** é um backend por jogo, nem um framework especulativo:
é uma **camada genérica reutilizável** (lobby + transporte + presença +
sincronização de estado + projeção por-jogador) extraída de **um** jogo real de
validação.

Princípio: a abstração certa aparece depois de **2 usos concretos** (regra do
três). Construímos a camada agora contra um jogo, e só generalizamos quando um
2º jogo provar a forma.

### Fatos do código que dominam o design

1. **O reducer recebe `rng` e `now` como entrada.** No Taboo:
   `startTurn(state, now, rng)`, `applyAction(state, outcome, rng)`, e a ação
   `START_TURN` carrega `now`. Em multi-device isso é o **seam de
   determinismo**: a autoridade tem que ser dona do relógio e do RNG; o cliente
   manda só intenção. Senão os clientes divergem.
2. **O estado do Taboo é 100% público** (jogo de times, tela única
   compartilhada). Logo o Taboo **não consegue** testar projeção por-jogador.
   A âncora real de validação é um jogo com informação secreta.

## 2. Decisões travadas (no brainstorm)

- **Transporte: PartyKit.** Cada sala é um Durable Object (ator stateful) no
  Cloudflare que roda o **mesmo reducer** do jogo e faz broadcast de uma
  **projeção por-jogador**. É *compute*, não relay — encaixa direto no modelo
  autoridade→projeção e resolve o problema de `rng`/`now`. Presença, reconexão
  e hibernação vêm de fábrica. O app continua no Vercel; o room server é um
  deploy Cloudflare separado (`partykit deploy`, free tier).
  - Descartados: Supabase Realtime / Ably (relay pub/sub — vazam segredo no
    broadcast, sem compute pra autoridade); host-as-server/WebRTC (host cai =
    jogo cai); socket Node próprio (mesma entrega do PartyKit com muito mais
    ops).
- **Escopo da PoC: jogável em 2 celulares de verdade.** Lobby UI mínima
  genérica + reducer demo promptvote + deploy PartyKit real. Abrir em 2
  telefones (1 Android + 1 iOS) e jogar — prova transporte, presença, projeção
  secreta e reconexão.
- **Âncora de validação: Quiplash** (engine `promptvote`). Como o `logic.ts` do
  Quiplash ainda não existe (worktree só com andaime), a PoC começa num **demo
  promptvote descartável** que eu controlo, e o Quiplash real entra depois pelo
  **mesmo contrato**, sem mexer no transporte.

## 3. Não-objetivos (YAGNI deste ciclo)

- **Não** generalizar a abstração antes de um 2º jogo (Spyfall). Um único uso
  não justifica abstrair.
- **Não** front-runar os outros jogos das engines.
- **Não** integrar na home (`App.tsx`) — é território do Chat A; fica como passo
  de coordenação futuro. O demo tem entry próprio.
- **Não** persistência de longo prazo / contas / matchmaking / chat. Estado de
  sala é em memória no Durable Object (com reconexão); persistência é problema
  futuro.
- **Não** ranking, reconexão "para sempre", anti-cheat sofisticado.

## 4. Arquitetura / componentes

Cada unidade tem um propósito único, interface bem definida, e dá pra testar
isolada.

| Unidade | Faz o quê | Interface | Depende de |
|---|---|---|---|
| **Room server** `src/net/server/` | 1 sala = 1 Durable Object. Guarda estado autoritativo, recebe mensagens, roda `reducer` com `now`/`rng` do server, projeta por-jogador e envia. | mensagens WS (`join`/`start`/`action`/`leave`) ↔ (`projection`/`lobby`/`error`) | PartyKit, contrato `NetGame` |
| **`useRoom()`** `src/net/client/useRoom.ts` | Hook que embrulha PartySocket: connect, auto-reconnect, re-join com identidade salva, parse de mensagens. | `useRoom(code) → { phase, players, me, projection, send, connected }` | PartySocket |
| **identity** `src/net/client/identity.ts` | `playerId` gerado 1x em `localStorage`; reconecta e reivindica a mesma cadeira. | `getPlayerId()`, nickname por sala | `localStorage` |
| **Lobby UI** `src/net/ui/` | Telas genéricas: Criar/Entrar (código + apelido) → Lobby (lista + presença + Start do host) → render do view do jogo → Fim. Tokens de `docs/visual-tokens.md`. | componentes React; recebe `useRoom` | useRoom, tokens |
| **Contrato `NetGame`** `src/net/contract.ts` | O **seam**: o que todo jogo implementa pra rodar em rede. | ver §5 | — |
| **Demo promptvote** `src/net/__demo__/` | Reducer descartável + view mínima. Exercita projeção secreta + prompt/timer autoritativos. | implementa `NetGame` | contrato |
| **Demo entry** `net-demo.html` + `src/net/demo-entry.tsx` | Ponto de entrada da PoC fora do `App.tsx` (não toca o shell). | rota própria de dev | lobby UI |

## 5. Contrato `NetGame` (o seam)

```ts
// src/net/contract.ts
export interface InitCtx<Config> {
  config: Config;
  players: { id: string; nickname: string }[];
  seed: number;            // semeado pela autoridade no início da partida
}

export interface ActionCtx {
  now: number;             // relógio da autoridade
  rng: () => number;       // PRNG semeado, determinístico na autoridade
  actorId: string;         // quem mandou a ação
}

export interface NetGame<State, Action extends { type: string }, Projection, Config> {
  createInitial(ctx: InitCtx<Config>): State;
  reducer(state: State, action: Action, ctx: ActionCtx): State;
  project(state: State, playerId: string): Projection; // o que ESTE jogador vê
  legalActions(state: State, playerId: string): Action['type'][]; // guarda server-side
}
```

- O server só conhece `NetGame`; não conhece regra de jogo nenhuma.
- A projeção é **pura** e roda **no server** antes do broadcast → segredo nunca
  sai pra quem não pode ver.
- `legalActions` barra ação em fase/ator errado **antes** do reducer.
- Quiplash real (Engine 3) será embrulhado por um adaptador em
  `src/net/adapters/quiplash.ts` que importa o reducer deles — **sem editar**
  `src/games/promptvote/**`.

## 6. Fluxo de uma ação + determinismo

```
tap → send({ type: 'SUBMIT_ANSWER', text })     // cliente NÃO manda now/rng
  → WS → room server
  → legalActions(state, actorId)  // pode, nessa fase?  senão → error, sem mudança
  → reducer(state, action, { now: Date.now(), rng: seededRng(), actorId })
  → estado autoritativo novo
  → para cada player p conectado: send(p, project(state, p))
```

- A autoridade é dona de `now` e de um **PRNG semeado** (seed criado no início da
  partida, guardado no estado pra reprodutibilidade). O cliente nunca calcula
  tempo nem aleatoriedade que afete o jogo.
- Timers (ex.: tempo de resposta) viram `endsAt` carimbado pela autoridade; o
  cliente só renderiza a contagem (pode reusar `useCountdown` do shell).

## 7. Modelo de sala / lobby / identidade

- **Criar sala** → server gera código curto (ex.: 4 chars A–Z) → cliente vira
  host.
- **Entrar** → código + apelido. O `playerId` (em `localStorage`) é a identidade
  estável; o apelido é cosmético por sala.
- **Host** é só uma flag de papel (quem aperta "Começar"), **não** a autoridade.
  Autoridade é sempre o Durable Object.
- **Lobby** lista jogadores + presença ao vivo. Start habilita com o mínimo de
  jogadores do jogo (vem do `Config`).

## 8. Presença / reconexão / bordas

- **Player cai** (lock de tela, troca de app, rede) → `present:false`, cadeira
  **mantida**, os outros são avisados. Sem auto-kick durante a partida.
- **Reconecta** → PartySocket reconecta sozinho; cliente re-envia `join` com o
  `playerId` salvo; server re-vincula a conexão à cadeira existente, marca
  presente e manda a **projeção atual**.
- **Host sai** → o Durable Object sobrevive sozinho; a flag de host passa pro
  próximo jogador. **O jogo não morre** (vantagem central sobre host-peer).
- **Entrar tarde** (partida em curso) → rejeitado com "partida em andamento"
  (mais simples pra PoC; spectator fica pra depois).
- **Ação inválida** → barrada por `legalActions`, sem mudança de estado, erro
  opcional só pro cliente que mandou.
- **Sala vazia** → PartyKit hiberna; estado em memória pode expirar (aceitável
  na PoC).

## 9. Demo promptvote (regras mínimas — descartável)

Namespaced em `src/net/__demo__/` pra ninguém confundir com o Quiplash real.
Existe só pra exercitar o que o Taboo não consegue.

Fases:
1. **answering** — cada jogador recebe um prompt (atribuído pela autoridade) e
   submete um texto. **Projeção mostra só o seu** prompt/resposta, nunca a dos
   outros.
2. **voting** — todos veem o par de respostas de um prompt e votam; **não dá pra
   votar na própria**.
3. **reveal** — placar.

O que isso prova: (a) **projeção secreta** server-side; (b) **atribuição e timer
autoritativos** (RNG/relógio na autoridade). São exatamente os dois eixos que o
Taboo (estado público) não cobre.

## 10. Cross-platform (Android + iOS juntos)

Funciona por construção: é **PWA sobre WebSocket padrão**, sem código nativo.
Android Chrome e iOS Safari são só dois clientes de browser na mesma sala —
indistinguíveis pro server. WebSocket + `localStorage` funcionam nos dois.

Único caveat real (não é interop, é **background**): o Safari do iOS suspende
WebSocket de forma agressiva quando a tela bloqueia ou troca-se de app — comum
em party game. Por isso a **reconexão (§8) é peça de primeira classe**: o iPhone
que cochilou reivindica a cadeira de volta e recebe a projeção atual. O teste
manual valida isso de propósito (1 Android + 1 iOS, com um bloqueando a tela no
meio).

## 11. Estratégia de testes

- **Unit (o grosso):** `reducer`, `project`, `legalActions` são puros → testar no
  estilo de `taboo/logic.test.ts`. Teste-chave: `project` **esconde** o que deve
  (resposta secreta não vaza; não dá pra votar na própria).
- **Integração:** 1 teste com **2 clientes simulados** rodando o loop de
  mensagens da sala (join → start → submit → vote → reveal), afirmando que cada
  cliente recebe **só a sua** projeção.
- **Manual:** deploy PartyKit + 2 celulares (Android + iOS) jogando, incluindo
  uma reconexão forçada.

## 12. Fronteiras e coordenação

- **Dono de:** `src/net/**`, `partykit.json`, e a dep `partykit`/`partysocket`
  no `package.json` (registrado no `status-chats.md` pra evitar surpresa de
  merge).
- **Não edita:** `src/App.tsx`, `src/shell/**`, `src/index.css`, `index.html`,
  `vite.config.ts`, `public/**`, nem pasta de jogo nenhuma
  (`src/games/**`). O demo usa entry próprio (`net-demo.html`), então **não toca
  o `App.tsx`**.
- **Consome** o reducer do `promptvote` via adaptador quando existir — **nunca**
  edita `src/games/promptvote/**`. O contrato `NetGame` (§5) é publicado no
  `status-chats.md` pra Engine 3 implementar `project()` do Quiplash.
- Cliente lê `VITE_PARTYKIT_HOST` (env var) — **não** precisa editar
  `vite.config.ts`.

## 13. Como rodar o teste de 2 celulares

- PartyKit **deployado** no Cloudflare → realtime e reconexão reais, pela
  internet.
- App servida via `vite dev --host` no wifi local → os celulares batem no IP da
  máquina. (Hospedar o app de verdade no Vercel = integração futura do Chat A.)
- Cliente aponta pro host do PartyKit via `VITE_PARTYKIT_HOST`.

## 14. Caminho de generalização (regra do três)

1. **Demo promptvote** — 1º uso concreto; valida lobby+transporte+sync+projeção.
2. **Quiplash real** — quando a Engine 3 entregar o `logic.ts`, embrulha no mesmo
   `NetGame` via adaptador. Encaixou limpo → o seam está no lugar (proof #1).
3. **Spyfall** (engine hidden-roles) — papel secreto **estático** (atribuído 1x,
   revelado só no fim) vs projeção **dependente de fase** do Quiplash. Se um
   único `project(state, playerId)` serve os dois, a abstração se sustenta
   (proof #2). Se forçar outra forma, refatora **aí** — não especula agora.
   **Fora do escopo deste spec**; é o gatilho do próximo ciclo.

## 15. Riscos / questões abertas

- **PartyKit/Cloudflare como 2º alvo de deploy** — exige conta Cloudflare +
  `partykit deploy`. Free tier cobre a PoC; rever limites se virar produção.
- **Custo de tokens/manutenção do dev** — `vite dev --host` é PoC, não produção;
  a integração Vercel é trabalho separado do Chat A.
- **Versão do PartyKit/PartySocket** — fixar versões no `package.json` e
  confirmar compatibilidade com Vite 5 / React 18 na fase de plano.
- **Forma final da projeção** — só fica provada após Quiplash + Spyfall; o
  contrato em §5 é a hipótese, não a verdade final.
