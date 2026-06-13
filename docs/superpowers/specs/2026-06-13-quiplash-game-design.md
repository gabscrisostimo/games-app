# Design — Quiplash (games-app)

**Data:** 2026-06-13
**Status:** Aprovado (design); pendente plano de implementação
**Engine:** Prompt → Resposta → Voto (promptvote) — **primeiro jogo: Quiplash**
**Pasta:** `src/games/promptvote/quiplash/` · dados em `src/data/promptvote/`

---

## Contexto

Quiplash é o primeiro jogo da engine "Prompt → Resposta → Voto" (depois: Fibbage, Herd
Mentality, Balderdash, Psych…). O núcleo reutilizável é: **prompt → cada jogador responde texto
→ todos veem as respostas → votam → pontua**.

Modo de uso: **presencial, passa-e-joga** (um único celular passado de mão em mão) — mesmo
modelo do Taboo/Insider. Multi-device é fase futura (Chat Backend), fora de escopo; por isso
`logic.ts`/`reducer.ts` ficam **puros e consumíveis por contrato** (Quiplash é a âncora de
validação do netcode).

Decisões de produto (do brainstorming, 2026-06-13):
- **Dois modos, escolhidos na config**, para o grupo testar e comparar:
  - **Duelo** (Quiplash clássico): cada prompt vai pra 2 jogadores; votam os não-autores.
  - **Grupo**: todos respondem o mesmo prompt; vota todo mundo (menos na própria).
- **Pontuação fiel**: % de votos × multiplicador da rodada + bônus "Quiplash!".
- **Rodadas configuráveis** (default 3); multiplicador = número da rodada; **última rodada = Last
  Lash** (sempre formato grupo, prompt único). No default de 3, reproduz o clássico exatamente.
- **Duelo: 2 respostas por jogador por rodada** (distribuição "anel" clássica).
- Jogadores **nomeados e persistidos** (localStorage), reusados entre partidas. Mín. 3, recomendado ≤ 8.
- **Sem timer** na v1 (pass-and-play é relax: passa, escreve, passa).
- **Votação em lote**: o celular passa **uma vez por votante** (vota em todos os confrontos
  elegíveis de uma vez), mantendo o nº de handoffs em ~N por fase, não N².

---

## Conceito central: o "confronto" (Matchup)

Os dois modos produzem uma lista de **confrontos**, e voto/apuração/pontuação operam igual sobre
todos. **É isto que vira a engine** — os próximos jogos trocam só *como os confrontos são montados
e pontuados*.

Um confronto = `{ prompt, respostas[] (com autor), quem pode votar, votos }`:
- **Duelo:** 1 prompt + 2 respostas; `voterIds` = todos menos os 2 autores.
- **Grupo / Last Lash:** 1 prompt + respostas de todos; `voterIds` = todos (cada um não pode votar
  na própria resposta).

---

## Regras (como o app as encena)

**Estrutura da partida:**
- Rodada `i` de `R` (1-based): **multiplicador = `i`**.
- Rodadas `1..R-1`: formato do modo escolhido (Duelo ou Grupo).
- Rodada `R`: **Last Lash** — sempre formato Grupo, prompt único. (No modo Grupo todas as rodadas
  já são grupo; a última só tem o multiplicador mais alto.)

**Distribuição no modo Duelo (anel):** com N jogadores, N prompts por rodada; prompt `k` é
atribuído aos jogadores na posição `k` e `k+1` (mod N). Logo cada jogador responde **2 prompts**
(o `k-1` e o `k`), e cada duelo é votado pelos outros **N−2**. Funciona para qualquer N ≥ 3.

**Distribuição no modo Grupo / Last Lash:** 1 prompt na rodada; **todos** respondem; 1 confronto
com N respostas; vota todo mundo (não na própria).

**Fases** (todas pass-and-play; tela de handoff esconde o conteúdo anterior — padrão
`RoleRevealScreen` do Insider: gate com `useState` local + índice/cursor no estado):

1. **`answering`** — passa o celular por jogador (ordem fixa). Cada um vê seu(s) prompt(s) e
   campo(s) de texto (2 no Duelo, 1 no Grupo), escreve, toca **"Esconder e passar"**. Respostas
   gravadas nos confrontos. Avança por `answerIndex` (jogador atual).
