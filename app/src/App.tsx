import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TOL_MULT } from './core/activities';
import { detectChanges, type PlannedSession } from './core/alerts';
import { isoDate, locNow } from './core/forecast';
import { useT, useThemeEffect } from './hooks';
import { AlertsSheet } from './features/alerts/AlertsSheet';
import { DetailSheet } from './features/detail/DetailSheet';
import { AddActivitySheet } from './ui/AddActivitySheet';
import { TodayView } from './features/home/TodayView';
import { LocationSheet } from './features/location/LocationSheet';
import { PlannerView } from './features/planner/PlannerView';
import { SettingsView } from './features/settings/SettingsView';
import { WeekView } from './features/week/WeekView';
import { Masthead, TabBar } from './shell/Header';
import s from './shell/shell.module.css';
import { syncFeed } from './services/calendarFeed';
import { useAlerts } from './state/alerts';
import { useForecast } from './state/forecast';
import { checkSession, usePlanner } from './state/planner';
import { critFor, useSettings } from './state/settings';
import { useUi } from './state/ui';

export function App() {
  useThemeEffect();
  const t = useT();
  const tab = useUi((u) => u.tab);
  const { loc, locChosen, setLoc, lang, calFeedToken, customActivities } = useSettings();
  const { data, dataFor, load } = useForecast();
  const sessions = usePlanner((p) => p.sessions);

  // fetch a fresh forecast whenever the location changes
  useEffect(() => {
    void load(loc);
  }, [load, loc]);

  // first run without a saved location: try browser geolocation once
  useEffect(() => {
    if (locChosen || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLoc({
          name: t.location.myLoc,
          lat: +pos.coords.latitude.toFixed(3),
          lon: +pos.coords.longitude.toFixed(3),
        }),
      () => {},
      { timeout: 4000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // every fresh forecast: prune past sessions, baseline new ones, detect changes
  useEffect(() => {
    if (!data || !dataFor) return;
    const nowLoc = locNow(data, Date.now());
    const cut = new Date(nowLoc.getTime() - 864e5);
    usePlanner
      .getState()
      .prune(isoDate(cut) + 'T' + String(cut.getHours()).padStart(2, '0'));

    const st = useSettings.getState();
    const checkOf = (p: PlannedSession) => {
      const r = checkSession(p, data, dataFor, critFor(st, p.activityId), TOL_MULT[st.tolerance]);
      return r ? { score: r.score, band: r.band } : null;
    };
    const sessions = usePlanner.getState().sessions;

    const baselines: { id: number; score: number; band: PlannedSession['baseBand'] }[] = [];
    for (const p of sessions) {
      if (p.baseBand != null) continue;
      const c = checkOf(p);
      if (c) baselines.push({ id: p.id, score: c.score, band: c.band });
    }

    const alerts = detectChanges(sessions, checkOf, Date.now());
    if (alerts.length) {
      useAlerts.getState().push(alerts);
      baselines.push(
        ...alerts.map((a) => ({ id: a.sessionId, score: a.score, band: a.toBand })),
      );
    }
    if (baselines.length) usePlanner.getState().baseline(baselines);
    useAlerts.getState().clearExpired(isoDate(nowLoc));
  }, [data, dataFor]);

  // document language follows the setting
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // calendar feed on: mirror every planner change to the worker (debounced)
  useEffect(() => {
    if (!calFeedToken) return;
    const timer = setTimeout(
      () => void syncFeed(calFeedToken, sessions, customActivities, lang),
      1200,
    );
    return () => clearTimeout(timer);
  }, [calFeedToken, sessions, customActivities, lang]);

  return (
    <>
      <Masthead />
      <main className={s.main}>
        <IntroBanner />
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {tab === 'today' && <TodayView />}
          {tab === 'week' && <WeekView />}
          {tab === 'planner' && <PlannerView />}
          {tab === 'settings' && <SettingsView />}
        </motion.div>
      </main>
      <footer className={s.footer}>
        BlockCast · <a href="https://open-meteo.com">Open-Meteo</a> ·{' '}
        <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
      </footer>
      <TabBar />
      <DetailSheet />
      <LocationSheet />
      <AlertsSheet />
      <AddActivitySheet />
    </>
  );
}

function IntroBanner() {
  const t = useT();
  const [seen, setSeen] = useState(() => localStorage.getItem('blockcast.introSeen') === '1');
  if (seen) return null;
  return (
    <div className={s.intro}>
      <span>{t.intro}</span>
      <button
        className={s.introClose}
        aria-label={t.common.close}
        onClick={() => {
          localStorage.setItem('blockcast.introSeen', '1');
          setSeen(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}
