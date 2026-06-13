# Design — Insider (games-app)

**Data:** 2026-06-13
**Status:** Aprovado (design); pendente plano de implementação
**Engine:** Impostor/Assimetria — **primeiro jogo: Insider**
**Pasta:** `src/games/impostor/insider/`

---

## Contexto

Insider é o primeiro jogo da engine "Impostor/Assimetria" (depois: Chameleon, Spyfall,
Deception). É um jogo de **dedução com informação assimétrica** + caça a um traidor escondido.

Modo de uso: **presencial, passa-e-joga** (um único celular passado de mão em mão) — mesmo
modelo do Taboo. Multi-device é fase futura, fora de escopo.

Decisões de produto (do brainstorming):
- **A** Passa-e-joga com revelação privada de papel.
- **A** Palavra secreta vem de um **deck** do app (conteúdo customizável).
- **C+** Caça ao Insider: **voto coletivo único** (um toque), com botão extra **"Ninguém"**.
- **B** Jogadores **nomeados e persistidos** (localStorage), reusados entre partidas.
- Modo do Mestre **configurável**: **Rodízio** (sem repetir até todos terem sido) **ou** **Grupo escolhe**.
- Mestre pode **reespiar a palavra** na fase de adivinhação via **botão protegido** ("segure pra ver").
- **Sem placar acumulado** entre rodadas (Insider é casual, rodada a rodada).

---

## Regras (como o app as encena)

**Papéis** (alvo: 5 jogadores; mín. 4):
- **Mestre** (1) — papel *público* (todos sabem quem é; é quem responde sim/não). Vê a palavra.
- **Insider** (1) — papel *secreto*, sorteado **entre os não-Mestres**. Vê a palavra, finge ser ingênuo.
- **Ingênuos** (demais) — não veem a palavra.

**Fases:**

1. **Config** — confirma lista de jogadores (persistida), escolhe deck, duração da adivinhação
   (default 5 min; presets 3/5/7; ou digitar), e modo do Mestre (Rodízio / Grupo escolhe).
   "Começar" bloqueado com < 4 jogadores.
2. **`master-select`** *(só no modo "Grupo escolhe")* — grupo toca em quem será o Mestre.
3. **`master-announce`** — tela pública: "*[nome]* é o Mestre desta rodada."
4. **`role-reveal`** (passa-celular) — em ordem, "Passe para *[nome]* → toque pra ver":
   - Mestre: *"Você é o MESTRE. Palavra: GIRAFA. Memorize."*
   - Insider: *"Você é o INSIDER. Palavra: GIRAFA. Aja como ingênuo."*
   - Ingênuo: *"Você é INGÊNUO."*
   - Cada um toca "Esconder e passar". A palavra **não reaparece** nesta tela.
5. **`guessing`** — timer no centro da mesa. Perguntas sim/não são **verbais** (app não medeia).
   Ações: **"Adivinharam!"** (Mestre confirma o acerto) e **"Segure pra ver a palavra"**
   (botão protegido — só o Mestre, que pega o celular). Tempo zerar → caminho automático.
6. **`insider-hunt`** *(só se adivinharam a tempo)* — lista de jogadores + botão **"Ninguém"**;
   o grupo discute e toca **uma vez** (consenso verbal antes do toque).
7. **`result`** — revela quem era o Insider e o desfecho. "Jogar de novo" (nova rodada, mesma
   turma, carrega rodízio) ou "Início".

**Condições de vitória (`Outcome`):**
- **Tempo esgotou sem adivinhar** → `not-guessed` (todos perdem, sem caça).
- **Adivinhou + acusou o Insider** → `insider-caught` (Mestre + Ingênuos vencem).
- **Adivinhou + acusou outro / acusou Mestre / "Ninguém"** → `insider-escaped` (Insider vence).

---

## Arquitetura

**Stack:** já existente — Vite + React + TS + Tailwind v4 + Vitest. Mesma separação do Taboo:
tipos puros → lógica pura (`rng` injetável) → reducer → persistence → entry → session → telas.

**Reuso do shell (read-only, sem editar — dono é o Chat A):**
- `src/shell/ActionButton.tsx` — botões de ação grandes.
- `src/shell/useCountdown.ts` — timer baseado em timestamp.
- **Não** usa `Scoreboard` (sem placar contínuo).

### Estrutura de pastas

```
src/games/impostor/
  insider/
    types.ts            — tipos do domínio (sem React)
    logic.ts            — funções puras, rng injetável
    reducer.ts          — InsiderAction + reducer → delega pra logic
    persistence.ts      — save/load/clear  (games-app:insider:current)
    playerStore.ts      — load/save lista de jogadores (games-app:insider:players)
    InsiderApp.tsx      — entry { onHome }, carrega save → Config ou Session
    InsiderSession.tsx  — useReducer + useEffect salva
    screens/
      ConfigScreen.tsx
      MasterSelectScreen.tsx
      MasterAnnounceScreen.tsx
      RoleRevealScreen.tsx
      GuessingScreen.tsx
      InsiderHuntScreen.tsx
      ResultScreen.tsx
    data/decks/insider-padrao.json   — deck PT inicial (~80 palavras)
```

`impostor/shared/` (revelação passa-celular, lista nomeada, papéis) **não** é criado agora —
é extraído quando o Chameleon (2º jogo) chegar e o que é compartilhado ficar evidente (YAGNI).

### Modelo de dados

