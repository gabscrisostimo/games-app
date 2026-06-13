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

## Chat B — Engine Impostor/Assimetria (CONCLUÍDO)

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

## Chat C — Engine Julgamento/Cartas (em andamento)

- Roadmap de engines: `docs/ordem-de-construcao.md` (Engine 2)
- Engine: **Julgamento / Mão de Cartas** (Snake Oil → Cards Against Humanity → Funemployed → ...)
- **Território reivindicado: `src/games/judging/**`** + decks em `src/data/judging/**`
- Primeiro jogo: **Snake Oil** → `src/games/judging/snakeoil/`
  - Spec: `docs/superpowers/specs/2026-06-13-snakeoil-game-design.md` (em escrita)
  - Plano TDD: pendente (próximo passo: writing-plans)
  - Implementação: ainda não começou
  - Modelo: pass-and-play, mão privada (passa o celular), cliente com carta de persona, fim configurável (rotações/pontos)
- Reusa **read-only** do shell: `ActionButton`, `useCountdown` (importa, não edita)
- Contrato de integração: expor `<SnakeOilApp onHome={() => void} />`
- **NÃO TOCA** em `src/games/impostor/**` (Chat B), nos arquivos do Chat A, nem em `src/games/taboo/**`

## Regras de ouro (evitar conflito)
1. Cada chat fica na sua pasta. Fronteiras: `src/games/taboo/**` + shell/home = Chat A; `src/games/impostor/**` = Chat B; `src/games/judging/**` (+ `src/data/judging/**`) = Chat C.
2. `src/App.tsx` e `src/shell/` têm dono único = Chat A enquanto o visual polish não fechar (outros chats só **importam** do shell, nunca editam).
3. Antes de editar qualquer arquivo fora da sua pasta, checar este doc.
4. `src/games/taboo/logic.ts|types.ts|reducer.ts|persistence.ts` e `src/data/` são estáveis — ninguém toca sem motivo forte.

## Pendências pós-merge (não esquecer)

- **Untrackar `.claude/settings.local.json`** (mover pra `.gitignore`). É arquivo de permissões **por-máquina**; nasceu versionado por acidente e gera conflito de merge recorrente em todos os chats. **Fazer só DEPOIS que B e C mergearem** suas engines no `main` — assim não há branch divergindo no arquivo e o untrack sai limpo (`git rm --cached .claude/settings.local.json` + commit; o arquivo permanece no disco de cada worktree). Se feito antes, cada chat pega um conflito "modify/delete" trivial no merge. (Anotado por Chat A, 2026-06-13.)
- **Integração na home (`App.tsx`)**: adicionar o card de cada engine nova quando B/C sinalizarem "pronto". É território do Chat A; coordenar na hora.
