# Prompt — Chat D: pré-criar worktrees + estrutura das engines futuras

**Objetivo:** deixar o "andaime" pronto para as engines ainda não iniciadas — um **git worktree** isolado (pasta + branch) por engine, mais o esqueleto de pastas e a reivindicação de território no `status-chats.md`. Assim, quando um chat futuro for implementar uma engine, o setup já está feito.

> Este doc é a **instrução**. Quem executa é o **Chat D** (cole o prompt do fim do arquivo num chat novo).

---

## Por que worktrees (contexto que o Chat D precisa entender)

Os chats compartilham o **mesmo diretório de repositório** (`/home/gabs/personal/games-app`). Num diretório git só existe **um** branch ativo e **uma** árvore de arquivos — se um chat troca de branch, puxa o tapete dos outros. A solução é **git worktree**: o mesmo `.git`, mas cada engine ganha sua própria pasta + branch isolados.

**Gotchas (todos já aprendidos na marra pelo Chat C):**
- **Base = `main` local**, não o branch de outro chat. O `feat/visual-polish` se move enquanto o Chat A trabalha; basear nele contamina. (E `origin/main` está atrás do `main` local e nem tem o `status-chats.md`.)
- **`.claude/worktrees/` precisa estar no `.gitignore`** (hoje não está) — senão o conteúdo dos worktrees pode ser trackeado. Passo 0 abaixo resolve.
- **`status-chats.md` é editado pelos 3+ chats.** Cada um mexe **só na sua seção**; no merge pode pedir resolução trivial. Versão canônica vive no `main`.
- **`node_modules` não é compartilhado** entre worktrees — cada um precisa de `npm install`.

---

## Mapa das engines (de `docs/ordem-de-construcao.md`)

| Engine | Status | Branch | Pasta-território | 1º jogo | Contrato (export) |
|---|---|---|---|---|---|
| 0 — Dar pista/palavra | ✅ produção | (`main`) | `src/games/taboo/` | Taboo | `<TabooApp onHome>` |
| 1 — Impostor/Assimetria | 🔨 Chat B | `feat/impostor-engine` | `src/games/impostor/` | Insider | `<InsiderApp onHome>` |
| 2 — Julgamento/Cartas | 🔨 Chat C | `feat/judging-engine` | `src/games/judging/` (+ `src/data/judging/`) | Snake Oil | `<SnakeOilApp onHome>` |
| 3 — Prompt→Resposta→Voto | ⬜ livre | `feat/promptvote-engine` | `src/games/promptvote/` (+ `src/data/promptvote/`) | Quiplash | `<QuiplashApp onHome>` |
| 4 — Papéis Ocultos + Noite | ⬜ livre | `feat/hidden-roles-engine` | `src/games/hiddenroles/` | One Night Werewolf | `<OneNightApp onHome>` |
| 5 — Trivia | ⬜ livre | `feat/trivia-engine` | `src/games/trivia/` (+ `src/data/trivia/`) | Wits & Wagers | `<WitsWagersApp onHome>` |
| 6 — Palavras/Letras | ⬜ livre | `feat/wordplay-engine` | `src/games/wordplay/` (+ `src/data/wordplay/`) | Stop/Adedonha | `<StopApp onHome>` |
| 7 — Drawing | ⬜ defer | `feat/drawing-engine` | `src/games/drawing/` | A Fake Artist Goes to NY | `<FakeArtistApp onHome>` |

**Engines que o Chat D deve preparar:** 3, 4, 5, 6 (e opcionalmente 7). As 0/1/2 já estão tomadas — **não tocar**.

## Convenções (todas herdadas do Taboo)
- Branch: `feat/<engine>-engine`. Pasta: `src/games/<engine>/`; decks em `src/data/<engine>/` se a engine precisar de conteúdo.
- Jogos aninhados por engine: `src/games/<engine>/<jogo>/`.
- Contrato de integração: cada jogo expõe `<XyzApp onHome={() => void} />`. A ligação na home (`src/App.tsx`) é do Chat A.
- Estrutura por jogo: `types.ts` + `logic.ts` (puro, `rng` injetável) + `reducer.ts` + `persistence.ts` + `screens/`. TDD com Vitest.
- Reusa **read-only** do shell (`ActionButton`, `useCountdown`) — importa, nunca edita.

---

## Passo 0 — uma vez só: ignorar a pasta de worktrees

No diretório principal, no `main` (ou via um worktree próprio), adicionar ao `.gitignore` e commitar:

