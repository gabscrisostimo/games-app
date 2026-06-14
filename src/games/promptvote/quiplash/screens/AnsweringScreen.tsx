import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { promptsForPlayer } from '../logic';
import type { SessionState } from '../types';
import { ui } from '../ui';

function AnswerTurn({
  playerName,
  prompts,
  onSubmit,
}: {
  playerName: string;
  prompts: string[]; // textos dos prompts deste jogador
  onSubmit: (texts: string[]) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [texts, setTexts] = useState<string[]>(() => prompts.map(() => ''));

  if (!revealed) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Passe o celular para</p>
        <p className={`${ui.hero} animate-card-in`}>{playerName}</p>
        <ActionButton variant="neutral" onClick={() => setRevealed(true)}>
          Toque para ver meus prompts
        </ActionButton>
      </div>
    );
  }

  const allFilled = texts.every((t) => t.trim().length > 0);

  return (
    <div className={ui.screenGap4}>
      <p className={ui.lead}>{playerName}, responda:</p>
      {prompts.map((prompt, i) => (
        <label key={i} className={ui.fieldGroup}>
          <span className={ui.prompt}>{prompt}</span>
          <textarea
            className={ui.textarea}
            value={texts[i]}
            onChange={(e) => setTexts(texts.map((t, j) => (j === i ? e.target.value : t)))}
            aria-label={`Resposta ${i + 1}`}
          />
        </label>
      ))}
      <ActionButton
        variant="positive"
        disabled={!allFilled}
        onClick={() => onSubmit(texts.map((t) => t.trim()))}
      >
        Esconder e passar
      </ActionButton>
    </div>
  );
}

export function AnsweringScreen({
  state,
  onSubmit,
}: {
  state: SessionState;
  onSubmit: (playerId: string, texts: string[]) => void;
}) {
  const player = state.config.players[state.round.answerIndex];
  const prompts = promptsForPlayer(state.round, player.id).map(
    (mi) => state.round.matchups[mi].promptText,
  );
  return (
    <AnswerTurn
      key={player.id}
      playerName={player.name}
      prompts={prompts}
      onSubmit={(texts) => onSubmit(player.id, texts)}
    />
  );
}
