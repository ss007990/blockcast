// Tiny 0–100 risk gradient with a dot at the score. Sits under any big bare
// number so it reads as a position on a go→stay-home scale, not a temperature.
import s from './ui.module.css';

export function RiskScale({ score }: { score: number }) {
  return (
    <span className={s.riskScale} aria-hidden="true">
      <i style={{ left: `${Math.min(100, Math.max(0, score))}%` }} />
    </span>
  );
}
