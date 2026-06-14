// src/games/hiddenroles/onenight/OneNightSession.tsx
import { useEffect, useReducer } from 'react';
import { oneNightReducer } from './reducer';
import { saveSession } from './persistence';
import { NightPassScreen } from './screens/NightPassScreen';
import { DawnPassScreen } from './screens/DawnPassScreen';
import { DiscussionScreen } from './screens/DiscussionScreen';
import { VotePassScreen } from './screens/VotePassScreen';
import { ResultScreen } from './screens/ResultScreen';
import type { SessionState } from './types';

export function OneNightSession({
  initial,
  onHome,
}: {
  initial: SessionState;
  onHome: () => void;
}) {
  const [state, dispatch] = useReducer(oneNightReducer, initial);

  useEffect(() => {
    saveSession(state);
  }, [state]);

  const screen = (() => {
    switch (state.round.phase) {
      case 'night':
        return <NightPassScreen state={state} onSubmit={(action) => dispatch({ type: 'SUBMIT_PASS', action })} />;
      case 'dawn':
        return <DawnPassScreen state={state} onSubmit={() => dispatch({ type: 'SUBMIT_DAWN' })} />;
      case 'discussion':
        return (
          <DiscussionScreen
            state={state}
            onStart={() => dispatch({ type: 'START_DISCUSSION', now: Date.now() })}
            onVote={() => dispatch({ type: 'BEGIN_VOTE' })}
          />
        );
      case 'vote':
        return <VotePassScreen state={state} onVote={(target) => dispatch({ type: 'SUBMIT_VOTE', target })} />;
      case 'result':
        return (
          <ResultScreen
            state={state}
            onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })}
            onHome={onHome}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div key={`${state.round.phase}-${state.round.passIndex}`} className="animate-screen-in">
      {screen}
    </div>
  );
}
