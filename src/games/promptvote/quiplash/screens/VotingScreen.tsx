import { useState } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import type { Matchup, SessionState } from '../types';
import { ui } from '../ui';

function VoterTurn({
  voterName,
  matchup,
  order,
  onVote,
}: {
  voterName: string;
  matchup: Matchup;
  order: number[];
  onVote: (authorId: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Passe o celular para</p>
        <p className={`${ui.hero} animate-card-in`}>{voterName}</p>
        <ActionButton variant="neutral" onClick={() => setRevealed(true)}>
          Toque para votar
        </ActionButton>
      </div>
    );
  }

  return (
    <div className={ui.screenGap4}>
      <p className={ui.prompt}>{matchup.promptText}</p>
      <p className={ui.muted}>Toque na sua resposta favorita:</p>
      {order.map((ai) => (
        <button key={ai} className={ui.voteOption} onClick={() => onVote(matchup.answers[ai].authorId)}>
          {matchup.answers[ai].text}
        </button>
      ))}
    </div>
  );
}

export function VotingScreen({
  state,
  onVote,
}: {
  state: SessionState;
  onVote: (authorId: string) => void;
}) {
  const ballot = state.round.ballots[state.round.voteCursor];
  const voter = state.config.players.find((p) => p.id === ballot.voterId)!;
  return (
    <VoterTurn
      key={ballot.voterId}
      voterName={voter.name}
      matchup={state.round.matchups[ballot.matchupIndex]}
      order={ballot.order}
      onVote={onVote}
    />
  );
}
