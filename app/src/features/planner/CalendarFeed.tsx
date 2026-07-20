// The auto-sync panel: one click mints a private feed token, pushes the
// planner to the worker, and offers subscribe links for the big calendars.
// From then on the App-level effect keeps the feed in sync — the user never
// exports again.

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
import { usePlanner } from '../../state/planner';
import { useSettings } from '../../state/settings';
import { Button } from '../../ui/primitives';
import s from './planner.module.css';

export function CalendarFeed() {
  const t = useT();
  const st = useSettings();
  const sessions = usePlanner((p) => p.sessions);
  const [copied, setCopied] = useState(false);

  if (!feedAvailable()) return null;

  const enable = () => {
    const token = newFeedToken();
    st.setCalFeedToken(token);
    void syncFeed(token, sessions, st.customActivities, st.lang);
  };

  const disable = () => {
    if (st.calFeedToken) void deleteFeed(st.calFeedToken);
    st.setCalFeedToken(null);
  };

  const copy = async () => {
    if (!st.calFeedToken) return;
    await navigator.clipboard.writeText(feedUrl(st.calFeedToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const token = st.calFeedToken;
  return (
    <div className={s.feed}>
      {token == null ? (
        <>
          <Button variant="ghost" onClick={enable}>
            🔄 {t.planner.feedEnable}
          </Button>
          <span className={s.feedHint}>{t.planner.feedHint}</span>
        </>
      ) : (
        <div>
          <div className={s.feedTitle}>🔄 {t.planner.feedOn}</div>
          <div className={s.feedLinks}>
            <a className={s.feedLink} href={webcalUrl(token)}>
               {t.planner.feedApple}
            </a>
            <a className={s.feedLink} href={googleSubscribeUrl(token)} target="_blank" rel="noopener noreferrer">
              {t.planner.calGoogle}
            </a>
            <a className={s.feedLink} href={outlookSubscribeUrl(token, 'live')} target="_blank" rel="noopener noreferrer">
              {t.planner.calOutlook}
            </a>
            <a className={s.feedLink} href={outlookSubscribeUrl(token, 'office')} target="_blank" rel="noopener noreferrer">
              {t.planner.calOffice}
            </a>
            <button className={s.feedLink} onClick={() => void copy()}>
              {copied ? t.planner.feedCopied : t.planner.feedCopy}
            </button>
          </div>
          <div className={s.feedHint}>{t.planner.feedNote}</div>
          <button className={s.feedOff} onClick={disable}>
            {t.planner.feedOff}
          </button>
        </div>
      )}
    </div>
  );
}
