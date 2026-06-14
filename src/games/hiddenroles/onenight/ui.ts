// src/games/hiddenroles/onenight/ui.ts
// Estilos centralizados das telas do One Night — todos via design tokens (@theme em src/index.css).
// Guia: docs/visual-tokens.md. PONTO ÚNICO de restyle. Botões via <ActionButton> herdam do shell.
export const ui = {
  // containers
  screenGap4: 'mx-auto flex max-w-md flex-col gap-4 p-4',
  screenCenteredGap5: 'mx-auto flex max-w-md flex-col gap-5 p-6 text-center',
  screenCenteredGap6: 'mx-auto flex max-w-md flex-col gap-6 p-6 text-center',
  screenFull: 'mx-auto flex h-dvh max-w-md flex-col items-center justify-between p-6',
  appRoot: 'flex flex-col gap-4',
  banner: 'mx-auto mt-4 flex max-w-md flex-col gap-2 px-4',
  buttonCol: 'flex w-full flex-col gap-3',

  // typography
  title: 'text-2xl font-bold text-ink',
  hero: 'text-4xl font-extrabold text-ink',
  lead: 'text-xl text-muted',
  body: 'text-base text-ink',
  muted: 'text-muted',
  label: 'text-muted',
  blurb: 'text-base text-muted',
  warn: 'text-sm text-bad-text',
  good: 'text-good-text',
  bad: 'text-bad-text',

  // timer
  timer: 'mt-8 text-7xl font-extrabold tabular-nums',
  timerCalm: 'text-ink',
  timerUrgent: 'text-bad-text animate-urgent',

  // lists / sections
  section: 'flex flex-col gap-2',
  list: 'flex flex-col gap-1',
  listItem: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  inputRow: 'flex gap-2',
  fieldGroup: 'flex flex-col gap-1 text-sm font-medium text-muted',
  field: 'rounded-lg border border-line bg-surface px-3 py-2 text-ink',

  // bag builder
  counter: 'text-lg font-bold tabular-nums text-ink',
  counterOk: 'text-good-text',
  counterOff: 'text-bad-text',
  roleRow: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2',
  roleName: 'text-ink',
  stepper: 'flex items-center gap-3',
  stepBtn: 'h-8 w-8 rounded-lg border border-line bg-surface text-lg font-bold text-ink transition active:brightness-95 disabled:opacity-30',
  count: 'w-6 text-center tabular-nums text-ink',

  // cards / choices (night, vote)
  card: 'rounded-2xl border border-line bg-surface p-4 text-center',
  choiceCol: 'flex w-full flex-col gap-3',
  choice: 'w-full rounded-2xl border border-line bg-surface py-4 text-lg font-semibold text-ink select-none transition active:brightness-95',
  choiceOn: 'w-full rounded-2xl border border-accent bg-surface py-4 text-lg font-semibold text-accent select-none transition active:brightness-95',

  // result
  standing: 'flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-ink',
  deathTag: 'text-bad-text',

  // raw buttons (those NOT using ActionButton)
  removeBtn: 'text-bad-text',
  addBtn: 'rounded-lg bg-good px-4 font-bold text-ink transition active:brightness-90',
  primaryCta: 'mt-2 rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40',
  resumeBtn: 'rounded-2xl bg-accent py-4 text-lg font-bold text-bg transition active:brightness-90',
  linkBtn: 'text-sm text-muted underline',
} as const;
