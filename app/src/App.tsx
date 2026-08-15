import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TOL_MULT } from './core/activities';
import { detectChanges, type PlannedSession } from './core/alerts';
import { isoDate, locNow } from './core/forecast';
import { useLocale, useT, useThemeEffect } from './hooks';
import { AlertsSheet } from './features/alerts/AlertsSheet';
import { DetailSheet } from './features/detail/DetailSheet';
import { AddActivitySheet } from './ui/AddActivitySheet';
import { TodayView } from './features/home/TodayView';
import { LocationSheet } from './features/location/LocationSheet';
import { CamsSheet } from './features/cams/CamsSheet';
import { RadarSheet } from './features/radar/RadarSheet';
import { PlannerView } from './features/planner/PlannerView';
import { SettingsView } from './features/settings/SettingsView';
import { WeekView } from './features/week/WeekView';
import { Masthead, TabBar } from './shell/Header';
import s from './shell/shell.module.css';
import { syncFeed } from './services/calendarFeed';
import { useAlerts } from './state/alerts';
import { useExtras } from './state/extras';
import { useForecast } from './state/forecast';
import { useGeo } from './state/geo';
import { checkSession, usePlanner } from './state/planner';
import { critFor, useSettings } from './state/settings';
import { useUi } from './state/ui';

export function App() {
  useThemeEffect();
  const tab = useUi((u) => u.tab);
  const { loc, locChosen, lang, calFeedToken, customActivities } = useSettings();
  const { data, dataFor, load } = useForecast();
  const sessions = usePlanner((p) => p.sessions);

  // fetch a fresh forecast (+ AQHI and ECCC alerts) whenever the location
  // changes. Keyed on the coordinates, not the object: a followed place gets
  // renamed the moment the reverse geocoder answers, and that must not refetch.
  const { lat, lon } = loc;
  useEffect(() => {
    const place = useSettings.getState().loc;
    void load(place);
    void useExtras.getState().load(place);
  }, [load, lat, lon]);

  // first run without a saved location: ask the device where we are
  useEffect(() => {
    if (locChosen) return;
    void useGeo.getState().follow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a followed location tracks the user: re-check coordinates on launch and
  // every time the app comes back to the foreground. `focus` and `pageshow`
  // ride along with `visibilitychange` because a WKWebView restored from the
  // background doesn't reliably fire all three. The pin only moves past 2 km
  // so GPS jitter never triggers a refetch; pinning a spot stops the tracking.
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === 'visible') useGeo.getState().refresh();
    };
    wake();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('pageshow', wake);
    };
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

  // calendar feed on: mirror every planner change to the worker (debounced;
  // flushed immediately if the app is backgrounded before the debounce fires,
  // so a delete followed by an app switch still reaches the feed)
  useEffect(() => {
    if (!calFeedToken) return;
    let synced = false;
    const flush = () => {
      if (synced) return;
      synced = true;
      void syncFeed(calFeedToken, sessions, customActivities, lang);
    };
    const timer = setTimeout(flush, 1200);
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [calFeedToken, sessions, customActivities, lang]);

  return (
    <>
      <Masthead />
      <main className={s.main}>
        <IntroBanner />
        <StaleBanner />
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
      <RadarSheet />
      <CamsSheet />
      <AlertsSheet />
      <AddActivitySheet />
    </>
  );
}

function StaleBanner() {
  const t = useT();
  const locale = useLocale();
  const { status, updatedAt } = useForecast();
  if (status !== 'stale' || updatedAt == null) return null;
  const when = new Date(updatedAt).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className={s.stale} role="status">
      <span>
        ⚠️ {t.common.staleBanner} {when}. {t.common.staleBanner2}
      </span>
    </div>
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
