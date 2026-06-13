# Prompts — migrar Chat A e Chat B para git worktree

Os chats compartilham o **mesmo diretório** (`/home/gabs/personal/games-app`). Num diretório git só existe **um** branch ativo e **uma** árvore de arquivos; quando dois chats trabalham nele, os branches se movem um sobre o outro (foi o que aconteceu: o `feat/visual-polish` pulou de commit sozinho durante a sessão do Chat C). A correção é cada chat ter seu **git worktree** (pasta + branch isolados, mesmo `.git`).

## Política de diretórios (alvo)

- **Diretório principal** (`/home/gabs/personal/games-app`) → fica no branch `main` (neutro). Ninguém "trabalha" nele.
- **Cada chat** trabalha no seu worktree em `.claude/worktrees/feat+<algo>`:
  - Chat A → `feat/visual-polish`
  - Chat B → `feat/impostor-engine`
  - Chat C → `feat/judging-engine` ✅ (já feito)
  - Chat D / futuros → ver `docs/prompt-chat-d-scaffold-worktrees.md`
- **Pré-requisito (uma vez):** `.claude/worktrees/` precisa estar no `.gitignore`. Se ainda não estiver:
  ```bash
  cd /home/gabs/personal/games-app
  grep -q '^.claude/worktrees/' .gitignore || printf '\n# git worktrees dos chats\n.claude/worktrees/\n' >> .gitignore
  git add .gitignore && git commit -m "chore: ignora .claude/worktrees/"
  ```

---

## Prompt para o Chat A (checar e, se preciso, migrar — sem perder trabalho)

```
Você é o Chat A do games-app (visual polish). Precisamos garantir que você está num
git worktree isolado — os chats compartilham o mesmo diretório e isso fazia os branches
se moverem uns sobre os outros. Seu trabalho commitado NÃO se perde nesse processo.

1. Detecte se já está isolado:
   GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
   GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
   [ "$GIT_DIR" = "$GIT_COMMON" ] && echo "NAO-isolado (dir principal)" || echo "JA-isolado (worktree)"
   git branch --show-current ; git worktree list

2. Se aparecer "JA-isolado": ótimo, nada a fazer. Me confirme o caminho e o branch.

3. Se aparecer "NAO-isolado" e você estiver em feat/visual-polish no dir principal,
   migre preservando tudo:
   a. Garanta que seu WIP está commitado no branch (só arquivos TRACKEADos — o -a NÃO
      adiciona arquivos não-trackeados de outros chats):
        git commit -am "wip: visual polish (pré-migração)"   # pule se já estiver limpo
   b. Devolva o dir principal pro main (neutro):
        git checkout main
   c. Crie um worktree que checa out o SEU branch existente (mantém todos os commits):
        git worktree add .claude/worktrees/feat+visual-polish feat/visual-polish
   d. Entre e prepare (worktree tem node_modules próprio):
        cd .claude/worktrees/feat+visual-polish && npm install && npm run test:run
   Daqui pra frente trabalhe SEMPRE nessa pasta. NÃO rode "git checkout <branch>" no dir principal.

Regras de escopo (inalteradas): você é dono de src/App.tsx, src/shell/**, src/index.css,
index.html, vite.config.ts, public/**, src/games/taboo/**. Não toque em src/games/impostor/**
(Chat B) nem src/games/judging/** (Chat C). Atualize só a sua seção em docs/status-chats.md.
```

> **Por que é seguro:** `git commit -am` só commita arquivos já trackeados — não engole o spec do Insider (untracked, do Chat B) nem outros arquivos soltos. `git worktree add <path> feat/visual-polish` reaproveita o branch existente, com todo o histórico.

---

## Prompt para o Chat B (montar o worktree do jeito certo)

```
Você é o Chat B do games-app (Engine Impostor/Assimetria — Insider). Antes de implementar,
migre para um git worktree isolado (os chats compartilham o mesmo diretório; trabalhar no
dir principal faz os branches colidirem).

1. Detecte isolamento (igual ao Chat A, passo 1). Se já estiver isolado, pule pro passo 4.

2. Se você tem o spec do Insider como arquivo NÃO-trackeado no dir principal
   (docs/superpowers/specs/2026-06-13-insider-game-design.md), guarde uma cópia fora do repo
   pra não perder:
     cp docs/superpowers/specs/2026-06-13-insider-game-design.md /tmp/insider-spec.md  2>/dev/null || true

3. Crie seu worktree a partir do main local (base estável; é onde está o status-chats.md):
     cd /home/gabs/personal/games-app
     git worktree add .claude/worktrees/feat+impostor-engine -b feat/impostor-engine main
     cd .claude/worktrees/feat+impostor-engine
     npm install && npm run test:run        # baseline esperado verde (33+)

4. Recupere o spec dentro do worktree e commite no SEU branch:
     mkdir -p docs/superpowers/specs
     cp /tmp/insider-spec.md docs/superpowers/specs/2026-06-13-insider-game-design.md  2>/dev/null || true
     git add docs/superpowers/specs/2026-06-13-insider-game-design.md
     git commit -m "docs: spec do Insider (Engine Impostor)"

Regras de escopo: fique 100% em src/games/impostor/** (jogos aninhados: src/games/impostor/insider/...).
Reuse o shell read-only (ActionButton, useCountdown). Exponha <InsiderApp onHome={() => void} />.
Não toque em App.tsx, src/shell, src/games/taboo, nem src/games/judging. Atualize só a sua seção
em docs/status-chats.md. Daqui pra frente trabalhe SEMPRE no worktree, nunca no dir principal.
```

---

## Ordem sugerida de execução

1. (uma vez) Garantir `.claude/worktrees/` no `.gitignore` no `main`.
2. **Chat A** primeiro: ao rodar `git checkout main`, o dir principal volta a `main` (neutro) — pré-condição pros demais.
3. **Chat B** depois: cria o worktree dele.
4. **Chat D** por último (andaime das engines futuras): `docs/prompt-chat-d-scaffold-worktrees.md`.

Ao final, o dir principal fica em `main` e cada chat no seu worktree — zero colisão de branch.
