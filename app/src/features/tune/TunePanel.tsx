// Per-activity criteria sliders. Shared by Today (under the block-by-block
// header) and Week (under the controls card); open state lives in ui state.
import { AnimatePresence, motion } from 'framer-motion';
import {
  FACTOR_KEYS,
  isMarineActivity,
  SWELL_HI_DEFAULT,
  WIND_HI_DEFAULT,
  type FactorKey,
} from '../../core/activities';
import {
  cToF,
  fToC,
  formatTempUnit,
  ftToM,
  kmhToMph,
  mphToKmh,
  mToFt,
} from '../../core/units';
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

// Ideal min–max for wind and swell: outside the band, risk rises on both
// sides — a surfer's flat sea or a kiter's dead calm is a no-go too.
// Shown and typed in the user's unit system; stored metric like everything.
function BandInputs({ k }: { k: 'wind' | 'swell' }) {
  const t = useT();
  const st = useSettings();
  const crit = critFor(st, st.activity);
  const imp = st.units === 'imperial';
  const [lo, hi] =
    k === 'wind'
      ? (crit.windBand ?? [0, WIND_HI_DEFAULT])
      : (crit.swellBand ?? [0, SWELL_HI_DEFAULT]);

  const disp = (metric: number) =>
    k === 'wind' ? Math.round(imp ? kmhToMph(metric) : metric) : +(imp ? mToFt(metric) : metric).toFixed(1);
  const store = (typed: number) =>
    +(k === 'wind' ? (imp ? mphToKmh(typed) : typed) : imp ? ftToM(typed) : typed).toFixed(2);

  const input = (which: 'Lo' | 'Hi', metric: number) => (
    <input
      type="number"
      className={s.tnum}
      min={0}
      step={k === 'wind' ? 1 : 0.1}
      value={disp(metric)}
      aria-label={`${t.tune[k]} ${which === 'Lo' ? t.tune.min : t.tune.max}`}
      onChange={(e) => {
        const v = +e.target.value;
        if (Number.isFinite(v) && v >= 0) st.setCritNum(st.activity, `${k}${which}`, store(v));
      }}
    />
  );

  return (
    <small>
      {t.tune[`${k}S`]} · {t.tune.ideal} {input('Lo', lo)} – {input('Hi', hi)}{' '}
      {k === 'wind' ? (imp ? 'mph' : 'km/h') : imp ? 'ft' : 'm'}
    </small>
  );
}

// Comfort thresholds, shown in the user's temperature unit, stored °C.
function TempInput({
  which,
  label,
  metric,
}: {
  which: 'tMin' | 'tMax';
  label: string;
  metric: number;
}) {
  const st = useSettings();
  const imp = st.units === 'imperial';
  return (
    <small>
      {label}{' '}
      <input
        type="number"
        className={s.tnum}
        value={Math.round(imp ? cToF(metric) : metric)}
        onChange={(e) => {
          const v = +e.target.value;
          if (Number.isFinite(v))
            st.setCritNum(st.activity, which, +(imp ? fToC(v) : v).toFixed(2));
        }}
      />{' '}
      {formatTempUnit(st.units)}
    </small>
  );
}

export function TunePanel() {
  const t = useT();
  const st = useSettings();
  const nameOf = useActivityName();
  const tuneOpen = useUi((u) => u.tuneOpen);
  const marine = useForecast((f) => f.data?.marine ?? null);
  const crit = critFor(st, st.activity);
  const isWinterAct = crit.act.snowBase != null;
  // swell/tide only make sense for marine activities where that ocean data exists
  const showMarine = (k: FactorKey) =>
    isMarineActivity(crit.act) && (k === 'tide' ? !!marine?.tide : !!marine?.swell);
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
                    <TempInput which="tMin" label={t.tune.coldS} metric={crit.tMin} />
                  ) : k === 'heat' ? (
                    <TempInput which="tMax" label={t.tune.heatS} metric={crit.tMax} />
                  ) : k === 'wind' || k === 'swell' ? (
                    <BandInputs k={k} />
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
