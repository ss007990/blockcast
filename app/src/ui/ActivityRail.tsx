// The activity "lens" — a horizontal rail of activities that re-scores the
// whole app when switched. Shared by Today and Week so the current sport is
// always one tap away instead of buried in a dropdown.
// Grouped by category; off-season activities collapse behind "more".
// Ends with "Add activity" — users grow the rail with their own activities
// and categories, then tune the criteria to match.

import { useState } from 'react';
import { groupActivities } from '../core/season';
import { ActivityIcon } from './ActivityIcon';
import { AddActivitySheet } from './AddActivitySheet';
import { useSeason } from '../features/home/useSeason';
import { useActivityName, useLocale, useT } from '../hooks';
import { useSettings } from '../state/settings';
import s from './ui.module.css';

export function ActivityRail() {
  const t = useT();
  const locale = useLocale();
  const nameOf = useActivityName();
  const activity = useSettings((st) => st.activity);
  const setActivity = useSettings((st) => st.setActivity);
  const customs = useSettings((st) => st.customActivities);
  const winter = useSeason();
  const [showOff, setShowOff] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // preset categories are localized; user-created ones display as typed
  const catLabel = (cat: string) => (t.cats as Record<string, string | undefined>)[cat] ?? cat;

  // alphabetical by the label the user actually sees, so FR and EN each sort naturally
  const groups = groupActivities(winter, customs).sort((a, b) =>
    catLabel(a.cat).localeCompare(catLabel(b.cat), locale),
  );
  const hiddenCount = groups.reduce(
    (n, g) => n + g.offSeason.filter((id) => id !== activity).length,
    0,
  );

  const pill = (id: string, off: boolean) => {
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
        {nameOf(id)}
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
              {catLabel(g.cat)}
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
      <button className={`${s.railBtn} ${s.railAdd}`} onClick={() => setAddOpen(true)}>
        ＋ {t.controls.addAct}
      </button>
      <AddActivitySheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