```ts
type WordCard = { id: string; word: string };
type WordDeck = { id: string; name: string; cards: WordCard[] };

type Player = { id: string; name: string };
type Role = 'master' | 'insider' | 'commoner';

type MasterMode = 'rotate' | 'choose';
type Accusation = { kind: 'player'; id: string } | { kind: 'nobody' };

type InsiderConfig = {
  deckId: string;
  guessSeconds: number;      // default 300; presets 180/300/420; ou custom
  players: Player[];         // >= 4
  masterMode: MasterMode;
};

type Phase =
  | 'master-select'   // só no modo 'choose'
  | 'master-announce'
  | 'role-reveal'
  | 'guessing'
  | 'insider-hunt'
  | 'result';

type Outcome = 'not-guessed' | 'insider-caught' | 'insider-escaped';

type RoundState = {
  word: string;
  masterId: string;
  insiderId: string;
  revealIndex: number;       // qual jogador está revelando
  endsAt: number | null;     // timestamp do fim da adivinhação
  accusation: Accusation | null;
  outcome: Outcome | null;
  phase: Phase;
};

type SessionState = {
  config: InsiderConfig;
  masterRotation: string[];  // ids que já foram Mestre no ciclo (rodízio); reseta ao fechar
  round: RoundState;
};
```

### Funções puras (`logic.ts`, `rng` injetável)

- `createSession(config, deck, rng)` — monta sessão; no modo `rotate` já escolhe Mestre via
  `nextMaster` e vai pra `master-announce`; no modo `choose` vai pra `master-select`.
- `nextMaster(rotation, players, rng)` — escolhe próximo Mestre **sem repetir** até todos terem
  sido; ao completar o ciclo, reseta a rotação e recomeça.
- `selectMaster(state, playerId)` — modo `choose`: fixa Mestre e dá roles → `master-announce`.
- `dealRoles(state, deck, rng)` — sorteia palavra e Insider (entre não-Mestres) → `role-reveal`.
  (No `rotate` isso já acontece em `createSession`/`playAgain`; no `choose`, após `selectMaster`.)
- `advanceReveal(state)` — `revealIndex++`; quando todos revelaram → `guessing` (sem `endsAt` até start).
- `startGuessing(state, now)` — define `endsAt = now + guessSeconds*1000`.
- `markGuessed(state)` → `insider-hunt`.
- `timeUp(state)` → `outcome='not-guessed'`, `result`.
- `accuse(state, accusation)` — compara com `insiderId`: `player`+igual → `insider-caught`;
  senão (player diferente, ou `nobody`) → `insider-escaped`; fase `result`.
- `playAgain(state, deck, rng)` — nova `RoundState` carregando `masterRotation`; escolhe próximo
  Mestre (rotate) ou volta a `master-select` (choose).
- `roleOf(state, playerId): Role` — deriva papel pra tela de revelação.

### Reducer / persistência / sessão

- `reducer.ts` — `InsiderAction` (`SELECT_MASTER`, `ADVANCE_REVEAL`, `START_GUESSING`,
  `MARK_GUESSED`, `TIME_UP`, `ACCUSE`, `PLAY_AGAIN`, `LOAD`) delega pra `logic.ts`.
- `persistence.ts` — `games-app:insider:current`; restaura fase exata + `endsAt` (timestamp).
- `playerStore.ts` — `games-app:insider:players`; lista nomeada reusada entre partidas.
- `InsiderSession.tsx` — `useReducer` + `useEffect` salva a cada mudança.

---

## Casos de borda

- **Acusar o Mestre** → `insiderId !== masterId` ⇒ `insider-escaped`. Coerente.
- **"Ninguém"** → `insider-escaped`.
- **Reload no meio** → restaura fase + `endsAt` por timestamp (timer não desvia com tela travada).
- **Reload em `role-reveal`** → restaura `revealIndex` salvo; **não re-sorteia** papéis (evita troca/vazamento).
- **< 4 jogadores** → "Começar" bloqueado na config.
- **Rodízio** → reseta sozinho ao todos terem sido Mestre; sobrevive ao "Jogar de novo".
- **Deck** → 1 palavra por rodada, sorteada do deck inteiro; sem pilha de compra (≠ Taboo).

---

## Testes (Vitest sobre lógica pura)

- Sorteio de papéis: Insider nunca é o Mestre; distribuição cobre todos os não-Mestres (rng fixo).
- `nextMaster`: não repete até o ciclo fechar; reseta corretamente; determinístico com rng fixo.
- Transições de fase: select→announce→reveal→guessing→hunt→result (e o atalho `timeUp`).
- `advanceReveal`: termina exatamente após o último jogador.
- `accuse`: `insider-caught` (acerto), `insider-escaped` (erro, Mestre, "Ninguém").
- `timeUp`: `not-guessed` e pula a caça.
- `playAgain`: carrega rotação, gera nova palavra/Insider, respeita o modo do Mestre.
- Testes de componente leves: fiação das ações nas telas-chave (reveal, guessing, hunt).

---

## Fora de escopo (v1)

- Multi-device / tempo real.
- Editor de deck in-app (deck editável por arquivo).
- Placar de série acumulado.
- 2+ Insiders; modo sem Mestre; papéis avançados.
- `impostor/shared/` (extração só quando o 2º jogo da engine chegar).
- Integração na home (`App.tsx`) — fica com o Chat A após o visual polish; este chat só sinaliza
  quando o módulo estiver pronto.
- Som, animações e layout fino (segue a direção visual do Chat A na integração).
