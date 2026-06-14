# Status dos chats — games-app

Documento de sincronização entre sessões paralelas do Claude. Atualizado ao fim de marcos relevantes.

**Última atualização:** 2026-06-13

## Repo / produção
- GitHub: `github.com/gabscrisostimo/games-app`
- Produção: `https://games-app-bice.vercel.app` (Vercel, deploy automático no push)
- Stack: Vite + React + TypeScript + Tailwind v4 + Vitest + vite-plugin-pwa

## Isolamento por worktree (importante)
Os chats compartilham o mesmo diretório de repositório, então cada um trabalha em seu **git worktree** próprio (pasta + branch isolados, mesmo `.git`). Isso evita que trocar de branch num chat puxe o tapete do outro.
- Chat A → branch `feat/visual-polish`
- Chat B → branch `feat/impostor-engine`
- Chat C → branch `feat/judging-engine` (worktree em `.claude/worktrees/feat+judging-engine`, base = `main` local `29983fb`)

**Nota de coordenação:** `docs/status-chats.md` é editado pelos 3 chats. Para evitar divergência, cada chat mexe **só na sua seção**; na hora de integrar os branches, este arquivo pode precisar de um merge manual trivial. Sugestão: o Gabs mantém a versão canônica no `main`.

## Chat A — Visual polish ✅ MERGEADO NO MAIN (branch: feat/visual-polish)

**Implementação 100% completa. 37 testes passando. Mergeado no `main` e publicado em produção (commit de merge `88bf223`).**

**O que foi feito (commitado em `feat/visual-polish`):**
- Spec: `docs/superpowers/specs/2026-06-13-visual-polish-design.md`
- Plano: `docs/superpowers/plans/2026-06-13-visual-polish.md`
- Tokens de design `@theme` em `src/index.css` (12 cores + animações + Inter)
- Restyle completo: `src/App.tsx`, `src/shell/ActionButton.tsx`, `src/shell/Scoreboard.tsx`
- Restyle Taboo: todas as 5 telas + `TabooApp.tsx` + `TabooSession.tsx` (transição de fase)
- `index.html` (fonte Inter), `vite.config.ts` (cores `#0c1220` + exclude worktrees do Vitest)
- Ícones PWA reais: `scripts/generate-icons.mjs` + `public/pwa-192.png` / `public/pwa-512.png`
- TDD: `src/games/taboo/screens/InTurnScreen.test.tsx` (4 novos testes: flash, urgência)
- Fix: worktrees excluídos do Vitest para evitar contaminação entre chats

**Ponto de integração preparado (App.tsx):** o card de cada jogo futuro deve ser adicionado aqui quando Chat B/C sinalizarem que o módulo está pronto. Contrato: `<XyzApp onHome={() => void} />`.

**Guia de estilo p/ as engines:** `docs/visual-tokens.md` — referência canônica de tokens (cor, fonte, container, botões, animações) que toda engine deve seguir em vez de cores cruas.

### Plano de integração Insider (Chat B) ↔ visual polish
1. **Tokens já estão no `main`** (`src/index.css`). Chat B precisa **mergear/rebasear o `main`** na branch `feat/impostor-engine` antes de reestilizar — senão as classes de token não existem no `index.css` da branch dele.
2. **Reestilização das 7 telas do Insider = Chat B** (dono de `src/games/impostor/**`), usando `docs/visual-tokens.md`. Chat A **não** edita `impostor/**` (respeita a fronteira). Decisão registrada: telas internas ficam com o dono da engine; Chat A só faz o wiring.
3. **Wiring na home = Chat A:** registro `View 'insider'` em `src/App.tsx` (mesmo padrão de `View 'taboo'`) apontando pra `<InsiderApp onHome={...} />`. Passo de integração **após** o Insider mergear no `main`.

**Dívida conhecida (Scoreboard):** `src/shell/Scoreboard.tsx` importa `TeamState` de `games/taboo/types` → **não é game-agnostic**. `ActionButton` e `useCountdown` são. Engine que quiser placar precisa primeiro generalizar/mover o tipo pro shell. Não bloqueia o Insider (ele usa só ActionButton + useCountdown).

