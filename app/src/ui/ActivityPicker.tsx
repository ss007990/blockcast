// The activity "lens" — a compact dropdown grouped by category, plus quick
// chips for the last activities used so switching back and forth is one tap.
// Shared by Today and Week; re-scores the whole app when switched.
// Off-season activities sit dimmed inside their category instead of hiding.
// Ends with "Add activity" — users grow the list with their own sports.

import { useEffect, useRef, useState } from 'react';
import { groupActivities, inSeason } from '../core/season';
import { ActivityIcon } from './ActivityIcon';
import { useSeason } from '../features/home/useSeason';
import { useActivityName, useLocale, useT } from '../hooks';
import { MAX_RECENT_ACTIVITIES, useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import s from './ui.module.css';

export function ActivityPicker() {
  const t = useT();
  const locale = useLocale();
  const nameOf = useActivityName();
  const activity = useSettings((st) => st.activity);
  const actChosen = useSettings((st) => st.actChosen);
  const setActivity = useSettings((st) => st.setActivity);
  const recents = useSettings((st) => st.recentActivities);
  const removeRecent = useSettings((st) => st.removeRecentActivity);
  const customs = useSettings((st) => st.customActivities);
  const winter = useSeason();
  const setAddActOpen = useUi((u) => u.setAddActOpen);

  // first launch: open the menu right away so choosing is the first gesture
  const [open, setOpen] = useState(!actChosen);
  const wrapRef = useRef<HTMLDivElement>(null);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // preset categories are localized; user-created ones display as typed
  const catLabel = (cat: string) => (t.cats as Record<string, string | undefined>)[cat] ?? cat;

  // seasonal order straight from groupActivities: in-season categories first,
  // ranked by relevance (snow leads in winter, trail in summer) — never
  // alphabetized, so the menu reads the same way a sports watch ranks modes
  const groups = groupActivities(winter, customs).filter(
    (g) => g.inSeason.length + g.offSeason.length > 0,
  );

  const pick = (id: string) => {
    setActivity(id);
    setOpen(false);
  };

  // quick chips: the current activity plus the ones used just before it,
  // in stable alphabetical order so toggling never shuffles their positions
  const quick = [...new Set([activity, ...recents])]
    .slice(0, MAX_RECENT_ACTIVITIES)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale));

  return (
    <div className={s.picker}>
      <div className={s.pickerWrap} ref={wrapRef}>
        <button
          className={s.pickerBtn}
          data-cta={!actChosen || undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t.controls.activity}
          onClick={() => setOpen((v) => !v)}
        >
          {actChosen && (
            <span className={s.pickerIco} aria-hidden="true">
              <ActivityIcon id={activity} />
            </span>
          )}
          {actChosen ? nameOf(activity) : t.controls.chooseAct}
          <span className={s.pickerChevron} data-open={open || undefined} aria-hidden="true">
            ▾
          </span>
        </button>

        {open && (
          <div className={s.pickerMenu} role="listbox" aria-label={t.controls.activity}>
            {groups.map((g) => (
              <div key={g.cat} className={s.pickerGroup}>
                <div className={s.pickerCat} aria-hidden="true">
                  {catLabel(g.cat)}
                </div>
                {[...g.inSeason, ...g.offSeason].map((id) => {
                  const off = !inSeason(id, winter, customs);
                  const on = actChosen && id === activity;
                  return (
                    <button
                      key={id}
                      role="option"
                      aria-selected={on}
                      className={[s.pickerOpt, on && s.pickerOptOn, off && s.pickerOptOff]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => pick(id)}
                    >
                      <span className={s.pickerIco} aria-hidden="true">
                        <ActivityIcon id={id} />
                      </span>
                      {nameOf(id)}
                      {off && <i className={s.pickerOffTag}>{t.controls.offSeason}</i>}
                      {on && (
                        <span className={s.pickerCheck} aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            <button
              className={s.pickerAddOpt}
              onClick={() => {
                setOpen(false);
                setAddActOpen(true);
              }}
            >
              ＋ {t.controls.addAct}
            </button>
          </div>
        )}
      </div>

      {actChosen &&
        quick.length > 1 &&
        quick.map((id) => {
          const on = id === activity;
          return (
            <span key={id} className={on ? `${s.quickChip} ${s.quickChipOn}` : s.quickChip}>
              <button className={s.quickGo} aria-pressed={on} onClick={() => setActivity(id)}>
                <span className={s.pickerIco} aria-hidden="true">
                  <ActivityIcon id={id} />
                </span>
                {nameOf(id)}
              </button>
              {/* the current lens can't be dismissed — switch away first */}
              {!on && (
                <button
                  className={s.quickX}
                  aria-label={`${t.common.remove} ${nameOf(id)}`}
                  onClick={() => removeRecent(id)}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
    </div>
  );
}
