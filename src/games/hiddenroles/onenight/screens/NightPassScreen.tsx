// src/games/hiddenroles/onenight/screens/NightPassScreen.tsx
import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { computeNightView } from '../logic';
import { ROLES } from '../roles';
import type { NightAction, NightView, SessionState } from '../types';
import { ui } from '../ui';

type Stage = 'handoff' | 'choose' | 'view';

export function NightPassScreen({
  state,
  onSubmit,
}: {
  state: SessionState;
  onSubmit: (action: NightAction | null) => void;
}) {
  const { config, round } = state;
  const n = config.players.length;
  const idx = round.passIndex;
  const player = config.players[idx];
  const role = round.deal[idx];
  const center = [n, n + 1, n + 2];
  const others = config.players.map((_, i) => i).filter((i) => i !== idx);

  const interactive =
    role === 'seer' || role === 'robber' || role === 'troublemaker' || role === 'drunk' ||
    (role === 'werewolf' && !round.deal.slice(0, n).some((r, i) => r === 'werewolf' && i !== idx));

  const [stage, setStage] = useState<Stage>('handoff');
  const [chosen, setChosen] = useState<NightAction | null>(null);
  const [buf, setBuf] = useState<number[]>([]);   // multi-pick buffer (troublemaker, seer-center)
  const [seerMode, setSeerMode] = useState<'menu' | 'player' | 'center'>('menu');

  const nameOf = (i: number) => config.players[i].name;

  function commit(action: NightAction | null) {
    setChosen(action);
    setStage('view');
  }

  if (stage === 'handoff') {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Passe o celular para</p>
        <p key={player.id} className={`${ui.hero} animate-card-in`}>{player.name}</p>
        <ActionButton variant="neutral" onClick={() => setStage(interactive ? 'choose' : 'view')}>
          Toque para ver seu papel
        </ActionButton>
      </div>
    );
  }

  if (stage === 'choose') {
    return (
      <div className={ui.screenCenteredGap5}>
        <p className={`${ui.title} animate-card-in`}>{ROLES[role].name}</p>
        <p className={ui.blurb}>{ROLES[role].blurb}</p>
        <div className={ui.choiceCol}>
          {role === 'robber' &&
            others.map((i) => (
              <button key={i} className={ui.choice} onClick={() => commit({ kind: 'robber', actor: idx, target: i })}>
                Roubar de {nameOf(i)}
              </button>
            ))}

          {role === 'drunk' &&
            center.map((c, k) => (
              <button key={c} className={ui.choice} onClick={() => commit({ kind: 'drunk', actor: idx, center: c })}>
                Carta do centro {k + 1}
              </button>
            ))}

          {role === 'werewolf' &&
            center.map((c, k) => (
              <button key={c} className={ui.choice} onClick={() => commit({ kind: 'lone-wolf', actor: idx, center: c })}>
                Espiar carta do centro {k + 1}
              </button>
            ))}

          {role === 'troublemaker' &&
            others.map((i) => (
              <button
                key={i}
                className={buf.includes(i) ? ui.choiceOn : ui.choice}
                onClick={() => {
                  const next = buf.includes(i) ? buf.filter((x) => x !== i) : [...buf, i];
                  if (next.length === 2) commit({ kind: 'troublemaker', actor: idx, a: next[0], b: next[1] });
                  else setBuf(next);
                }}
              >
                {nameOf(i)}
              </button>
            ))}

          {role === 'seer' && seerMode === 'menu' && (
            <>
              <button className={ui.choice} onClick={() => setSeerMode('player')}>Ver a carta de um jogador</button>
              <button className={ui.choice} onClick={() => setSeerMode('center')}>Ver 2 cartas do centro</button>
            </>
          )}
          {role === 'seer' && seerMode === 'player' &&
            others.map((i) => (
              <button
                key={i}
                className={ui.choice}
                onClick={() => commit({ kind: 'seer', actor: idx, peek: { kind: 'player', target: i } })}
              >
                {nameOf(i)}
              </button>
            ))}
          {role === 'seer' && seerMode === 'center' &&
            center.map((c, k) => (
              <button
                key={c}
                className={buf.includes(c) ? ui.choiceOn : ui.choice}
                onClick={() => {
                  const next = buf.includes(c) ? buf.filter((x) => x !== c) : [...buf, c];
                  if (next.length === 2) {
                    commit({ kind: 'seer', actor: idx, peek: { kind: 'center', cards: [next[0], next[1]] } });
                  } else setBuf(next);
                }}
              >
                Carta do centro {k + 1}
              </button>
            ))}

          {role !== 'drunk' && (
            <button className={ui.linkBtn} onClick={() => commit(null)}>Não agir</button>
          )}
        </div>
      </div>
    );
  }

  // stage === 'view'
  const view = computeNightView(round.deal, idx, n, chosen);
  return (
    <div className={ui.screenCenteredGap6}>
      <p className={`${ui.title} animate-card-in`}>{ROLES[role].name}</p>
      <ViewBody view={view} nameOf={nameOf} />
      <ActionButton variant="positive" onClick={() => onSubmit(chosen)}>
        Esconder e passar
      </ActionButton>
    </div>
  );
}

function ViewBody({ view, nameOf }: { view: NightView; nameOf: (i: number) => string }) {
  if (view === null) return <p className={ui.body}>Você optou por não agir.</p>;
  switch (view.kind) {
    case 'wolves':
      return (
        <p className={ui.body}>
          {view.partners.length
            ? `Outros lobos: ${view.partners.map(nameOf).join(', ')}.`
            : 'Você é o único lobo entre os jogadores.'}
        </p>
      );
    case 'lone-wolf':
      return <p className={ui.body}>Carta do centro espiada: {ROLES[view.role].name}.</p>;
    case 'minion':
      return (
        <p className={ui.body}>
          Lobos: {view.wolves.length ? view.wolves.map(nameOf).join(', ') : 'nenhum (todos no centro)'}.
        </p>
      );
    case 'masons':
      return (
        <p className={ui.body}>
          {view.partners.length ? `Outro Maçom: ${view.partners.map(nameOf).join(', ')}.` : 'Você é o único Maçom.'}
        </p>
      );
    case 'seer-player':
      return <p className={ui.body}>{nameOf(view.target)} é {ROLES[view.role].name}.</p>;
    case 'seer-center':
      return <p className={ui.body}>Centro: {ROLES[view.roles[0]].name} e {ROLES[view.roles[1]].name}.</p>;
    case 'robber':
      return <p className={ui.body}>Você roubou e agora é {ROLES[view.role].name}.</p>;
    case 'troublemaker':
      return <p className={ui.body}>Você trocou as cartas de dois jogadores.</p>;
    case 'drunk':
      return <p className={ui.body}>Você trocou com o centro às cegas.</p>;
    case 'insomniac':
      return <p className={ui.body}>Você acordou como {ROLES[view.role].name}.</p>;
  }
}
