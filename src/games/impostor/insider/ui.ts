// src/games/impostor/insider/ui.ts
// Estilos centralizados das telas do Insider — todos via design tokens (@theme em src/index.css).
// Guia oficial: docs/visual-tokens.md. PONTO ÚNICO de restyle — editar aqui reflete em todas as telas.
// Botões que usam <ActionButton> herdam o estilo do shell e NÃO ficam aqui.
export const ui = {
  // containers de tela (layout; a transição animate-screen-in fica no wrapper da Session)
  screenGap4: 'mx-auto flex max-w-md flex-col gap-4 p-4',
  screenGap3: 'mx-auto flex max-w-md flex-col gap-3 p-6',
  screenCenteredGap5: 'mx-auto flex max-w-md flex-col gap-5 p-6 text-center',
  screenCenteredGap6: 'mx-auto flex max-w-md flex-col gap-6 p-6 text-center',
  screenFull: 'mx-auto flex h-dvh max-w-md flex-col items-center justify-between p-6',
  appRoot: 'flex flex-col gap-4',
  banner: 'mx-auto mt-4 flex max-w-md flex-col gap-2 px-4',

  // tipografia
  title: 'text-2xl font-bold text-ink',
  hero: 'text-4xl font-extrabold text-ink',
  lead200: 'text-xl text-muted',
  lead300: 'text-xl text-muted',
  resultLine: 'text-lg text-muted',
  strongInk: 'text-ink',
  muted: 'text-muted',
  label200: 'text-muted',
  warn: 'text-sm text-bad-text',

  // timer (cor aplicada no componente: calmo vs. urgente nos últimos ~10s)
  timer: 'mt-8 text-7xl font-extrabold tabular-nums',
  timerCalm: 'text-ink',
  timerUrgent: 'text-bad-text animate-urgent',

  // layout (ConfigScreen)
  section: 'flex flex-col gap-2',
  list: 'flex flex-col gap-1',
  listItem: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  inputRow: 'flex gap-2',
  fieldGroup: 'flex flex-col gap-1 text-sm font-medium text-muted',
  buttonCol: 'flex w-full flex-col gap-3',

  // controles de formulário
  field: 'rounded-lg border border-line bg-surface px-3 py-2 text-ink',

  // botões "crus" (os que NÃO usam ActionButton)
  removeBtn: 'text-bad-text',
  addBtn: 'rounded-lg bg-good px-4 font-bold text-ink transition active:brightness-90',
  primaryCta: 'mt-2 rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40',
  resumeBtn: 'rounded-2xl bg-accent py-4 text-lg font-bold text-bg transition active:brightness-90',
  linkBtn: 'text-sm text-muted underline',
  peekBtn: 'w-full rounded-2xl border border-line bg-surface py-4 text-lg font-semibold text-ink select-none transition active:brightness-95',
} as const;
