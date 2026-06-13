// Estilos centralizados das telas do Quiplash — todos via design tokens (@theme em src/index.css).
// Guia oficial: docs/visual-tokens.md. PONTO ÚNICO de restyle. Botões com <ActionButton> não ficam aqui.
export const ui = {
  // containers
  screenGap4: 'mx-auto flex max-w-md flex-col gap-4 p-4',
  screenCenteredGap6: 'mx-auto flex max-w-md flex-col gap-6 p-6 text-center',
  appRoot: 'flex flex-col gap-4',
  banner: 'mx-auto mt-4 flex max-w-md flex-col gap-2 px-4',

  // tipografia
  title: 'text-2xl font-bold text-ink',
  hero: 'text-4xl font-extrabold text-ink',
  lead: 'text-xl text-muted',
  prompt: 'text-2xl font-bold text-ink',
  muted: 'text-muted',
  label: 'text-muted',
  warn: 'text-sm text-bad-text',
  accent: 'text-accent font-bold',

  // listas / cards
  section: 'flex flex-col gap-2',
  list: 'flex flex-col gap-1',
  listItem: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  card: 'rounded-2xl border border-line bg-surface p-4 text-left',
  rankRow: 'flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-ink',
  badge: 'ml-2 rounded-full bg-good-soft px-2 py-0.5 text-sm font-bold text-good-text',

  // form
  inputRow: 'flex gap-2',
  fieldGroup: 'flex flex-col gap-1 text-sm font-medium text-muted',
  field: 'rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  textarea: 'min-h-24 rounded-lg border border-line bg-surface px-3 py-2 text-ink',

  // botões "crus" (sem ActionButton)
  removeBtn: 'text-bad-text',
  addBtn: 'rounded-lg bg-good px-4 font-bold text-ink transition active:brightness-90',
  primaryCta: 'mt-2 rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40',
  resumeBtn: 'rounded-2xl bg-accent py-4 text-lg font-bold text-bg transition active:brightness-90',
  linkBtn: 'text-sm text-muted underline',
  voteOption: 'w-full rounded-2xl border border-line bg-surface p-4 text-left text-lg text-ink transition active:brightness-95',
} as const;
