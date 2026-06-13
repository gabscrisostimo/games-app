# Prompt de início — novo game engine (games-app)

Cole este prompt no início do chat que vai criar um novo jogo.

---

Este é o **games-app**, projeto pessoal do Gabs — app PWA de jogos de festa, sem nenhuma relação com a Alaska Academy.

## Contexto do projeto

**Repo:** `github.com/gabrielcrisostimo/games-app` — clone em `/home/gabs/personal/games-app`
**Produção:** `https://games-app-bice.vercel.app` (Vercel, deploy automático no push)
**Stack:** Vite + React + TypeScript + Tailwind v4 + Vitest + vite-plugin-pwa

## O que já existe

- **Taboo v1** completo: `src/games/taboo/` — lógica pura em `logic.ts`, tipos em `types.ts`, reducer, persistence, 5 telas, 33 testes passando
- **Shell compartilhado:** `src/shell/` — `ActionButton.tsx`, `Scoreboard.tsx`, `useCountdown.ts`
- **Home:** `src/App.tsx` — navega entre jogos via estado local

## Arquitetura de módulos

Cada jogo é um módulo isolado em `src/games/<nome>/`. O contrato com o shell é simples:

```tsx
// src/games/<nome>/<Nome>App.tsx — único ponto de entrada público
export function <Nome>App({ onHome }: { onHome: () => void }) { ... }
```

Olhe o Taboo como referência de estrutura:
```
src/games/taboo/
  types.ts          — tipos do domínio (sem imports React)
  logic.ts          — funções puras (sem imports React), injectable rng
  reducer.ts        — GameAction + gameReducer, delega pra logic.ts
  persistence.ts    — saveGame/loadGame/clearGame (localStorage, try/catch silencioso)
  TabooApp.tsx      — entry point, carrega save, mostra ConfigScreen ou TabooSession
  TabooSession.tsx  — useReducer + useEffect salva no localStorage
  screens/          — uma tela por arquivo, só recebem state + callbacks
```

## Regras de escopo — IMPORTANTE

Este projeto tem **dois chats rodando em paralelo**:

| Chat | Responsabilidade |
|---|---|
| Chat de visual polish | `src/App.tsx`, `src/shell/`, telas do Taboo, `src/index.css`, `index.html`, ícones PWA |
| **Este chat (novo jogo)** | `src/games/<novo-jogo>/` — exclusivamente |

**Não mexa em `src/App.tsx` nem em `src/shell/`** enquanto o visual polish não fechar. Seu jogo deve ficar 100% contido em `src/games/<nome>/`. A integração na home (adicionar botão em App.tsx) será feita depois que o visual polish terminar — apenas sinaliza quando seu módulo estiver pronto.

## Convenções de código

- Lógica de jogo em funções puras com `rng` injetável (facilita teste determinístico)
- Zero duplicação: não recriar o que o Taboo já fez no shell
- TDD: escrever testes antes da implementação
- Commits pequenos e frequentes
- Sem comentários óbvios; sem docstrings longas

## Para começar

Leia os arquivos abaixo antes de qualquer coisa:
1. `src/games/taboo/types.ts` — referência de estrutura de tipos
2. `src/games/taboo/logic.ts` — referência de lógica pura
3. `src/shell/ActionButton.tsx` e `Scoreboard.tsx` — componentes reutilizáveis disponíveis

Depois, use o skill `superpowers:brainstorming` para desenhar o novo jogo antes de implementar.
