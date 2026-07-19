// The activity "lens" — a horizontal rail of activities that re-scores the
// whole app when switched. Shared by Today and Week so the current sport is
// always one tap away instead of buried in a dropdown.
// Grouped by category; off-season activities collapse behind "more".

import { useState } from 'react';
import { groupActivities } from '../core/season';
import { ActivityIcon } from './ActivityIcon';
import { useSeason } from '../features/home/useSeason';
import { useT } from '../hooks';
import { useSettings } from '../state/settings';
import s from './ui.module.css';

export function ActivityRail() {
  const t = useT();
  const activity = useSettings((st) => st.activity);
  const setActivity = useSettings((st) => st.setActivity);
  const winter = useSeason();
  const [showOff, setShowOff] = useState(false);

  const groups = groupActivities(winter);
  const hiddenCount = groups.reduce(
    (n, g) => n + g.offSeason.filter((id) => id !== activity).length,
    0,
  );

  const pill = (id: (typeof groups)[number]['inSeason'][number], off: boolean) => {
    const on = id === activity;
    return (
      <button
        key={id}
        role="radio"
        aria-checked={on}
        className={[s.railBtn, on && s.railOn, off && !on && s.railOff].filter(Boolean).join(' ')}
        onClick={() => setActivity(id)}
      >
        <span className={s.railIco} aria-hidden="true">
          <ActivityIcon id={id} />
        </span>
        {t.activities[id]}
      </button>
    );
  };

  return (
    <div className={s.rail} role="radiogroup" aria-label={t.controls.activity}>
      {groups.map((g) => {
        // the current pick stays visible even when its season is over
        const visible = [...g.inSeason, ...g.offSeason.filter((id) => id === activity)];
        const hidden = g.offSeason.filter((id) => id !== activity);
        const shown = showOff ? [...visible, ...hidden] : visible;
        if (!shown.length) return null;
        return (
          <span key={g.cat} className={s.railGroup}>
            <span className={s.railCat} aria-hidden="true">
              {t.cats[g.cat]}
            </span>
            {shown.map((id) => pill(id, !g.inSeason.includes(id)))}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <button
          className={`${s.railBtn} ${s.railMore}`}
          aria-expanded={showOff}
          onClick={() => setShowOff((v) => !v)}
        >
          {showOff ? t.controls.lessActs : t.controls.moreActs.replace('{n}', String(hiddenCount))}
        </button>
      )}
    </div>
  );
}
