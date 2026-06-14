// View cliente do Quiplash em rede: renderiza a QuiplashProjection (o que ESTE
// jogador vê) e emite QuiplashNetAction. Segue os tokens visuais do projeto e o
// padrão da DemoGameView. É território do Chat Backend (src/net), separado das
// telas pass-and-play do Quiplash (que são do Chat D e usam handoff).
import { useState } from 'react';
import { useCountdown } from '../../shell/useCountdown';
import type { QuiplashNetAction, QuiplashProjection } from './quiplash';

const container = 'mx-auto flex max-w-md flex-col gap-6 p-6 animate-screen-in';
const card = 'rounded-2xl border border-line bg-surface p-4';
const primaryBtn =
  'rounded-2xl bg-accent py-4 text-xl font-bold text-bg transition active:brightness-90 disabled:opacity-40';
const choiceBtn =
  'rounded-2xl border border-line bg-surface px-4 py-4 text-lg text-ink transition active:brightness-95 text-left';

function Timer({ endsAt }: { endsAt: number }) {
  const left = useCountdown(endsAt, () => {});
  return <p className="text-center text-sm font-semibold text-muted">{left}s</p>;
}

export function QuiplashNetView({
  projection,
  onAction,
}: {
  projection: QuiplashProjection;
  onAction: (a: QuiplashNetAction) => void;
}) {
  switch (projection.phase) {
    case 'answering':
      return (
        <Answering
          key={projection.prompts.map((p) => p.promptText).join('|')}
          p={projection}
          onAction={onAction}
        />
      );
    case 'voting':
      return <Voting p={projection} onAction={onAction} />;
    case 'round-result':
      return <RoundResult p={projection} onAction={onAction} />;
    case 'final-result':
      return <FinalResult p={projection} onAction={onAction} />;
  }
}

function Answering({
  p,
  onAction,
}: {
  p: Extract<QuiplashProjection, { phase: 'answering' }>;
  onAction: (a: QuiplashNetAction) => void;
}) {
  const [texts, setTexts] = useState<string[]>(() => p.prompts.map((q) => q.yourText));
  const allFilled = texts.length === p.prompts.length && texts.every((t) => t.trim().length > 0);

  if (p.submitted) {
    return (
      <div className={container}>
        <Timer endsAt={p.endsAt} />
        <p className="text-center text-muted">
          Respostas enviadas. Esperando os outros… {p.answeredCount}/{p.total}
        </p>
      </div>
    );
  }

  return (
    <div className={container}>
      <Timer endsAt={p.endsAt} />
      {p.prompts.map((q, i) => (
        <label key={q.matchupIndex} className="flex flex-col gap-2">
          <span className="text-lg font-bold text-ink">{q.promptText}</span>
          <textarea
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink"
            rows={2}
            value={texts[i] ?? ''}
            maxLength={120}
            onChange={(e) => setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
          />
        </label>
      ))}
      <button
        className={primaryBtn}
        disabled={!allFilled}
        onClick={() => onAction({ type: 'SUBMIT_ANSWERS', texts: texts.map((t) => t.trim()) })}
      >
        Enviar
      </button>
    </div>
  );
}

function Voting({
  p,
  onAction,
}: {
  p: Extract<QuiplashProjection, { phase: 'voting' }>;
  onAction: (a: QuiplashNetAction) => void;
}) {
  return (
    <div className={container}>
      <Timer endsAt={p.endsAt} />
      <p className="text-center text-sm text-muted">
        Votos: {p.votedCount}/{p.totalBallots}
      </p>
      {p.ballots.map((b) => (
        <div key={b.matchupIndex} className={`${card} flex flex-col gap-3`}>
          <p className="text-center text-lg font-semibold text-ink">{b.promptText}</p>
          {b.yourChoice === null ? (
            b.options.map((o) => (
              <button
                key={o.choice}
                className={choiceBtn}
                onClick={() => onAction({ type: 'CAST_VOTE', matchupIndex: b.matchupIndex, choice: o.choice })}
              >
                {o.text}
              </button>
            ))
          ) : (
            <p className="text-center text-muted">Voto registrado ✓</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RoundResult({
  p,
  onAction,
}: {
  p: Extract<QuiplashProjection, { phase: 'round-result' }>;
  onAction: (a: QuiplashNetAction) => void;
}) {
  const nameOf = new Map(p.ranking.map((r) => [r.id, r.name]));
  return (
    <div className={container}>
      <h2 className="text-2xl font-extrabold text-ink">
        {p.isLastLash ? 'Last Lash!' : `Resultado (x${p.multiplier})`}
      </h2>

      {p.results.map((r, i) => (
        <div key={i} className={`${card} flex flex-col gap-2`}>
          <p className="font-semibold text-muted">{r.promptText}</p>
          <ul className="flex flex-col gap-1">
            {r.tallies.map((t, j) => (
              <li key={j} className="flex items-center justify-between">
                <span className="text-ink">
                  {t.text || <span className="italic text-muted">(em branco)</span>}
                  <span className="text-muted"> — {nameOf.get(t.authorId) ?? '???'}</span>
                  {t.quiplash && <span className="ml-1 font-bold text-accent">QUIPLASH!</span>}
                </span>
                <span className="text-muted">
                  {t.votes} voto(s) · <span className="font-bold text-accent">+{t.points}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <Ranking ranking={p.ranking} />
      <button className={primaryBtn} onClick={() => onAction({ type: 'NEXT_ROUND' })}>
        Próxima rodada
      </button>
    </div>
  );
}

function FinalResult({
  p,
  onAction,
}: {
  p: Extract<QuiplashProjection, { phase: 'final-result' }>;
  onAction: (a: QuiplashNetAction) => void;
}) {
  const champ = p.ranking[0];
  return (
    <div className={container}>
      <h2 className="text-3xl font-extrabold text-ink">Resultado final</h2>
      {champ && (
        <div className={`${card} text-center`}>
          <p className="text-sm text-muted">Vencedor</p>
          <p className="text-2xl font-extrabold text-accent">{champ.name}</p>
        </div>
      )}
      <Ranking ranking={p.ranking} />
      <button className={primaryBtn} onClick={() => onAction({ type: 'PLAY_AGAIN' })}>
        Jogar de novo
      </button>
    </div>
  );
}

function Ranking({ ranking }: { ranking: { id: string; name: string; score: number }[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {ranking.map((r) => (
        <li key={r.id} className="flex justify-between text-ink">
          <span>{r.name}</span>
          <span className="font-bold text-accent">{r.score}</span>
        </li>
      ))}
    </ul>
  );
}