```bash
cd /home/gabs/personal/games-app
grep -q '^.claude/worktrees/' .gitignore || printf '\n# git worktrees dos chats\n.claude/worktrees/\n' >> .gitignore
git add .gitignore && git commit -m "chore: ignora .claude/worktrees/ (worktrees por chat)"
```

## Receita por engine (repetir para cada engine livre)

Usar `git worktree add` direto (não a tool `EnterWorktree`): aqui o objetivo é **criar vários** andaimes sem entrar/trabalhar em cada um — `git worktree add` cria sem trocar o contexto da sessão e dá nomes de branch limpos (`feat/<engine>-engine`).

```bash
cd /home/gabs/personal/games-app
ENGINE=promptvote                       # ex.: promptvote | hiddenroles | trivia | wordplay | drawing
GAME=quiplash                           # 1º jogo da engine (ver tabela)
BRANCH=feat/${ENGINE}-engine
WT=.claude/worktrees/${BRANCH//\//+}    # vira .claude/worktrees/feat+promptvote-engine

# 1. cria worktree + branch a partir do main local (base estável)
git worktree add "$WT" -b "$BRANCH" main

# 2. esqueleto de pastas (só placeholders; implementação fica pro chat da engine)
mkdir -p "$WT/src/games/$ENGINE/$GAME/screens" "$WT/src/data/$ENGINE"
touch "$WT/src/games/$ENGINE/$GAME/screens/.gitkeep" "$WT/src/data/$ENGINE/.gitkeep"

# 3. deps + baseline (cada worktree tem node_modules próprio)
( cd "$WT" && npm install && npm run test:run )   # esperado: baseline verde (33+)
```

Depois, **dentro do worktree** (`cd "$WT"`):
- Editar **só a seção da engine** em `docs/status-chats.md` (criar "Chat ? — Engine N (não iniciada)" com território, 1º jogo e contrato da tabela; marcar "andaime pronto, implementação pendente").
- Commitar: `git add src/games/$ENGINE src/data/$ENGINE docs/status-chats.md && git commit -m "scaffold: andaime da engine $ENGINE (worktree + esqueleto)"`.

> **Não implemente lógica/telas** no Chat D — só o andaime. Cada engine é implementada depois pelo seu próprio chat, que entra no worktree já pronto via `EnterWorktree` (`path: .claude/worktrees/feat+<engine>-engine`) ou `cd` direto.

## Recomendação (tradeoff de staleness)

Branches ociosos baseados em `main` **envelhecem** conforme o `main` recebe merges (visual polish, etc.). Pré-criar 5 worktrees que ficarão semanas parados = 5 branches defasados na hora de usar.

- **Pragmático (recomendado):** pré-criar agora só as **1–2 engines que você vai começar em seguida** (provavelmente 3 e 4) e deixar a receita acima para criar as demais sob demanda (leva ~2 min cada).
- **Tudo de uma vez (o que você pediu):** rodar a receita para 3, 4, 5, 6 (e 7). Funciona, mas antes de implementar cada uma, rebasear no `main` atual: `git rebase main` dentro do worktree.

---

## Prompt pronto para colar no Chat D

```
Você é o Chat D do games-app (PWA de party games, projeto pessoal do Gabs — nada de Alaska).

Leia primeiro: docs/status-chats.md, docs/ordem-de-construcao.md e
docs/prompt-chat-d-scaffold-worktrees.md.

Seu objetivo NÃO é implementar nenhuma engine. É preparar o andaime das engines
futuras (3 Prompt→Voto, 4 Papéis Ocultos, 5 Trivia, 6 Palavras; 7 Drawing opcional):
para cada uma, criar um git worktree isolado + branch + esqueleto de pastas +
reivindicar a seção no status-chats.md, exatamente como descrito em
prompt-chat-d-scaffold-worktrees.md.

Regras:
- Compartilhamos o mesmo diretório → use git worktree (nunca git checkout no dir principal).
- Faça o Passo 0 (gitignore .claude/worktrees/) antes de criar worktrees.
- Base de todo branch = main local. Branch = feat/<engine>-engine.
- NÃO toque em src/games/taboo, src/games/impostor, src/games/judging nem nos
  arquivos do Chat A (App.tsx, src/shell, index.css, index.html, vite.config.ts, public).
- Só andaime: pastas com .gitkeep + claim no status-chats.md. Sem lógica, sem telas.
- Comece confirmando comigo QUANTAS engines pré-criar (recomendação: só as 3 e 4 agora).
  Aguarde minha resposta antes de criar.
```
