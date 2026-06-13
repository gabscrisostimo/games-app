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

## Chat B — Nova engine (em andamento)

- Roadmap de engines: `docs/ordem-de-construcao.md`
- Próxima engine: **Impostor/Assimetria** (Insider → Chameleon → Spyfall → Deception)
- Deve ficar 100% contido em `src/games/<engine>/`
- Contrato de integração: expor `<XyzApp onHome={() => void} />`
- **NÃO TOCAR** em `src/App.tsx` nem `src/shell/` até o Chat A fechar (a integração na home fica pra depois)

## Regras de ouro (evitar conflito)
1. Cada chat fica na sua pasta. Fronteira: `src/games/taboo/**` + shell/home = Chat A; `src/games/<nova-engine>/**` = Chat B.
2. `src/App.tsx` e `src/shell/` têm dono único = Chat A enquanto o visual polish não fechar.
3. Antes de editar qualquer arquivo fora da sua pasta, checar este doc.
4. `src/games/taboo/logic.ts|types.ts|reducer.ts|persistence.ts` e `src/data/` são estáveis — ninguém toca sem motivo forte.