2. **`voting`** — passa o celular por **votante** (lote). A pessoa vê, um a um, cada confronto em
   que é elegível: prompt + respostas **anônimas e embaralhadas** (ordem por-votante via `rng`),
   toca na favorita. Ao terminar os seus, **"Esconder e passar"**. Modelado como fila de cédulas
   `ballots: {voterId, matchupIndex}[]` + `voteCursor`; a tela de handoff aparece quando o
   `voterId` da cédula muda. Autor nunca aparece como cédula da própria resposta.
3. **`round-result`** — revela cada confronto: respostas com autor, contagem de votos e pontos
   ganhos; selo **"Quiplash!"** em quem levou todos os votos. Aplica os pontos ao placar acumulado.
   Botão **"Próxima rodada"** (ou "Ver resultado" na última).
4. **`final-result`** — ranking acumulado + campeão. **"Jogar de novo"** (mesma turma, zera placar e
   rodada) / **"Início"** (`onHome`).

**Pontuação (fiel):** por confronto, com `total` = nº de votos válidos no confronto e `votos_a` =
votos do autor `a`:
- `pontos_a = round(MAX_POR_CONFRONTO × multiplicador × votos_a / total)`, com `MAX_POR_CONFRONTO = 1000`.
- **Bônus Quiplash!**: se `votos_a === total` **e** `total > 0` **e** havia ≥ 1 resposta adversária
  com 0 votos → `+ round(MAX_POR_CONFRONTO × multiplicador × BONUS_FRAC)`, `BONUS_FRAC = 0.5`.
- `total === 0` (sem votantes elegíveis) → 0 pontos no confronto (guarda contra divisão por zero).
- Constantes (`MAX_POR_CONFRONTO`, `BONUS_FRAC`) centralizadas em `logic.ts` para calibrar.

---

## Arquitetura

**Stack:** já existente — Vite + React + TS + Tailwind v4 + Vitest. Mesma separação do
Taboo/Insider: tipos puros → lógica pura (`rng` injetável) → reducer → persistence → entry →
session → telas.

**Reuso do shell (read-only, sem editar — dono é o Chat A):**
- `src/shell/ActionButton.tsx` — botões de ação grandes.
- **Não** usa `useCountdown` (sem timer na v1).
- **Não** usa `Scoreboard` (acoplado ao Taboo). O ranking final/rodada é uma tela própria simples
  na pasta da engine, alimentada por `scores: Record<playerId, number>`.

**Estilo:** somente tokens de `docs/visual-tokens.md` via `ui.ts` (nunca cor crua).

### Estrutura de pastas

```
src/games/promptvote/
  quiplash/
    types.ts             — tipos do domínio (sem React)
    logic.ts             — funções puras, rng injetável
    reducer.ts           — QuiplashAction + reducer → delega pra logic
    persistence.ts       — save/load/clear  (games-app:quiplash:current)
    playerStore.ts       — load/save lista de jogadores (games-app:quiplash:players)
    QuiplashApp.tsx      — entry { onHome }, carrega save → Config ou Session
    QuiplashSession.tsx  — useReducer + useEffect salva
    ui.ts                — classes Tailwind centralizadas (tokens)
    screens/
      ConfigScreen.tsx
      AnsweringScreen.tsx
      VotingScreen.tsx
      RoundResultScreen.tsx
      FinalResultScreen.tsx
src/data/promptvote/
  quiplash-padrao.json   — deck PT-BR inicial (~50-60 prompts)
  index.ts               — getQuiplashDeck(id) + (teste do shape do deck)
```

`promptvote/shared/` (handoff, lista nomeada) **não** é criado agora — extrai-se quando o 2º jogo
da engine (Fibbage) chegar e o compartilhado ficar evidente (YAGNI).

### Modelo de dados

