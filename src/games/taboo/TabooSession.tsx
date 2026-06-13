// src/games/taboo/TabooSession.tsx
import { useCallback, useEffect, useReducer } from 'react';
import { gameReducer } from './reducer';
import { saveGame, clearGame } from './persistence';
import { PreTurnScreen } from './screens/PreTurnScreen';
import { InTurnScreen } from './screens/InTurnScreen';
import { TurnSummaryScreen } from './screens/TurnSummaryScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import type { GameState, Outcome } from './types';

export function TabooSession({
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

  const onExpire = useCallback(() => dispatch({ type: 'END_TURN' }), []);
  const onAction = useCallback((outcome: Outcome) => dispatch({ type: 'ACTION', outcome }), []);

  function renderScreen() {
    switch (state.phase) {
      case 'pre-turn':
        return <PreTurnScreen state={state} onStart={() => dispatch({ type: 'START_TURN', now: Date.now() })} />;
      case 'in-turn':
        return <InTurnScreen state={state} onAction={onAction} onExpire={onExpire} />;
      case 'turn-summary':
        return <TurnSummaryScreen state={state} onNext={() => dispatch({ type: 'NEXT_TURN' })} />;
      case 'game-over':
        return <GameOverScreen state={state} onPlayAgain={onPlayAgain} onHome={onHome} />;
      default:
        return null;
    }
  }

  return (
    <div key={state.phase} className="min-h-dvh bg-bg text-ink animate-screen-in">
      {renderScreen()}
    </div>
  );
}
