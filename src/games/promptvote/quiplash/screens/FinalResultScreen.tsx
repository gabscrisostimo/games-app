import { ActionButton } from '../../../../shell/ActionButton';
import { ranking } from '../logic';
import type { SessionState } from '../types';
import { ui } from '../ui';

export function FinalResultScreen({
  state,
  onPlayAgain,
  onHome,
}: {
  state: SessionState;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const board = ranking(state);
  return (
    <div className={ui.screenGap4}>
      <h2 className={ui.title}>Resultado final</h2>
      <ol className={ui.list}>
        {board.map((row, i) => (
          <li key={row.player.id} className={ui.rankRow}>
            <span>{i + 1}º {row.player.name}{i === 0 && <span className={ui.badge}>🏆</span>}</span>
            <span className={ui.accent}>{row.score}</span>
          </li>
        ))}
      </ol>
      <ActionButton variant="positive" onClick={onPlayAgain}>Jogar de novo</ActionButton>
      <ActionButton variant="neutral" onClick={onHome}>Início</ActionButton>
    </div>
  );
}
