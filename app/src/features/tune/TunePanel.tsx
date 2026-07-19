// Per-activity criteria sliders. Shared by Today (under the block-by-block
// header) and Week (under the controls card); open state lives in ui state.
import { AnimatePresence, motion } from 'framer-motion';
import { FACTOR_KEYS, type FactorKey } from '../../core/activities';
import { useActivityName, useT } from '../../hooks';
import { useForecast } from '../../state/forecast';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { ActivityIcon } from '../../ui/ActivityIcon';
import { Button, Card } from '../../ui/primitives';
import s from './tune.module.css';

export function TuneToggle() {
  const t = useT();
  const { tuneOpen, setTuneOpen } = useUi();
  return (
    <Button variant="ghost" onClick={() => setTuneOpen(!tuneOpen)}>
      ⚙ {t.controls.tune}
    </Button>
  );
}

const SLIDER_DEFS: { k: FactorKey; snowOnly: boolean; marineOnly: boolean }[] = FACTOR_KEYS.map(
  (k) => ({
    k,
    snowOnly: k === 'snow' || k === 'fresh',
    marineOnly: k === 'swell' || k === 'tide',
  }),
);

export function TunePanel() {
  const t = useT();
  const st = useSettings();
  const nameOf = useActivityName();
  const tuneOpen = useUi((u) => u.tuneOpen);
  const marine = useForecast((f) => f.data?.marine ?? null);
  const crit = critFor(st, st.activity);
  const isWinterAct = crit.act.snowBase != null;
  // swell/tide only make sense for water sports where that ocean data exists
  const showMarine = (k: FactorKey) =>
    crit.act.cat === 'water' && (k === 'tide' ? !!marine?.tide : !!marine?.swell);
  const isCustom = st.customActivities.some((c) => c.id === st.activity);

  return (
    <AnimatePresence initial={false}>
      {tuneOpen && (
        <motion.div
          className={s.tuneWrap}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Card className={s.tunePanel}>
            <h3>
              {t.tune.critFor} <ActivityIcon id={st.activity} /> {nameOf(st.activity)}
            </h3>
            <div className={s.tuneHint}>{t.tune.hint}</div>
            <div className={s.sliders}>
              {SLIDER_DEFS.filter(
                (d) => (!d.snowOnly || isWinterAct) && (!d.marineOnly || showMarine(d.k)),
              ).map(({ k }) => (
                <div className={s.srow} key={k}>
                  <label>
                    <span>{t.tune[k]}</span>
                    <span>{crit.weights[k]}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={crit.weights[k]}
                    onChange={(e) => st.setWeight(st.activity, k, +e.target.value)}
                  />
                  {k === 'cold' ? (
                    <small>
                      {t.tune.coldS}{' '}
                      <input
                        type="number"
                        className={s.tnum}
                        value={crit.tMin}
                        onChange={(e) => {
                          const v = +e.target.value;
                          if (Number.isFinite(v)) st.setTempBand(st.activity, 'tMin', v);
                        }}
                      />{' '}
                      °C
                    </small>
                  ) : k === 'heat' ? (
                    <small>
                      {t.tune.heatS}{' '}
                      <input
                        type="number"
                        className={s.tnum}
                        value={crit.tMax}
                        onChange={(e) => {
                          const v = +e.target.value;
                          if (Number.isFinite(v)) st.setTempBand(st.activity, 'tMax', v);
                        }}
                      />{' '}
                      °C
                    </small>
                  ) : (
                    <small>{t.tune[`${k}S`]}</small>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="ghost" onClick={() => st.resetTune(st.activity)}>
                {t.tune.reset}
              </Button>
              {isCustom && (
                <Button
                  variant="ghost"
                  style={{ color: 'var(--red)' }}
                  onClick={() => st.removeActivity(st.activity)}
                >
                  🗑 {t.add.remove}
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
