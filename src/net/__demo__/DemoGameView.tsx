// src/net/__demo__/DemoGameView.tsx
import { useState } from 'react';
import type { DemoAction, DemoProjection } from './promptvoteDemo';

export function DemoGameView({
  projection,
  onAction,
}: {
  projection: DemoProjection;
  onAction: (a: DemoAction) => void;
}) {
  if (projection.phase === 'answering') return <Answering p={projection} onAction={onAction} />;
  if (projection.phase === 'voting') return <Voting p={projection} onAction={onAction} />;
  return <Reveal p={projection} />;
}

function Answering({
  p,
  onAction,
}: {
  p: Extract<DemoProjection, { phase: 'answering' }>;
  onAction: (a: DemoAction) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <p className="text-xl font-bold text-ink">{p.prompt}</p>
      </div>
      {p.yourAnswer === null ? (
        <>
          <textarea
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40"
            disabled={!text.trim()}
            onClick={() => onAction({ type: 'SUBMIT_ANSWER', text: text.trim() })}
          >
            Enviar
          </button>
        </>
      ) : (
        <p className="text-center text-muted">
          Resposta enviada. Esperando os outros… {p.submitted}/{p.total}
        </p>
      )}
    </div>
  );
}

function Voting({
  p,
  onAction,
}: {
  p: Extract<DemoProjection, { phase: 'voting' }>;
  onAction: (a: DemoAction) => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 animate-screen-in">
      <p className="text-center text-lg font-semibold text-muted">{p.prompt}</p>
      {p.yourVote === null ? (
        p.options.map((o) => (
          <button
            key={o.optionId}
            className="rounded-2xl border border-line bg-surface py-4 text-lg text-ink transition active:brightness-95"
            onClick={() => onAction({ type: 'SUBMIT_VOTE', optionId: o.optionId })}
          >
            {o.text}
          </button>
        ))
      ) : (
        <p className="text-center text-muted">Voto registrado. {p.voted}/{p.total}</p>
      )}
    </div>
  );
}

function Reveal({ p }: { p: Extract<DemoProjection, { phase: 'reveal' }> }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in">
      <h2 className="text-2xl font-extrabold text-ink">Resultado</h2>
      <ul className="flex flex-col gap-2">
        {p.results.map((r, i) => (
          <li key={i} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-ink">{r.text}</span>
            <span className="text-muted">{r.nickname} · {r.votes} voto(s)</span>
          </li>
        ))}
      </ul>
      <div className="my-1 h-px bg-line" />
      <h3 className="text-lg font-bold text-muted">Placar</h3>
      <ul className="flex flex-col gap-1">
        {p.scores.map((s, i) => (
          <li key={i} className="flex justify-between text-ink">
            <span>{s.nickname}</span>
            <span className="font-bold text-accent">{s.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
