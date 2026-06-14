// src/games/hiddenroles/onenight/screens/DiscussionScreen.tsx
import { useCallback } from 'react';
import { ActionButton } from '../../../../shell/ActionButton';
import { useCountdown } from '../../../../shell/useCountdown';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function DiscussionScreen({
  state,
  onStart,
  onVote,
}: {
  state: SessionState;
  onStart: () => void;
  onVote: () => void;
}) {
  const stableExpire = useCallback(onVote, [onVote]);
  const remaining = useCountdown(state.round.endsAt, stableExpire);

  if (state.round.endsAt === null) {
    return (
      <div className={ui.screenCenteredGap6}>
        <p className={ui.lead}>Discutam quem são os lobos. Quando estiverem prontos, votem.</p>
        <ActionButton variant="positive" onClick={onStart}>
          Começar discussão
        </ActionButton>
      </div>
    );
  }

  const urgent = remaining <= 10;
  return (
    <div className={ui.screenFull}>
      <span className={`${ui.timer} ${urgent ? ui.timerUrgent : ui.timerCalm}`}>{remaining}s</span>
      <div className={ui.buttonCol}>
        <ActionButton variant="positive" onClick={onVote}>
          Votar agora
        </ActionButton>
      </div>
    </div>
  );
}
