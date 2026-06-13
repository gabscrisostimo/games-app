// src/games/impostor/insider/InsiderSession.tsx
import { useEffect, useReducer } from 'react';
import { insiderReducer } from './reducer';
import { saveSession } from './persistence';
import { MasterSelectScreen } from './screens/MasterSelectScreen';
import { MasterAnnounceScreen } from './screens/MasterAnnounceScreen';
import { RoleRevealScreen } from './screens/RoleRevealScreen';
import { GuessingScreen } from './screens/GuessingScreen';
import { InsiderHuntScreen } from './screens/InsiderHuntScreen';
import { ResultScreen } from './screens/ResultScreen';
import type { SessionState } from './types';

export function InsiderSession({
  initial,
  onHome,
}: {
  initial: SessionState;
  onHome: () => void;
}) {
  const [state, dispatch] = useReducer(insiderReducer, initial);

  useEffect(() => {
    saveSession(state);
  }, [state]);

  switch (state.round.phase) {
    case 'master-select':
      return (
        <MasterSelectScreen
          state={state}
          onSelect={(playerId) => dispatch({ type: 'SELECT_MASTER', playerId })}
        />
      );
    case 'master-announce':
      return <MasterAnnounceScreen state={state} onReveal={() => dispatch({ type: 'BEGIN_REVEAL' })} />;
    case 'role-reveal':
      return <RoleRevealScreen state={state} onAdvance={() => dispatch({ type: 'ADVANCE_REVEAL' })} />;
    case 'guessing':
      return (
        <GuessingScreen
          state={state}
          onStart={() => dispatch({ type: 'START_GUESSING', now: Date.now() })}
          onGuessed={() => dispatch({ type: 'MARK_GUESSED' })}
          onExpire={() => dispatch({ type: 'TIME_UP' })}
        />
      );
    case 'insider-hunt':
      return (
        <InsiderHuntScreen
          state={state}
          onAccuse={(accusation) => dispatch({ type: 'ACCUSE', accusation })}
        />
      );
    case 'result':
      return <ResultScreen state={state} onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })} onHome={onHome} />;
    default:
      return null;
  }
}
