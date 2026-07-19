// The activity "lens" — a horizontal rail of activities that re-scores the
// whole app when switched. Shared by Today and Week so the current sport is
// always one tap away instead of buried in a dropdown.

import { ACTIVITIES } from '../core/activities';
import { orderActivities } from '../core/season';
import { useSeason } from '../features/home/useSeason';
import { useT } from '../hooks';
import { useSettings } from '../state/settings';
import s from './ui.module.css';

export function ActivityRail() {
  const t = useT();
  const activity = useSettings((st) => st.activity);
  const setActivity = useSettings((st) => st.setActivity);
  const winter = useSeason();

  return (
    <div className={s.rail} role="radiogroup" aria-label={t.controls.activity}>
      {orderActivities(winter).map((id) => {
        const on = id === activity;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            className={on ? `${s.railBtn} ${s.railOn}` : s.railBtn}
            onClick={() => setActivity(id)}
          >
            <span className={s.railIco} aria-hidden="true">
              {ACTIVITIES[id].emoji}
            </span>
            {t.activities[id]}
          </button>
        );
      })}
    </div>
  );
}
