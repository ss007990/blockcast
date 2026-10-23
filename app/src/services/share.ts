// Sending and receiving shareable forecast links (see core/shareLink.ts).
// Sending uses the iOS share sheet in the native app, the Web Share API where
// the browser has one, and the clipboard everywhere else.

import { Capacitor } from '@capacitor/core';
import { parseShareParams, SHARE_KEYS, type ShareTarget } from '../core/shareLink';
import { useForecast } from '../state/forecast';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

export async function shareLink(title: string, text: string, url: string): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return 'shared';
    } catch {
      // the plugin rejects on dismiss too, and there is nothing to retry
      return 'dismissed';
    }
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'dismissed';
      // anything else (no user gesture, blocked by policy): fall through
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** A block named by an opened link, selected once its forecast has loaded. */
let pendingBlock: { day: string; h: number } | null = null;

/** Switch to what a link names. A block opens as soon as its forecast is
 * in: right away when it already is, otherwise from App.tsx after the load. */
function applyShareTarget(t: ShareTarget): void {
  const st = useSettings.getState();
  if (t.activity) st.setActivity(t.activity);
  if (t.place) st.setLoc(t.place, true);
  if (t.day && t.h != null) {
    pendingBlock = { day: t.day, h: t.h };
    useUi.getState().setTab('week');
    const { data, dataFor } = useForecast.getState();
    const { lat, lon } = useSettings.getState().loc;
    if (data && dataFor?.lat === lat && dataFor.lon === lon) {
      const b = takePendingBlock((day) => data.days[day] != null);
      if (b) useUi.getState().select(b);
    }
  }
}

/** Apply a share link from the address bar before the first render, so the
 * first-run location prompt never fires over a place someone sent you.
 * The link's own keys are then removed (a reload must not undo a change the
 * recipient made since); ref/utm keys stay for analytics. */
export function applyShareLink(loc: Location = window.location): ShareTarget | null {
  const t = parseShareParams(loc.search);
  if (!t) return null;
  applyShareTarget(t);
  // GoatCounter may count after the cleanup below; index.html reads this.
  // A place means a person shared it; a sport alone came from a post or page.
  (window as { __bcShared?: string }).__bcShared =
    `${t.place ? 'shared' : 'sport'}/${t.activity ?? 'any'}`;
  const u = new URL(loc.href);
  for (const k of SHARE_KEYS) u.searchParams.delete(k);
  history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  return t;
}

/** The iOS app opens blockcast://open?a=golf links (App Store In-App
 * Events, and anything else that wants to land in the app) with the same
 * keys as a web share link, whether it was running or not. */
export async function listenForAppLinks(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import('@capacitor/app');
  const open = (url: string) => {
    try {
      const t = parseShareParams(new URL(url).search);
      if (t) applyShareTarget(t);
    } catch {
      // not a URL we understand; the app simply opens
    }
  };
  const launch = await App.getLaunchUrl();
  if (launch?.url) open(launch.url);
  await App.addListener('appUrlOpen', ({ url }) => open(url));
}

/** Hand over the linked block once the forecast covers its day. */
export function takePendingBlock(
  hasDay: (day: string) => boolean,
): { day: string; h: number } | null {
  if (!pendingBlock || !hasDay(pendingBlock.day)) return null;
  const b = pendingBlock;
  pendingBlock = null;
  return b;
}
