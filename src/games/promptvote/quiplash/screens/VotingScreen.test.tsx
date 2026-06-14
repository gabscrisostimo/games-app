import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VotingScreen } from './VotingScreen';
import { createSession, submitAnswers, promptsForPlayer } from '../logic';
import { getQuiplashDeck } from '../../../../data/promptvote';
import type { QuiplashConfig, SessionState } from '../types';

const config: QuiplashConfig = {
  players: [
    { id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' },
    { id: 'c', name: 'Caio' }, { id: 'd', name: 'Duda' },
  ],
  mode: 'duel', rounds: 2, deckId: 'quiplash-padrao',
};
const deck = getQuiplashDeck('quiplash-padrao')!;
beforeEach(() => localStorage.clear());

function votingState(): SessionState {
  let s = createSession(config, deck, () => 0);
  for (const p of config.players) {
    const idxs = promptsForPlayer(s.round, p.id);
    s = submitAnswers(s, p.id, idxs.map((_, i) => `resp-${p.id}-${i}`), () => 0);
  }
  return s; // phase 'voting', voteCursor 0
}

describe('VotingScreen', () => {
  it('handoff por votante; revela respostas anônimas; votar chama onVote(authorId)', async () => {
    const user = userEvent.setup();
    const s = votingState();
    const firstVoterId = s.round.ballots[0].voterId;
    const firstVoterName = config.players.find((p) => p.id === firstVoterId)!.name;
    const onVote = vi.fn();
    render(<VotingScreen state={s} onVote={onVote} />);

    // handoff do 1º votante
    expect(screen.getByText(firstVoterName)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /toque para votar/i }));

    // opções = respostas na ordem da cédula
    const ballot = s.round.ballots[0];
    const matchup = s.round.matchups[ballot.matchupIndex];
    const firstOption = matchup.answers[ballot.order[0]];
    const optionBtn = screen.getByRole('button', { name: new RegExp(firstOption.text, 'i') });
    await user.click(optionBtn);
    expect(onVote).toHaveBeenCalledWith(firstOption.authorId);
  });
});