**Arquivos que o Chat A é dono — NÃO TOCAR no outro chat:**
`src/App.tsx`, `src/shell/**`, `src/index.css`, `index.html`, `vite.config.ts`, `public/**`, `src/games/taboo/**`

## Chat B — Engine Impostor/Assimetria ✅ MERGEADO NO MAIN

- Roadmap de engines: `docs/ordem-de-construcao.md`
- Engine: **Impostor/Assimetria** (Insider → Chameleon → Spyfall → Deception)
- **Território reivindicado: `src/games/impostor/**`** (pasta aninhada por engine)
- Primeiro jogo: **Insider** → `src/games/impostor/insider/` — **implementação completa**
  - Spec aprovado: `docs/superpowers/specs/2026-06-13-insider-game-design.md`
  - Plano TDD: executado (Tasks 1–18, todas concluídas)
  - Branch: `feat/impostor-engine` (worktree `.claude/worktrees/feat+impostor-engine`)
  - **Módulo pronto para integração:** expõe `<InsiderApp onHome={() => void} />`
    - Arquivo: `src/games/impostor/insider/InsiderApp.tsx`
    - Inclui banner de retomada de sessão (resume) via `localStorage`
  - Camadas implementadas: `types.ts`, `logic.ts`, `reducer.ts`, `persistence.ts`, `playerStore.ts`, 6 screens, `InsiderSession.tsx`, `InsiderApp.tsx`
  - Suite: 80 testes passando (15 arquivos), `tsc --noEmit` sem erros, build de produção OK
- Reusa **read-only** do shell: `ActionButton`, `useCountdown` (importa, não edita)
- **Próximo passo para Chat A:** após fechar o visual polish, integrar `<InsiderApp onHome={...} />` em `src/App.tsx`
- **NÃO TOCA** em `src/App.tsx` nem `src/shell/` — integração na home fica com Chat A
- Estilos Tailwind centralizados em `src/games/impostor/insider/ui.ts` — adotar os design tokens do Chat A é edição de arquivo único.

## Chat C — Engine Julgamento/Cartas ✅ MERGEADO NO MAIN

- Roadmap de engines: `docs/ordem-de-construcao.md` (Engine 2)
- Engine: **Julgamento / Mão de Cartas** (Snake Oil → Cards Against Humanity → Funemployed → ...)
- **Território reivindicado: `src/games/judging/**`** + decks em `src/data/judging/**`
- Primeiro jogo: **Snake Oil** → `src/games/judging/snakeoil/`
  - Spec: `docs/superpowers/specs/2026-06-13-snakeoil-game-design.md` ✅
  - Plano TDD: `docs/superpowers/plans/2026-06-13-snakeoil.md` ✅
  - Implementação: ✅ **completo** — logic/reducer/persistência/7 telas/session/app; build ok; **49 testes do Snake Oil** (suíte total **87 verde** após merge do `main` com o visual polish)
  - Branch `feat/judging-engine` já **mergeou o `main`** (tem o visual polish + tokens) — sem conflito; `ActionButton`/`useCountdown` compatíveis.
  - **Pronto para wiring na home** (Chat A): registrar `View 'snakeoil'` em `src/App.tsx` (padrão do `View 'taboo'`) apontando pra `<SnakeOilApp onHome={...} />`. O visual polish já está no `main`, então pode wirar agora.
  - **Follow-up de tema (não bloqueia):** as telas do Snake Oil usam classes cruas (slate/amber) em vez dos tokens de `docs/visual-tokens.md`; alinhar ao tema Fusão depois (dono da engine = Chat C).
  - Modelo: pass-and-play, mão privada (passa o celular), cliente com carta de persona, fim configurável (rotações/pontos)
- Reusa **read-only** do shell: `ActionButton`, `useCountdown` (importa, não edita)
- Contrato de integração: expor `<SnakeOilApp onHome={() => void} />`
- **NÃO TOCA** em `src/games/impostor/**` (Chat B), nos arquivos do Chat A, nem em `src/games/taboo/**`

