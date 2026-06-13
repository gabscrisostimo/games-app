# Prompt — iniciar o chat de Backend / Multiplayer (games-app)

Cole num chat novo. Esse chat constrói a camada de **multiplayer (multi-device)** — jogar cada um no seu celular, além do pass-and-play. É **infraestrutura genérica**, não um backend por jogo.

Caminho deste doc: `/home/gabs/personal/games-app/docs/prompt-backend-multiplayer.md`

---

## PROMPT (colar)

```
Você é o chat dedicado ao BACKEND / MULTIPLAYER do games-app (PWA de party games). Hoje os jogos são pass-and-play (tudo num celular). Seu objetivo é permitir jogar MULTI-DEVICE (cada jogador no seu celular). Leia ANTES de agir: docs/status-chats.md (sua seção é "Chat Backend — Multiplayer / Netcode"), docs/ordem-de-construcao.md e docs/visual-tokens.md.

PRINCÍPIO CENTRAL: camada GENÉRICA reutilizável, extraída de UM jogo real — NÃO um backend do zero por jogo, e NÃO um framework especulativo no vácuo. A abstração certa aparece depois de 2 usos concretos (regra do três).

## 1. Crie sua worktree isolada (a partir do main ATUAL)
O main já tem o visual polish e os docs. Crie seu worktree próprio:
  pwd                                  # confirme: /home/gabs/personal/games-app
  git worktree add .claude/worktrees/feat+multiplayer -b feat/multiplayer main
  cd .claude/worktrees/feat+multiplayer
  npm install
  npm run test:run                     # baseline verde (deve ter os testes atuais)
Daqui pra frente trabalhe SEMPRE nessa pasta.

## 2. NÃO comece codando — comece pelo brainstorm (Superpowers)
Use superpowers:brainstorming primeiro. A PRIMEIRA decisão, que domina todo o resto, é o TRANSPORTE/HOSTING. Pesquise e proponha (com trade-offs) entre:
  - Serviço realtime gerenciado: PartyKit (feito pra party games no edge), Supabase Realtime, Ably, Liveblocks — sem socket próprio, já dá presença/reconexão.
  - Socket server próprio (Node + ws) — mais controle, mas você hospeda (o Vercel não segura WebSocket long-lived; precisaria host à parte).
  - Host-as-server (um celular é a autoridade, outros via relay/WebRTC) — sem backend dedicado, porém frágil (host cai = jogo cai).
  Inclinação registrada pelo Gabs: opção gerenciada (ex.: PartyKit). Mas decida no brainstorm, com argumento.
Outros pontos do brainstorm: modelo de sala/lobby (criar → código → entrar com apelido), presença/reconexão/queda, autoridade de estado, projeção de estado por-jogador (o que cada um vê), roteamento privado vs broadcast.

## 3. Aproveite a arquitetura que já existe
Os jogos já separam LÓGICA PURA (logic.ts, reducer `(state, action) => state`) da UI. Use isso:
  - A autoridade (servidor/host) roda O MESMO reducer do jogo → faz broadcast.
  - Cada celular recebe uma PROJEÇÃO do estado (só o que aquele jogador pode ver).
  - Pass-and-play e multi-device compartilham o core; multiplayer adiciona (a) transporte e (b) projeção por-jogador.
O trabalho por-jogo vira um ADAPTADOR FINO (definir projeção por jogador + ações válidas por fase), não um backend novo.

## 4. Escopo e sequência (não over-engineer)
- Construa AGORA só a parte genuinamente compartilhada e bem-entendida: lobby + transporte + presença (genérico).
- Projete a sincronização de estado + projeção JUNTO com um jogo real de validação: **Quiplash** (engine promptvote). Se o Quiplash ainda não existir, faça um jogo-demo mínimo pra validar o lobby+sync, e integre o Quiplash de verdade quando ele estiver pronto.
- GENERALIZE só depois de um 2º jogo (ex.: Spyfall, que exige papel privado por jogador) provar a abstração.
- Fluxo: superpowers:brainstorming → superpowers:writing-plans → superpowers:subagent-driven-development.

## 5. Território e fronteiras (coordenação)
- VOCÊ é dono de `src/net/**` (pasta nova). Se precisar de algo fora dela (ex.: um ponto de integração no App.tsx ou um hook de cliente numa engine), NÃO edite direto — registre no status-chats.md e coordene (App.tsx/shell = Chat A; pastas de jogo = chats das engines).
- Você CONSOME os reducers/logic.ts dos jogos (importa, não reescreve a lógica deles).
- NÃO edita: src/App.tsx, src/shell/**, src/index.css, src/games/**/* (pastas de jogo), src/games/taboo/**.
- Estilo (se tiver UI de lobby): use os tokens de docs/visual-tokens.md, nunca cor crua.

## 6. Ao terminar marcos
- Atualize SÓ a sua seção ("Chat Backend") em docs/status-chats.md: decisão de transporte, o que a PoC cobre, contrato de integração que as engines vão usar.
- Testes + build verdes antes de avisar o Gabs pra coordenar merge.

Responda primeiro com seu PLANO de brainstorm (não comece a codar): qual transporte você recomenda e por quê, e como a PoC (lobby + 1 jogo de validação) vai provar a abstração.
```

---

## Lembrete de modelo/effort
- Decisão de transporte + design da camada de sync: **Opus/high (ou xhigh)** — é arquitetura de estado distribuído, núcleo do projeto.
- Execução mecânica do plano depois: Sonnet/medium.
