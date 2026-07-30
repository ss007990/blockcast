// The auto-sync panel: one click mints a private feed token, pushes the
// planner to the worker, and offers subscribe links for the big calendars.
// The first sync is awaited before the subscribe links appear, so a calendar
// app can never fetch the feed before it exists. From then on the App-level
// effect keeps the feed in sync — the user never exports again.

import { useState } from 'react';
import { useT } from '../../hooks';
import {
  deleteFeed,
  feedAvailable,
  feedUrl,
  googleSubscribeUrl,
  newFeedToken,
  outlookSubscribeUrl,
  syncFeed,
  webcalUrl,
} from '../../services/calendarFeed';
import { isApplePlatform } from '../../lib/platform';
import { usePlanner } from '../../state/planner';
import { useSettings } from '../../state/settings';
import { Button } from '../../ui/primitives';
import s from './planner.module.css';

export function CalendarFeed() {
  const t = useT();
  const st = useSettings();
  const sessions = usePlanner((p) => p.sessions);
  const [phase, setPhase] = useState<'idle' | 'busy' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);

  const token = st.calFeedToken;
  if (!feedAvailable() || (token == null && sessions.length === 0)) return null;

  const enable = async () => {
    setPhase('busy');
    const fresh = newFeedToken();
    const ok = await syncFeed(fresh, sessions, st.customActivities, st.lang);
    if (ok) {
      st.setCalFeedToken(fresh);
      setPhase('idle');
    } else {
      setPhase('error');
    }
  };

  const disable = () => {
    if (token) void deleteFeed(token);
    st.setCalFeedToken(null);
    setCopyFallback(false);
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(feedUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFallback(true);
    }
  };

  if (token == null) {
    return (
      <div className={s.feed}>
        <Button onClick={() => void enable()} disabled={phase === 'busy'}>
          🔄 {phase === 'busy' ? t.planner.feedBusy : t.planner.feedEnable}
        </Button>
        <span className={s.feedHint}>{phase === 'error' ? t.planner.feedError : t.planner.feedHint}</span>
      </div>
    );
  }

  const apple = isApplePlatform();
  const appleChip = (
    <a key="apple" className={apple ? `${s.feedLink} ${s.feedLead}` : s.feedLink} href={webcalUrl(token)}>
      {t.planner.feedApple}
    </a>
  );
  const otherChips = [
    <a
      key="google"
      className={s.feedLink}
      href={googleSubscribeUrl(token)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t.planner.calGoogle}
    </a>,
    <a
      key="live"
      className={s.feedLink}
      href={outlookSubscribeUrl(token, 'live')}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t.planner.calOutlook}
    </a>,
    <a
      key="office"
      className={s.feedLink}
      href={outlookSubscribeUrl(token, 'office')}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t.planner.calOffice}
    </a>,
  ];

  return (
    <div className={s.feed}>
      <div>
        <div className={s.feedTitle}>🔄 {t.planner.feedOn}</div>
        {apple && <div className={s.feedSteps}>{t.planner.feedAppleSteps}</div>}
        <div className={s.feedLinks}>
          {apple ? [appleChip, ...otherChips] : [...otherChips, appleChip]}
          <button className={s.feedLink} onClick={() => void copy()}>
            {copied ? t.planner.feedCopied : t.planner.feedCopy}
          </button>
        </div>
        {copyFallback && (
          <div className={s.feedManual}>
            <span>{t.planner.feedCopyManual}</span>
            <input
              className={s.feedUrl}
              readOnly
              value={feedUrl(token)}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}
        <div className={s.feedHint}>{t.planner.feedNote}</div>
        <button className={s.feedOff} onClick={disable}>
          {t.planner.feedOff}
        </button>
      </div>
    </div>
  );
}
