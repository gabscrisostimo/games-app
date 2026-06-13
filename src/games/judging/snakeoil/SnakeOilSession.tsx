// src/games/judging/snakeoil/SnakeOilSession.tsx
import { useEffect, useReducer } from 'react';
import { gameReducer } from './reducer';
import { saveGame, clearGame } from './persistence';
import { PreRoundScreen } from './screens/PreRoundScreen';
import { SelectingScreen } from './screens/SelectingScreen';
import { PitchingScreen } from './screens/PitchingScreen';
import { JudgingScreen } from './screens/JudgingScreen';
import { RoundSummaryScreen } from './screens/RoundSummaryScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import type { GameState } from './types';

export function SnakeOilSession({
  initial,
  onPlayAgain,
  onHome,
}: {
  initial: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const [state, dispatch] = useReducer(gameReducer, initial);

  useEffect(() => {
    if (state.phase === 'game-over') clearGame();
    else saveGame(state);
  }, [state]);

  switch (state.phase) {
    case 'pre-round':
      return <PreRoundScreen state={state} onStart={() => dispatch({ type: 'START_ROUND' })} />;
    case 'selecting':
      return (
        <SelectingScreen
          key={`sel-${state.round!.selIndex}`}
          state={state}
          onConfirm={(picks) => dispatch({ type: 'SELECT_CARDS', picks })}
        />
      );
    case 'pitching':
      return <PitchingScreen state={state} onVote={() => dispatch({ type: 'TO_JUDGING' })} />;
    case 'judging':
      return (
        <JudgingScreen
          state={state}
          onPick={(winnerIndex) => dispatch({ type: 'JUDGE', winnerIndex })}
        />
      );
    case 'round-summary':
      return (
        <RoundSummaryScreen state={state} onNext={() => dispatch({ type: 'NEXT_ROUND' })} />
      );
    case 'game-over':
      return <GameOverScreen state={state} onPlayAgain={onPlayAgain} onHome={onHome} />;
    default:
      return null;
  }
}
