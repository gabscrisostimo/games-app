# Prompt — iniciar um chat de nova engine (games-app)

Reutilizável: serve pra qualquer engine **livre**. Preencha a linha `ENGINE` no topo e cole num chat novo.
Engines livres hoje: `promptvote`, `hidden-roles`, `trivia`, `wordplay`, `drawing`.
Worktrees já existem em `.claude/worktrees/feat+<engine>-engine` (não crie worktree novo).

> 📌 **`promptvote` (Quiplash): construir pass-and-play por enquanto.** A descrição original no roadmap era multi-device (cada celular responde → servidor), mas a decisão é fazer single-device agora — passando o celular de mão em mão. O brainstorm dessa engine PRECISA tratar o **handoff de privacidade** (tela "passe pro próximo jogador" que esconde a resposta/voto anterior, mesmo padrão do Insider) nas duas fases: responder ao prompt e votar. O modo multi-device (com backend/realtime) fica como **upgrade futuro**, não é pré-requisito. Todas as engines livres cabem no modelo single-device atual.

---

## PROMPT (preencher e colar)

```
ENGINE QUE VOCÊ VAI CONSTRUIR: <hidden-roles>   ← (branch feat/<engine>-engine; pasta pode diferir, você confere)
PRIMEIRO JOGO DESSA ENGINE: <One Night Werewolf>  ← (ver docs/ordem-de-construcao.md)

Você é um chat dedicado a UMA engine do games-app (PWA de party games, pass-and-play num único device). Leia os 3 docs de coordenação ANTES de agir: docs/status-chats.md, docs/ordem-de-construcao.md e docs/visual-tokens.md.

REGRA DE OURO: você trabalha SÓ na sua engine, num git worktree isolado. Não toca em arquivos de outros chats nem no shell/home.

## 1. Entre na sua worktree (já existe — NÃO crie outra)
- Sua worktree: .claude/worktrees/feat+<engine>-engine (branch feat/<engine>-engine)
- Entre nela (EnterWorktree com o path, ou trabalhe a partir dela). Confirme:
  pwd                      → deve terminar em .claude/worktrees/feat+<engine>-engine
  git branch --show-current → feat/<engine>-engine

## 2. Traga o main atualizado (OBRIGATÓRIO antes de codar)
O scaffold foi criado antes do visual polish. Você PRECISA do main atual pra ter os design tokens e o shell restyled:
  git merge main           # traz tokens (@theme), shell, docs/visual-tokens.md
  npm install              # o main adicionou deps (ex.: sharp) — atualize
  npm run test:run         # baseline deve ficar verde
- Conflito trivial provável em docs/status-chats.md, .gitignore e .claude/settings.local.json → resolva mantendo sua seção + união das permissões. Código não deve conflitar.

## 3. Descubra sua pasta (não chute)
O nome da pasta pode diferir do branch (ex.: branch hidden-roles → pasta src/games/hiddenroles/). Verifique:
  git ls-tree -r --name-only HEAD -- src/games src/data | grep -i <engine>
Use a pasta do scaffold: src/games/<pasta-engine>/<jogo>/ e os dados em src/data/<pasta-engine>/.

## 4. Construa o PRIMEIRO JOGO (a engine emerge dele)
A filosofia do roadmap é "engine, não jogo isolado" — mas na prática se constrói o primeiro jogo concreto, e o núcleo reutilizável (estado + telas + lógica) vira a engine. Os próximos jogos da mesma engine reusam.
Siga o fluxo Superpowers, nesta ordem:
  a. superpowers:brainstorming — alinhar regras, estado, telas, fim de jogo, modo de privacidade (pass-the-phone)
  b. superpowers:writing-plans — plano TDD task-a-task
  c. superpowers:subagent-driven-development — executar

## 5. Arquitetura (siga o padrão do Taboo/Insider)
- Lógica pura em logic.ts (sem React, rng injetável), useReducer + telas finas, persistência em localStorage, timer por timestamp (use o shell useCountdown).
- ESTILO: use SÓ os tokens de docs/visual-tokens.md (bg-bg, bg-surface, text-ink, text-accent, animate-screen-in…). NUNCA cor crua (bg-slate-800, text-white, amber-500).
- Reuse read-only do shell: ActionButton e useCountdown (importa, não edita). Scoreboard NÃO é genérico (acoplado ao Taboo) — se precisar de placar, faça o seu na sua pasta.

## 6. Contrato de integração (igual às outras engines)
- Exponha um componente raiz: <XyzApp onHome={() => void} /> (ex.: <OneNightApp onHome={...} />).
- NÃO edite src/App.tsx nem src/shell/. O wiring na home é do Chat A (visual polish), feito quando você mergear e avisar.

## 7. Escopo — NÃO TOCAR
- src/App.tsx, src/shell/**, src/index.css, index.html, vite.config.ts, public/**, src/games/taboo/** → Chat A
- src/games/impostor/** → Chat B
- src/games/judging/** + src/data/judging/** → Chat C
- pastas das outras engines → outros chats
- src/games/taboo/logic|types|reducer|persistence e src/data/ existentes → estáveis, não mexer

## 8. Ao terminar marcos
- Atualize SÓ a sua seção em docs/status-chats.md (o que ficou pronto, contrato exposto, testes/build).
- Tudo verde (testes + build) antes de avisar o Gabs pra coordenar o merge no main.
```

---

## Lembrete de modelo/effort (pro chat novo)
- Brainstorm + design de engine nova: Opus/high é adequado (decisão de arquitetura de estado).
- Execução do plano TDD (mecânica): Sonnet/medium dá conta.
