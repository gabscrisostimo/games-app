# Status dos chats — games-app

Documento de sincronização entre sessões paralelas do Claude. Atualizado ao fim de marcos relevantes.

**Última atualização:** 2026-06-13

## Repo / produção
- GitHub: `github.com/gabscrisostimo/games-app`
- Produção: `https://games-app-bice.vercel.app` (Vercel, deploy automático no push)
- Stack: Vite + React + TypeScript + Tailwind v4 + Vitest + vite-plugin-pwa

## Chat A — Visual polish (em andamento)

**O que já está feito (commitado no `main`):**
- Spec: `docs/superpowers/specs/2026-06-13-visual-polish-design.md`
- Plano: `docs/superpowers/plans/2026-06-13-visual-polish.md`
- Direção visual definida: **Fusão** (fundo azul-meia-noite `#0c1220`, fonte Inter, acentos pastel)
- Mockups do brainstorming: `.superpowers/brainstorm/` (gitignored, local)

**O que vai implementar (ainda não mexido no código):**
- Tokens de design `@theme` em `src/index.css` (cores + fonte + animações)
- Restyle de: `src/App.tsx`, `src/shell/ActionButton.tsx`, `src/shell/Scoreboard.tsx`, todas as 5 telas do Taboo, `src/games/taboo/TabooApp.tsx`, `src/games/taboo/TabooSession.tsx`
- `index.html` (fonte Inter), `vite.config.ts` (cores do manifest)
- Ícones PWA reais: `scripts/generate-icons.mjs` + `public/pwa-192.png` / `public/pwa-512.png`
- Novos testes em `src/games/taboo/screens/InTurnScreen.test.tsx`

**Arquivos que o Chat A é dono — NÃO TOCAR no outro chat:**
`src/App.tsx`, `src/shell/**`, `src/index.css`, `index.html`, `vite.config.ts`, `public/**`, `src/games/taboo/**`

## Chat B — Engine Impostor/Assimetria (em andamento)

- Roadmap de engines: `docs/ordem-de-construcao.md`
- Engine: **Impostor/Assimetria** (Insider → Chameleon → Spyfall → Deception)
- **Território reivindicado: `src/games/impostor/**`** (pasta aninhada por engine)
- Primeiro jogo: **Insider** → `src/games/impostor/insider/`
  - Spec aprovado: `docs/superpowers/specs/2026-06-13-insider-game-design.md`
  - Plano TDD: pendente (próximo passo: writing-plans)
  - Implementação: ainda não começou
- Reusa **read-only** do shell: `ActionButton`, `useCountdown` (importa, não edita)
- Contrato de integração: expor `<InsiderApp onHome={() => void} />`
- **NÃO TOCA** em `src/App.tsx` nem `src/shell/` até o Chat A fechar (integração na home depois)

## Chat C — Próxima engine (livre)

- Pegar a **próxima engine livre** do roadmap (`docs/ordem-de-construcao.md`) — Impostor já é do Chat B.
  Sugestão: **Engine 2 — Julgamento/Cartas** (Snake Oil → CAH → Funemployed) ou **Engine 3 — Prompt→Voto**.
- Escolher um território de pasta **próprio e distinto**: `src/games/<engine>/**` (ex.: `src/games/judging/`).
- **NÃO TOCAR** em: `src/games/impostor/**` (Chat B), nos arquivos do Chat A, nem em `src/games/taboo/**`.
- Mesmo contrato: expor `<XyzApp onHome={() => void} />`, sinalizar quando pronto.

## Regras de ouro (evitar conflito)
1. Cada chat fica na sua pasta. Fronteiras: `src/games/taboo/**` + shell/home = Chat A; `src/games/impostor/**` = Chat B; `src/games/<outra-engine>/**` = Chat C.
2. `src/App.tsx` e `src/shell/` têm dono único = Chat A enquanto o visual polish não fechar (outros chats só **importam** do shell, nunca editam).
3. Antes de editar qualquer arquivo fora da sua pasta, checar este doc.
4. `src/games/taboo/logic.ts|types.ts|reducer.ts|persistence.ts` e `src/data/` são estáveis — ninguém toca sem motivo forte.