```ts
type Player = { id: string; name: string };
type Mode = 'duel' | 'group';

type PromptCard = { id: string; text: string };
type PromptDeck = { id: string; name: string; cards: PromptCard[] };

type QuiplashConfig = {
  players: Player[];        // >= 3
  mode: Mode;
  rounds: number;           // default 3
  deckId: string;
};

type Answer = { authorId: string; text: string };

type Matchup = {
  promptId: string;
  promptText: string;
  answers: Answer[];                 // duelo: 2; grupo: N
  voterIds: string[];                // quem pode votar neste confronto
  votes: Record<string, string>;     // voterId -> authorId escolhido
};

// Uma cédula = um votante votando num confronto. `order` é a permutação dos
// índices de `answers` para exibição anônima — gerada uma vez (rng) ao montar a
// fila e persistida, garantindo ordem estável no reload (sem re-embaralhar).
type Ballot = { voterId: string; matchupIndex: number; order: number[] };

type Phase = 'answering' | 'voting' | 'round-result' | 'final-result';

type RoundState = {
  index: number;          // 0-based
  multiplier: number;     // index + 1
  isLastLash: boolean;    // última rodada (formato grupo)
  matchups: Matchup[];
  // progresso da fase answering: jogador atual escrevendo
  answerIndex: number;
  // progresso da fase voting: fila de cédulas + cursor
  ballots: Ballot[];
  voteCursor: number;
  phase: Phase;
};

type SessionState = {
  config: QuiplashConfig;
  scores: Record<string, number>;   // acumulado por jogador
  usedPromptIds: string[];          // prompts já usados na partida (evita repetição)
  round: RoundState;
};
```

> **Nota sobre `answering`:** a atribuição prompt→jogador é derivável do anel (modo Duelo) ou
> trivial (Grupo: todos no único prompt). Para a tela não recalcular, `logic.ts` expõe um helper
> `promptsForPlayer(round, playerId)` que devolve os `matchupIndex` que aquele jogador deve
> responder. A escrita grava `Answer` no(s) confronto(s) correspondente(s).

### Funções puras (`logic.ts`, `rng` injetável)

- `createSession(config, deck, rng)` — monta a sessão, `scores` zerado, `usedPromptIds` vazio, e a
  **rodada 1** já com confrontos montados e respostas vazias (fase `answering`, `answerIndex = 0`).
- `buildRound(config, roundIndex, deck, usedPromptIds, rng)` — decide formato
  (Duelo/Grupo/Last Lash), sorteia prompts **sem repetir** os de `usedPromptIds`, monta `matchups`
  (anel ou grupo) com `voterIds` corretos e `answers: []`. Retorna `{ round, usedPromptIds }`
  (atualizado). Reembaralha o deck só se os não-usados acabarem (borda).
- `promptsForPlayer(round, playerId)` — índices de confronto que o jogador responde nesta rodada.
- `submitAnswers(state, playerId, texts, rng)` — grava as respostas do jogador nos confrontos;
  avança `answerIndex`; quando todos responderam → monta `ballots` (todas as cédulas elegíveis,
  agrupadas por votante na ordem dos jogadores; cada cédula com `order` embaralhado via `rng`) e vai
  pra `voting` (`voteCursor = 0`).
- `castVote(state, authorId)` — registra o voto da cédula atual (`ballots[voteCursor]`) e avança o
  cursor; quando a fila acaba, **aplica a pontuação da rodada** (`scoreRound`) e vai pra
  `round-result`. (Pontuação aplicada exatamente uma vez, na transição — reload em `round-result`
  não re-pontua porque nenhuma ação reexecuta isso.)
- `scoreRound(state)` — pura: soma os pontos do confronto-a-confronto em `scores` (composta dentro
  de `castVote`; **não** é uma action separada do reducer).
- `matchupResults(round)` — pura, **só leitura**: devolve, por confronto, contagem de votos por
  autor + pontos + flag `quiplash`. Usada pela tela de resultado (não muta estado).
- `nextRound(state, deck, rng)` — se havia mais rodadas, `buildRound` da próxima (passando
  `usedPromptIds`); senão → `final-result`.
- `ranking(state)` — lista `{player, score}` ordenada desc (helper de tela).
- `playAgain(state, deck, rng)` — zera `scores` e `usedPromptIds`, rebuild rodada 1, mesma
  config/turma.

### Reducer / persistência / sessão

- `reducer.ts` — `QuiplashAction` (`SUBMIT_ANSWERS`, `CAST_VOTE`, `NEXT_ROUND`, `PLAY_AGAIN`,
  `LOAD`) delega pra `logic.ts`; o reducer injeta o deck (via `getQuiplashDeck`) onde preciso, igual
  o Insider injeta em `BEGIN_REVEAL`. (A pontuação não é uma action — acontece dentro de
  `CAST_VOTE` quando a fila de votos esvazia.)
- `persistence.ts` — `games-app:quiplash:current`; restaura fase exata + `answerIndex`/`voteCursor`
  + confrontos já preenchidos.
