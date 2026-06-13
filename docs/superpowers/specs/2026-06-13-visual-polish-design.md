# Visual Polish — Design Spec

**Data:** 2026-06-13
**Escopo:** Passada de design visual no games-app (Taboo v1 + shell + home). Sem mudança de lógica ou navegação.

## Objetivo

Dar identidade visual ao app, hoje funcional mas sem personalidade (fonte padrão, cores soltas, sem hierarquia). Direção escolhida: **Fusão** — azul-meia-noite profundo, tipografia limpa, acentos pastel suaves.

## Restrições

- **Não tocar:** `src/games/taboo/logic.ts`, `types.ts`, `reducer.ts`, `persistence.ts`, `src/data/`. Lógica estável.
- **Não quebrar** os 33 testes existentes (testam lógica, não CSS).
- **Não adicionar** bibliotecas de animação (Framer Motion etc.). Só CSS/Tailwind.
- Navegação e estrutura/layout das telas permanecem idênticas — muda só o tratamento visual.
- Coordenação entre chats: este chat é dono de `src/App.tsx`, `src/shell/`, telas do Taboo, `src/index.css`, `index.html`, `public/`. Ver memória `project-scope-coordination`.

## 1. Sistema de design (tokens)

Definir tokens via `@theme` do Tailwind v4 em `src/index.css` (Tailwind v4 não usa `tailwind.config.js`). Substituir as cores soltas (`slate-900`, `amber-500`, etc.) por tokens semânticos.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0c1220` | Fundo da app (substitui slate-900) |
| `--color-surface` | `#131c30` | Cards, campos, blocos |
| `--color-border` | `#1e3a5f` | Bordas de superfície e divisores |
| `--color-text` | `#f8fafc` | Texto principal |
| `--color-accent` | `#7dd3fc` | Azul-céu — labels, timer, CTA |
| `--color-muted` | `#94a3b8` | Texto secundário |
| `--color-positive-bg` | `#14532d` | Botão/feedback acerto |
| `--color-positive-fg` | `#86efac` | Texto sobre positivo |
| `--color-negative-bg` | `#881337` | Botão/feedback proibida |
| `--color-negative-fg` | `#fca5a5` | Proibidas, texto negativo |

Mapear cada token para nomes utilitários Tailwind (ex.: `bg-bg`, `bg-surface`, `text-accent`). O nome exato dos utilitários é decisão de implementação, desde que consistente.

### Tipografia

- Fonte **Inter** via Google Fonts, carregada em `index.html` (`<link>` com preconnect), pesos 400/500/600/700/800.
- Definir `font-family` base no `body` para Inter com fallback sans-serif.
- Hierarquia:
  - Palavra-alvo (InTurn): `text-4xl`/`text-5xl` `font-extrabold`
  - Proibidas: `text-base font-medium`
  - Labels/headers pequenos: `text-xs uppercase tracking-wide`
  - Timer: `font-bold tabular-nums`

## 2. Estrutura das telas

Aplicar os tokens em cada tela. Layout e fluxo inalterados.

- **`src/App.tsx` (Home):** título com presença; cada jogo é um card de superfície clicável (não botão âmbar cru). Hoje só Taboo.
- **ConfigScreen:** campos agrupados em superfície, labels uppercase, botão "Começar" com acento. Inputs `bg-surface` + borda.
- **PreTurnScreen:** nome do time grande em `text-accent`; instrução do juiz em bloco de superfície; botão verde.
- **InTurnScreen:** card central da palavra dominante, borda + divisor entre alvo e proibidas; header time/timer/pulos espaçado; 3 botões de ação com acentos.
- **TurnSummaryScreen:** 3 contadores (acertos/proibidas/pulos) em cards de superfície coloridos; scoreboard no topo.
- **GameOverScreen:** vencedor destacado, scoreboard, botões jogar de novo / início.
- **`src/shell/ActionButton.tsx`:** reescrever variantes com tokens (positive/neutral/negative).
- **`src/shell/Scoreboard.tsx`:** reescrever com tokens; manter destaque do time atual (ring no acento).

## 3. Animações (CSS puro)

Todas via `@keyframes` em `src/index.css` + classes utilitárias. Respeitam `prefers-reduced-motion` (envolver as animações em `@media (prefers-reduced-motion: no-preference)` ou desligar via media query que zera a animação).

1. **Feedback acerto/proibida** — ao marcar, o card central pisca verde/vermelho (~300ms). Estado React efêmero em InTurnScreen: `flash: 'correct' | 'taboo' | null`, setado no clique, limpo via `setTimeout(300ms)`. Adiciona classe de animação ao card. **Não altera a lógica do jogo** — o dispatch da ação continua igual; o flash é puramente visual e paralelo.
2. **Entrada de card** — nova palavra entra com fade + slide leve. Usar `key={turn.currentCardId}` no elemento do card para forçar re-mount a cada carta, disparando a animação de entrada.
3. **Timer urgente** — nos últimos 10s o número pulsa e fica vermelho. Classe condicional quando `remaining <= 10` no InTurnScreen.
4. **Transição de tela** — fade suave ao trocar de fase. Wrapper com animação de entrada e `key={phase}` (ou key equivalente) para re-mount na troca.

## 4. Ícones PWA

Substituir placeholders 1×1 px em `public/pwa-192.png` e `public/pwa-512.png` por ícones reais `192×192` e `512×512` com identidade Fusão (fundo azul-meia-noite `#0c1220`, símbolo simples — inicial estilizada ou emoji de jogo). Gerar programaticamente (canvas/SVG → PNG via script Node), sem ferramenta de design externa. Atualizar `theme_color`/`background_color` no manifest (`vite.config.ts`) para `#0c1220`.

## 5. Testes

- Os 33 testes de lógica permanecem passando (não tocados).
- Novos testes focados na nova lógica de UI:
  - Estado `flash` limpa após o timeout (fake timers).
  - Classe de urgência do timer aparece quando `remaining <= 10`.
- Demais mudanças são visuais, validadas no browser e em produção (Vercel).

## Out of scope

- Animações com física/spring, confete, score "contando" (exigiriam dependência nova).
- Reestruturação de layout/navegação.
- Editor de decks, novos jogos, multi-device (outros itens pendentes).

## Critério de pronto

- App em produção com a identidade Fusão aplicada em todas as telas.
- Fonte Inter carregando.
- 4 animações funcionando e respeitando reduced-motion.
- Ícones PWA reais (instalação mostra ícone correto).
- Todos os testes passando.
