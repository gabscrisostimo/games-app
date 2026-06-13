// src/games/impostor/insider/ui.ts
// Estilos centralizados das telas do Insider.
// PONTO ÚNICO de realinhamento visual: quando os design tokens do Chat A chegarem,
// trocar os valores aqui (ex.: bg-slate-800 → bg-surface) reflete em todas as telas.
// Botões que usam <ActionButton> herdam o estilo do shell e NÃO ficam aqui.
export const ui = {
  // containers de tela
  screenGap4: 'mx-auto flex max-w-md flex-col gap-4 p-4',
  screenGap3: 'mx-auto flex max-w-md flex-col gap-3 p-4',
  screenCenteredGap5: 'mx-auto flex max-w-md flex-col gap-5 p-4 text-center',
  screenCenteredGap6: 'mx-auto flex max-w-md flex-col gap-6 p-4 text-center',
  screenFull: 'mx-auto flex h-dvh max-w-md flex-col items-center justify-between p-4',
  appRoot: 'flex flex-col gap-4',
  banner: 'mx-auto mt-4 flex max-w-md flex-col gap-2 px-4',

  // tipografia
  title: 'text-2xl font-bold text-white',
  hero: 'text-4xl font-extrabold text-white',
  lead200: 'text-xl text-slate-200',
  lead300: 'text-xl text-slate-300',
  resultLine: 'text-lg text-slate-200',
  strongInk: 'text-white',
  muted: 'text-slate-400',
  label200: 'text-slate-200',
  warn: 'text-sm text-amber-400',
  timer: 'mt-8 text-7xl font-extrabold tabular-nums text-white',

  // layout (ConfigScreen)
  section: 'flex flex-col gap-2',
  list: 'flex flex-col gap-1',
  listItem: 'flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-white',
  inputRow: 'flex gap-2',
  fieldGroup: 'flex flex-col gap-1 text-slate-200',
  buttonCol: 'flex w-full flex-col gap-3',

  // controles de formulário
  field: 'rounded-lg bg-slate-800 px-3 py-2 text-white',

  // botões "crus" (os que NÃO usam ActionButton)
  removeBtn: 'text-rose-400',
  addBtn: 'rounded-lg bg-emerald-600 px-4 font-bold text-white',
  primaryCta: 'mt-2 rounded-2xl bg-amber-500 py-4 text-xl font-bold text-slate-900 active:bg-amber-600 disabled:opacity-40',
  resumeBtn: 'rounded-2xl bg-amber-500 py-4 text-lg font-bold text-slate-900',
  linkBtn: 'text-sm text-slate-400 underline',
  peekBtn: 'w-full rounded-2xl bg-slate-700 py-4 text-lg font-semibold text-white select-none',
} as const;