- `playerStore.ts` — `games-app:quiplash:players`; lista nomeada reusada entre partidas.
- `QuiplashSession.tsx` — `useReducer` + `useEffect` salva a cada mudança; roteia fase→tela com
  wrapper `key={fase}` + `animate-screen-in`.

---

## Casos de borda

- **Reload no meio** → restaura fase + `answerIndex`/`voteCursor` + respostas/votos já dados; **não
  re-sorteia** prompts nem re-embaralha (a ordem de cada cédula está persistida em `ballot.order`) →
  sem vazamento/troca. Reload em `round-result` não re-pontua (pontuação aplicada na transição).
- **Empate em votos** → pontuação é proporcional, então o empate divide os pontos naturalmente; a
  tela de resultado mostra as contagens (sem "vencedor único" forçado).
- **Confronto sem votos** (`total === 0`) → 0 pontos (guard de divisão por zero).
- **Bônus Quiplash!** só quando o autor leva **todos** os votos e havia adversário com 0 (não no
  caso degenerado de confronto com 1 resposta só).
- **N ímpar no Duelo** → o anel funciona igual (cada prompt entre vizinhos); todos respondem 2.
- **< 3 jogadores** → "Começar" bloqueado na config (Duelo precisa de ≥1 votante por confronto).
- **Respostas vazias** → a tela exige texto não-vazio nos campos antes de "Esconder e passar"
  (validação de UI; `logic` aceita o que vier, mas a tela impede vazio).
- **Deck acabar** (poucos prompts pra muitas rodadas/jogadores) → `buildRound` reembaralha o deck
  quando os prompts não-usados acabam (permite repetição só nesse caso de borda).

---

## Testes (Vitest sobre lógica pura)

- **Distribuição anel (Duelo):** N prompts; cada jogador em exatamente 2 confrontos; cada confronto
  com 2 autores distintos; `voterIds` = todos menos os 2 autores. Cobre N par e ímpar.
- **Distribuição grupo/Last Lash:** 1 confronto, N respostas, `voterIds` = todos; autor não vota na
  própria.
- **`buildRound`:** multiplicador = index+1; última rodada vira Last Lash (grupo) no modo Duelo;
  prompts não repetem dentro da partida (rng fixo, determinístico).
- **`submitAnswers`:** grava nos confrontos certos; avança jogador; ao fim monta `ballots` corretas
  (sem cédula do autor pro próprio confronto, agrupadas por votante, com `order` definido) e vai pra
  `voting`.
- **`castVote`:** registra voto, avança cursor; ao esvaziar a fila aplica pontuação e vai pra
  `round-result`; aplicar de novo (chamada extra) não soma 2×.
- **`scoreRound` / `matchupResults`:** proporção correta (votos fixos), bônus Quiplash! só no sweep,
  soma no acumulado; `matchupResults` não muta estado.
- **`nextRound` / fim:** avança rodadas (sem repetir prompt) e termina em `final-result` após a última.
- **`ballot.order`:** persistido/estável (mesma ordem após reload) e anônimo (não revela autor).
- **`playAgain`:** zera placar, mesma turma/config, rodada 1 fresca.
- **Componentes (leves):** fiação de `AnsweringScreen` (handoff + submit), `VotingScreen`
  (handoff por votante + voto), `RoundResultScreen` (selo Quiplash).

---

## Contrato de integração

- Expõe `<QuiplashApp onHome={() => void} />`.
- **NÃO** edita `src/App.tsx` nem `src/shell/**` — o wiring na home é do Chat A, após o módulo
  mergear e este chat sinalizar. (Registrar `View 'quiplash'` é passo do Chat A.)
- **Nota p/ Chat Backend:** `logic.ts`/`reducer.ts` puros; a projeção por-jogador (esconder
  respostas/votos alheios) é o que o multi-device vai usar — manter o estado serializável e a
  lógica sem React.

---

## Fora de escopo (v1)

- Multi-device / tempo real (Chat Backend; este é o jogo-âncora, mas a infra é deles).
- Editor de deck in-app (deck editável por arquivo JSON).
- Timer de resposta/votação.
- "Safety Quips" (respostas automáticas pra quem não respondeu), audience/plateia, write-ins do
  Last Lash, prompts gerados na hora.
- Integração na home (`App.tsx`) — fica com o Chat A; este chat só sinaliza quando pronto.
- Som e layout fino além dos tokens.