## Chat D — Engine Prompt→Voto (CONCLUÍDO)

- Roadmap de engines: `docs/ordem-de-construcao.md` (Engine 3)
- Engine: **Prompt → Resposta → Voto** (Quiplash → Fibbage → Herd Mentality → ...)
- Worktree: `.claude/worktrees/feat+promptvote-engine` / branch `feat/promptvote-engine` (base: `main`)
- **Território reivindicado: `src/games/promptvote/**`** + decks em `src/data/promptvote/**`
- Primeiro jogo: **Quiplash** → `src/games/promptvote/quiplash/` — **implementação completa**
  - Spec aprovado: `docs/superpowers/specs/2026-06-13-quiplash-game-design.md`
  - Plano TDD: `docs/superpowers/plans/2026-06-13-quiplash.md` — executado (Tasks 1–13, todas concluídas)
  - Modelo: **pass-and-play, single-device** (passa o celular pra responder e votar; telas de handoff escondem a resposta/voto anterior). Multi-device fica pro Chat Backend.
  - Dois modos (configuráveis na tela inicial): **Duelo** (anel — 2 autores por prompt) e **Grupo** (todos no mesmo prompt). Última rodada vira **Last Lash** (grupo) nos dois modos. Pontuação **fiel ao Quiplash** (% dos votos × multiplicador da rodada + bônus "Quiplash!" no sweep). Rodadas configuráveis (2–5). Votação em **lote** (1 passa-celular por votante).
  - **Módulo pronto para integração:** expõe `<QuiplashApp onHome={() => void} />`
    - Arquivo: `src/games/promptvote/quiplash/QuiplashApp.tsx`
    - Inclui banner de retomada de sessão (resume) via `localStorage`
  - Camadas implementadas: `types.ts`, `logic.ts` (pura, `rng` injetável), `reducer.ts`, `persistence.ts`, `playerStore.ts`, `ui.ts`, 5 screens (Config/Answering/Voting/RoundResult/FinalResult), `QuiplashSession.tsx`, `QuiplashApp.tsx`; deck PT-BR `src/data/promptvote/quiplash-padrao.json` (56 prompts) + loader `src/data/promptvote/index.ts`
  - Suite: **116 testes passando (24 arquivos)** — 32 novos do Quiplash (8 arquivos). `tsc --noEmit` sem erros, build de produção OK.
- Reusa **read-only** do shell: `ActionButton` (importa, não edita)
- **Próximo passo para Chat A:** integrar `<QuiplashApp onHome={...} />` em `src/App.tsx` (registrar `View 'quiplash'`, mesmo padrão de `taboo`/`insider`). Estilos centralizados em `src/games/promptvote/quiplash/ui.ts` (design tokens do Chat A).
- **Nota p/ Chat Backend:** Quiplash é a âncora de validação do netcode — `logic.ts`/`reducer.ts` são puros e consumíveis por contrato (todas as funções de `logic.ts` recebem `rng` injetável; o reducer injeta o deck).
- **NÃO TOCA** em: Chat A (shell/home/taboo), Chat B (`impostor/**`), Chat C (`judging/**`)

## Chat ? — Engine Papéis Ocultos + Noite (andaime pronto, implementação pendente)

- Roadmap de engines: `docs/ordem-de-construcao.md` (Engine 4)
- Engine: **Papéis Ocultos + Noite** (One Night Werewolf → Secret Hitler → Mascarade → BotC)
- Worktree: `.claude/worktrees/feat+hidden-roles-engine` / branch `feat/hidden-roles-engine` (base: `main`)
- **Território reivindicado: `src/games/hiddenroles/**`**
- Primeiro jogo: **One Night Werewolf** → `src/games/hiddenroles/onenight/`
  - Andaime criado: pastas com `.gitkeep`, sem lógica ainda
  - Contrato de integração: `<OneNightApp onHome={() => void} />`
  - Implementação: **pendente** (próximo passo: spec + writing-plans)
- **NÃO TOCA** em: Chat A (shell/home/taboo), Chat B (`impostor/**`), Chat C (`judging/**`)

