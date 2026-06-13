# Guia de tokens visuais — games-app

Referência canônica de estilo para **todas as engines** (Taboo, Insider/Impostor, Julgamento, Prompt→Voto, Hidden Roles, etc.). Direção visual: **Fusão** — fundo azul-meia-noite, fonte Inter, acentos pastel.

Fonte da verdade: `src/index.css` (`@theme`). Este doc só documenta o que está lá. Se divergir, o `index.css` vence.

> **Pré-requisito:** os tokens só existem depois que o `main` com o visual polish está na sua branch. Se você está numa branch antiga, faça `git merge main` (ou rebase) **antes** de usar as classes abaixo — senão `bg-surface` & cia. não existem no seu `index.css`.

## Tokens de cor

Cada `--color-x` no `@theme` gera automaticamente os utilitários `bg-x`, `text-x`, `border-x`, `ring-x`.

| Token | Hex | Uso pretendido |
|---|---|---|
| `bg` | `#0c1220` | fundo da página (azul-meia-noite) |
| `surface` | `#131c30` | cards, campos de form, blocos |
| `line` | `#1e3a5f` | bordas e divisores |
| `ink` | `#f8fafc` | texto principal (quase branco) |
| `muted` | `#94a3b8` | texto secundário, labels |
| `accent` | `#7dd3fc` | azul-céu: destaque, timer, CTA primário |
| `good` | `#15803d` | botão de ação positiva |
| `good-soft` | `#14532d` | fundo/feedback de acerto |
| `good-text` | `#86efac` | texto sobre verde |
| `bad` | `#be123c` | botão de ação negativa |
| `bad-soft` | `#881337` | fundo/feedback de erro |
| `bad-text` | `#fca5a5` | texto vermelho, alertas |

## Tipografia

Inter é a **fonte padrão** (via `--font-sans`) — o `body` já a usa, **nenhuma classe extra é necessária**. Pesos disponíveis: 400, 500, 600, 700, 800 (`font-medium`, `font-semibold`, `font-bold`, `font-extrabold`).

## Padrões de componente (copiar/colar)

### Container padrão de tela
```tsx
<div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
  {/* conteúdo */}
</div>
```
- `max-w-md` + `mx-auto`: mobile-first, centralizado.
- `animate-screen-in`: fade de entrada da tela.
- Telas densas (formulário): use `gap-4 p-4`.

### Botão primário (CTA — azul-céu, texto escuro)
```tsx
<button className="rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90">
  Ação principal
</button>
```

### Botão de ação positiva / negativa
```tsx
<button className="rounded-2xl bg-good py-6 text-2xl font-bold text-ink transition active:brightness-90">Confirmar</button>
<button className="rounded-2xl bg-bad  py-6 text-2xl font-bold text-ink transition active:brightness-90">Recusar</button>
```
Ou use o componente compartilhado `ActionButton` (`variant="positive" | "neutral" | "negative"`).

### Botão secundário (contorno)
```tsx
<button className="rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95">
  Voltar
</button>
```

### Card / bloco de conteúdo
```tsx
<div className="rounded-2xl border border-line bg-surface p-4 text-center">
  {/* ... */}
</div>
```

### Campo de formulário e label
```tsx
const field = 'rounded-lg border border-line bg-surface px-3 py-2 text-ink';
const labelText = 'flex flex-col gap-1 text-sm font-medium text-muted';
```

### Divisor
```tsx
<div className="my-5 h-px bg-line" />
```

## Animações

Tokens `--animate-*` geram utilitários `animate-*`. Todas respeitam `prefers-reduced-motion` automaticamente (já tratado no `index.css`).

| Classe | Efeito | Quando usar |
|---|---|---|
| `animate-screen-in` | fade-in (200ms) | wrapper de cada tela; troca de tela (com `key={fase}`) |
| `animate-card-in` | fade + slide-up (250ms) | entrada de carta/item; use `key={idDoItem}` pra remontar a cada troca |
| `animate-urgent` | pulse infinito | timer nos últimos ~10s (combine com `text-bad-text`) |

**Transição entre telas:** envolva o render num wrapper com `key={fase}` + `animate-screen-in` (ver `src/games/taboo/TabooSession.tsx` como referência).

## Componentes de shell compartilhados — estado de acoplamento

| Componente | Game-agnostic? | Observação |
|---|---|---|
| `ActionButton` (`src/shell/ActionButton.tsx`) | ✅ sim | importa só React; use à vontade |
| `useCountdown` (`src/shell/useCountdown.ts`) | ✅ sim | hook puro `(endsAt, onExpire) => remaining` |
| `Scoreboard` (`src/shell/Scoreboard.tsx`) | ❌ **não** | importa `TeamState` de `games/taboo/types` — **acoplado ao Taboo**. Para reusar em outra engine, primeiro mover/generalizar o tipo (dívida conhecida — ver `status-chats.md`). |

Regra: estilize **via tokens**, nunca com cores cruas (`bg-slate-800`, `text-white`, `amber-500`…). Assim toda engine herda a direção visual e mudanças de tema ficam centralizadas no `index.css`.
