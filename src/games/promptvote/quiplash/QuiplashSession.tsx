import { useEffect, useReducer } from 'react';
import { quiplashReducer } from './reducer';
import { saveSession } from './persistence';
import { AnsweringScreen } from './screens/AnsweringScreen';
import { VotingScreen } from './screens/VotingScreen';
import { RoundResultScreen } from './screens/RoundResultScreen';
import { FinalResultScreen } from './screens/FinalResultScreen';
import type { SessionState } from './types';

export function QuiplashSession({
  initial,
  onHome,
}: {
  initial: SessionState;
  onHome: () => void;
}) {
  const [state, dispatch] = useReducer(quiplashReducer, initial);

  useEffect(() => { saveSession(state); }, [state]);

  const screen = (() => {
    switch (state.round.phase) {
      case 'answering':
        return (
          <AnsweringScreen
            state={state}
            onSubmit={(playerId, texts) => dispatch({ type: 'SUBMIT_ANSWERS', playerId, texts })}
          />
        );
      case 'voting':
        return <VotingScreen state={state} onVote={(authorId) => dispatch({ type: 'CAST_VOTE', authorId })} />;
      case 'round-result':
        return <RoundResultScreen state={state} onNext={() => dispatch({ type: 'NEXT_ROUND' })} />;
      case 'final-result':
        return (
          <FinalResultScreen
            state={state}
            onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })}
            onHome={onHome}
          />
        );
      default:
        return null;
    }
  })();

  // Wrapper com key={fase} → remonta a cada troca de fase, disparando o fade.
  // (answering/voting cuidam do passa-celular internamente, por jogador/votante.)
  return (
    <div key={state.round.phase} className="animate-screen-in">
      {screen}
    </div>
  );
}