## Chat Backend — Multiplayer / Netcode (`src/net/`)

**Status: camada genérica + adaptador + VIEW CLIENTE do Quiplash real — JOGÁVEL e VALIDADO EM CELULAR REAL.** O **Quiplash real** (`quiplash-net.html` → `QuiplashNetApp`/`QuiplashNetView`, servidor `src/net/server/index.ts` rodando `quiplashNet`) foi jogado completo em **Android + iOS + 3º device** (2026-06-14): duelo com prompts diferentes por jogador (2 cada), projeção secreta, voto concorrente anônimo, Last Lash na última rodada, placar e final + jogar-de-novo — tudo OK. Antes disso o demo (`net-demo.html`) já tinha validado lobby/presença/**reconexão iOS**. Branch `feat/multiplayer` em `.claude/worktrees/feat+multiplayer`, **rebaseado em `origin/main`**. Spec: `docs/superpowers/specs/2026-06-13-multiplayer-netcode-design.md`. Plano: `docs/superpowers/plans/2026-06-13-multiplayer-netcode.md`.

- **Transporte decidido: PartyKit** (sala = Durable Object no Cloudflare roda o mesmo reducer e faz broadcast de projeção por-jogador). App segue no Vercel; room server num deploy Cloudflare à parte. Descartados Supabase Realtime/Ably (relay, vazam segredo), host-peer (frágil), socket próprio (mais ops).
- **O que a PoC cobre:** lobby genérico (criar→código 4 letras→entrar c/ apelido) + presença + reconexão (por `playerId` em localStorage) + sincronização com **projeção secreta por-jogador** + timer autoritativo. Validada por um **demo promptvote descartável** (`src/net/__demo__/`). Verificação: **243 testes** verdes no repo (`tsc -b` limpo), servidor PartyKit boota, e um **smoke end-to-end com 3 clientes `PartySocket` reais** (join→start→answer→vote→reveal) passou incluindo secrecy no fio e voto anônimo.
- **Território (dono): `src/net/**`** + `partykit.json` + `net-demo.html`. **NÃO edita** engines, `src/shell/`, `src/App.tsx`, `src/index.css` (só importa os tokens).
- **Deps adicionadas ao `package.json`** (heads-up de merge): `partysocket` (dep), `partykit` (devDep). `.gitignore` ganhou `.partykit/` (cache local). Nenhum arquivo de outro chat tocado.

### Contrato de integração `NetGame` (para as engines rodarem em rede)
Cada jogo que quiser multi-device implementa esta interface (de `src/net/contract.ts`). A autoridade roda `createInitial`/`reducer`/`onTimeout` (dona de `now`/`rng`); o cliente só renderiza `project(state, playerId)`. **A Engine 3 (promptvote/Quiplash) NÃO precisou saber de rede:** o adaptador `src/net/adapters/quiplash.ts` (proof #1 ✅) embrulha o `logic.ts` da engine **sem editar `src/games/promptvote/**`** (reusa `createSession`/`submitAnswers`/`scoreRound`/`nextRound`/`matchupResults`/`ranking`). **31 testes** (28 unit + 3 integração via `roomEngine` com 3 clientes): projeção secreta, voto anônimo por índice, placar correto pela rede.

```ts
interface NetGame<State, Action extends { type: string }, Projection, Config> {
  createInitial(ctx: { config: Config; players: {id; nickname}[]; now: number; rng: () => number }): State;
  reducer(state: State, action: Action, ctx: { now: number; rng: () => number; actorId: string }): State;
  project(state: State, playerId: string): Projection;   // o que ESTE jogador vê (segredo nunca sai)
  legalActions(state: State, playerId: string): Action['type'][];
  deadline?(state: State): number | null;                // timer autoritativo
  onTimeout?(state: State, ctx: { now: number; rng: () => number }): State;
}
```

- **Ponto de integração na home (Chat A):** hoje a PoC roda em entry próprio (`net-demo.html` → `src/net/demo-entry.tsx`), **sem tocar `App.tsx`**. Wiring na home é trabalho futuro do Chat A (quando virar produto).
- **Generalização (regra do três):** demo (1º uso) → **Quiplash real via adaptador + view, jogado ao vivo em 3 celulares (2º uso — proof #1 ✅, o seam segurou)** → **Spyfall** (papel secreto estático vs projeção por-fase) é o gatilho do próximo ciclo, fora deste escopo. **Achado do proof #1:** o contrato segurou estado/projeção/rng, mas o reducer pass-and-play do Quiplash embute um **modelo de turno sequencial** (`voteCursor`) que o adaptador teve que **traduzir pra votação concorrente por ator**. Sinal pra avaliar (depois do Spyfall) se a forma certa é "engines expõem reducer endereçável por ator".
- **Limitações conhecidas de PoC (não-bloqueantes):** host não transfere ao cair (reconexão por playerId estável traz de volta); estado da sala em memória (sem persistência durável).
- **Teste de celular: FEITO via cloudflared (2026-06-13).** `npx partykit deploy` está inviável (zona `*.partykit.dev` no teto de 10k domínios da Cloudflare) e o app roda em **WSL2** (atrás de NAT, LAN não alcança). Solução que funcionou: **2 quick tunnels do cloudflared** — um pro app (`vite dev` :5174, com `--http-host-header localhost:5174` pra furar o `allowedHosts` do Vite sem editar `vite.config.ts`) e um pro room server (`partykit dev` :1999). `.env.local` (gitignored) aponta `VITE_PARTYKIT_HOST` pro túnel do room server. Túneis são **efêmeros** (trycloudflare, URL aleatória por run) — pra um teste pontual. Persistente exigiria domínio próprio (`partykit deploy --domain`) ou named tunnel.

## Regras de ouro (evitar conflito)
1. Cada chat fica na sua pasta. Fronteiras: `src/games/taboo/**` + shell/home = Chat A; `src/games/impostor/**` = Chat B; `src/games/judging/**` (+ `src/data/judging/**`) = Chat C; `src/games/promptvote/**` (+ `src/data/promptvote/**`) = Chat D (Engine 3); `src/games/hiddenroles/**` = Engine 4; `src/net/**` = Chat Backend; demais `src/games/<engine>/**` = chats de engine.
2. `src/App.tsx` e `src/shell/` têm dono único = Chat A enquanto o visual polish não fechar (outros chats só **importam** do shell, nunca editam).
3. Antes de editar qualquer arquivo fora da sua pasta, checar este doc.
4. `src/games/taboo/logic.ts|types.ts|reducer.ts|persistence.ts` e `src/data/` são estáveis — ninguém toca sem motivo forte.

## Pendências pós-merge (não esquecer)

> Atualizado 2026-06-13 após merges de B (Insider) e C (Snake Oil) + wiring na home.

### ✅ Concluídas
- **Untrackar `.claude/settings.local.json`** — feito (`git rm --cached` + já coberto por `*.local` no `.gitignore`, commit `573cb8d`).
- **Wiring na home** — Insider e Snake Oil adicionados em `src/App.tsx` (commit `573cb8d`).

### Pendentes (opcionais / sem urgência)

- **Branch órfão `origin/feat/visual-polish` no GitHub** — ainda existe remotamente. Limpar quando conveniente: `git push origin --delete feat/visual-polish`.
- **Scoreboard não é game-agnostic** — `src/shell/Scoreboard.tsx` importa `TeamState` de `games/taboo/types`. Engine que precisar de placar deve primeiro generalizar o tipo para o shell. Não bloqueia nenhum jogo atual. Tarefa do Chat A quando surgir a demanda.
- **Telas do Snake Oil usam classes cruas** (slate/amber) em vez dos tokens Fusão de `docs/visual-tokens.md`. Realinhar ao tema depois — território do Chat C.
- **Wiring de engines futuras** — cada nova engine que mergear no `main` deve ser adicionada como card em `src/App.tsx`. Hoje o dono é quem fizer o merge (Chat A fechou, qualquer chat pode fazer o wiring da própria engine).
